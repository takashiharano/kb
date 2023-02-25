/*!
 * Knowledge Base System
 * Copyright (c) 2021 Takashi Harano
 */
var kb = kb || {};
kb.ST_APP_READY = 1;
kb.ST_LIST_LOADING = 1 << 1;
kb.ST_DATA_LOADING = 1 << 2;
kb.ST_NEW = 1 << 3;
kb.ST_EDITING = 1 << 4;
kb.ST_EDIT_ONLY_LABELS = 1 << 5;
kb.ST_EXIT = 1 << 6;
kb.ST_CONFLICTING = 1 << 7;
kb.ST_SAVE_CONFIRMING = 1 << 8;
kb.ST_CANCEL_CONFIRMING = 1 << 9;
kb.ST_TOUCH_CONFIRMING = 1 << 10;

kb.UI_ST_NONE = 0;
kb.UI_ST_AREA_RESIZING = 1;

kb.LIST_COLUMNS = [
  {key: 'id', label: 'ID'},
  {key: 'TITLE', label: 'TITLE'},
  {key: 'DATA_TYPE', label: 'DL'},
  {key: 'C_DATE', label: 'CREATED'},
  {key: 'C_USER', label: 'BY'},
  {key: 'U_DATE', label: 'UPDATED'},
  {key: 'U_USER', label: 'BY'},
  {key: 'STATUS', label: 'STATUS'},
  {key: 'LABELS', label: 'LABELS'},
  {key: 'score', label: 'SCORE'},
  {key: 'size', label: 'SIZE'},
  {key: 'encrypted', label: ''}
];
kb.onselectstart = document.onselectstart;

kb.status = 0;
kb.uiStatus = kb.UI_ST_NONE;
kb.listStatus = {
  sortIdx: 5,
  sortType: 2
};
kb.configInfo = null;
kb.itemList = [];
kb.totalCount = 0;
kb.pendingId = null;
kb.content;
kb.contentUrl = '';
kb.dndHandler = null;
kb.areaSize = {
  orgY: 0,
  orgSP1: 0,
  orgSP2: 0
};
kb.requestedId = null;
kb.loadPendingTmrId = 0;
kb.dataLoadingTmrId = 0;
kb.clipboardEnabled = false;

kb.bsb64 = {n: 1};

$onReady = function(e) {
  $el('#enrich').addEventListener('change', kb.onEnrichChange);
  var fontSize = util.getQuery('fontsize') | 0;
  if (!fontSize) fontSize = 12;
  kb.setFontSize(fontSize);
  util.clock('#clock');
  if (kb.mode == 'view') {
    kb.view.init();
    kb.onAppReady();
  } else {
    kb.init();
  }
  util.addKeyHandler('D', 'down', kb.keyHandlerD, {ctrl: true, alt: true});
  util.addKeyHandler('E', 'down', kb.keyHandlerE, {ctrl: true, alt: true});
  kb.status |= kb.ST_APP_READY;
};

kb.onAppReady = function() {
  $el('#body1').style.display = 'block';
  if (kb.mode != 'view') {
    kb.onAppReady1();
  }
};

kb.onAppReady1 = function() {
  var q = util.getQuery('q');
  var id = util.getQuery('id');
  if (id) {
    kb.showDataById(id);
  } else if (q) {
    q = decodeURIComponent(q);
    $el('#q').value = q;
    kb.search();
  } else {
    kb.getList();
  }
  kb.storeAreaSize();
  if (!id) $el('#q').focus();
};

kb.init = function() {
  kb.clearContent();
  $el('#id-txt').addEventListener('input', kb.onInputId);
  $el('#q').addEventListener('input', kb.onInputQ);
  util.textarea.addStatusInfo('#content-body-edt', '#content-body-st');
  $el('#adjuster').addEventListener('mousedown', kb.onAreaResizeStart);
  $el('#adjuster').addEventListener('dblclick', kb.resetAreaSize);

  kb.onEditEnd();

  window.addEventListener('mousemove', kb.onMouseMove, true);
  window.addEventListener('mouseup', kb.onMouseUp, true);
  kb.initDnD();

  kb.onAppReady();

  var stateList = kb.configInfo.state_list;
  util.addSelectOption('#select-status', '');
  for (var i = 0; i < stateList.length; i++) {
    var state = stateList[i];
    util.addSelectOption('#select-status', state.name);
  }
};

kb.initDnD = function() {
  var opt = {
    mode: 'data',
    onabort: kb.onAbortLoadFile,
    onerror: kb.onFileLoadError
  };
  kb.dndHandler = util.addDndHandler('#content-body-edt', kb.onDnd, opt);
};
kb.onDnd = function(data) {
  kb.insertBinData(data);
};
kb.insertBinData = function(data) {
  var el = $el('#content-body-edt');
  var cp = el.selectionStart;
  var v = el.value;
  var v1 = v.substr(0, cp);
  var v2 = v.substr(cp);

  var p = data.indexOf(',');
  if (p == -1) {
    el.value = v1 + data + v2;
    return;
  }

  p++;
  var h = data.substr(0, p);
  var d = data.substr(p);
  d = util.insertCh(d, '\n', 76);
  var s = h + '\n' + d + '\n';
  el.value = v1 + s + v2;
  cp += s.length;
  el.selectionStart = cp;
  el.selectionEnd = cp;
};
kb.onAbortLoadFile = function() {
  kb.showInfotip('File loading aborted');
};
kb.onFileLoadError = function() {
  kb.showInfotip('File loading error');
};

kb.callApi = function(act, params, cb) {
  var data = {act: act};
  if (params) {
    for (var k in params) {
      data[k] = params[k];
    }
  }
  var req = {
    url: 'api.cgi',
    method: 'POST',
    data: data,
    responseType: 'json'
  };
  kb.http(req, cb);
};

kb.getList = function(id) {
  var param = null;
  if (id != undefined) {
    param = {id: id};
  }
  kb.onStartListLoading('Loading');
  kb.callApi('list', param, kb.onGetList);
};
kb.onGetList = function(xhr, res, req) {
  kb.onEndListLoading();
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'FORBIDDEN') {
    kb.onForbidden();
    return;
  } else if (res.status != 'OK') {
    kb.onApiError(res);
    return;
  }
  var data = res.body;
  kb.itemList = data.data_list;
  kb.totalCount = data.total_count;
  kb.drawList(kb.itemList, kb.listStatus.sortIdx, kb.listStatus.sortType, kb.totalCount);
};

kb.drawInfo = function(html) {
  $el('#info').innerHTML = html;
};

kb.drawListContent = function(html) {
  $el('#list').innerHTML = html;
  $el('#list-wrp').scrollTop = 0;
};

kb.sortList = function(items, sortKey, desc) {
  items = util.copyObject(items);
  var asNum = true;
  items = util.sortObject(items, sortKey, desc, asNum);
  return items;
};

kb.drawList = function(items, sortIdx, sortType, totalCount) {
  if (sortIdx >= 0) {
    if (sortType > 0) {
      var sortKey = kb.LIST_COLUMNS[sortIdx].key;
      var desc = (sortType == 2);
      items = kb.sortList(items, sortKey, desc);
    }
  }

  var htmlList = '';
  for (var i = 0; i < items.length; i++) {
    var data = items[i];
    var id = data.id;
    var data_status = data.data_status;
    var status = data.STATUS;
    var b64Title = ((data.TITLE == undefined) ? '' : data.TITLE);
    var b64Labels = data.LABELS;
    var cDate = data.C_DATE;
    var uDate = data.U_DATE;
    var score = (data.score == undefined ? '' : data.score);
    var cDateStr = '';
    var cUser = (data.C_USER ? data.C_USER : '');
    var uDateStr = '';
    var uUser = (data.C_USER ? data.U_USER : '');
    if ((cDate == undefined) || (cDate == '')) {
      cDateStr = '---------- --:--:--';
    } else {
      cDateStr = kb.getDateTimeString(+cDate);
    }
    if ((uDate == undefined) || (uDate == '')) {
      uDateStr = '---------- --:--:--';
    } else {
      uDateStr = kb.getDateTimeString(+uDate);
    }
    var title = util.decodeBase64(b64Title);
    if (!title) {
      title = '&lt;NO TITLE&gt;';
    }
    var labels = util.decodeBase64(b64Labels);
    var statusLabel = '';
    if (data_status == 'OK') {
      statusLabel = kb.buildStatusHTML(status);
    } else {
      statusLabel = '<span class="status-label-err">' + data_status + '</span>';
    }
    var size = util.formatNumber(data.size);
    var encrypted = '';
    if (data.encrypted) {
      encrypted = '<span data-tooltip="Encrypted">&#x1F512;</span>';
    }
    var dlLink = '';
    if (data.DATA_TYPE == 'dataurl') {
      dlLink = '<span class="dl-link" onclick="kb.dlContent(\'' + id + '\');" data-tooltip="Download">&#x1F517;</span>';
    }
    var labelsHTML = kb.buildLabelsHTML(labels);
    htmlList += '<tr id="row-' + id + '" class="data-list-row">';
    htmlList += '<td style="padding-right:16px;">' + id + '</td>'
    htmlList += '<td style="min-width:300px;max-width:600px;">';
    if (data_status == 'OK') {
      htmlList += '<span style="display:inline-block;width:100%;overflow:hidden;text-overflow:ellipsis;" class="title pseudo-link" onclick="kb.onClickTitle(\'' + id + '\');">';
    } else {
      htmlList += '<span class="title-disabled">';
    }
    htmlList += '<span';
    if (util.lenW(title) > 76) {
      var escTitle = util.escHtml(title);
      htmlList += ' data-tooltip="' + escTitle + '"';
    }
    htmlList += '>' + title + '</span>';
    htmlList += '</span></td>';
    htmlList += '<td style="padding-right:16px;text-align:center;">' + dlLink + '</td>';
    htmlList += '<td style="padding-right:8px;">' + cDateStr + '</td>';
    htmlList += '<td style="padding-right:16px;">' + cUser + '</td>';
    htmlList += '<td style="padding-right:8px;">' + uDateStr + '</td>';
    htmlList += '<td style="padding-right:16px;">' + uUser + '</td>';
    htmlList += '<td>' + statusLabel + '</td>';
    htmlList += '<td style="padding-left:20px;">' + labelsHTML + '</td>';
    htmlList += '<td>' + score + '</td>';
    htmlList += '<td style="text-align:right;padding-left:0.5em;">' + size + '</td>';
    htmlList += '<td style="text-align:center;cursor:default;">' + encrypted + '</td>';

    if (data_status != 'OK') {
      htmlList += '<td class="center"><span class="pseudo-link text-red" data-tooltip="Delete" onclick="kb.delete(\'' + id + '\');">X</span></td>';
    }
    htmlList += '</tr>';
  }
  htmlList += '</table>';

  var htmlHead = kb.buildListHeader(kb.LIST_COLUMNS, sortIdx, sortType);
  var html = htmlHead + htmlList; 
  kb.drawListContent(html);

  var infoHtml = items.length + ' ' + util.plural('item', items.length);
  if ((kb.config.list_max > 0) && (totalCount > kb.config.list_max)) {
    infoHtml += ' (' + totalCount + ' in total)';
  }

  kb.drawInfo(infoHtml);

  if (kb.content && kb.content.id != '') {
    kb.highlightSelectedRow(kb.content.id);
  }
};

kb.sortItemList = function(sortIdx, sortType) {
  if (sortType > 2) {
    sortType = 0;
  }
  kb.listStatus.sortIdx = sortIdx;
  kb.listStatus.sortType = sortType;
  kb.drawList(kb.itemList, sortIdx, sortType, kb.totalCount);
};

//---------------------------------------------------------
kb.buildListHeader = function(columns, sortIdx, sortType) {
  var html = '<table id="list-table" class="item list-table item-list">';
  html += '<tr class="item-list">';

  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    var label = column['label'];

    var sortAscClz = '';
    var sortDescClz = '';
    var nextSortType = 1;
    if (i == sortIdx) {
      if (sortType == 1) {
        sortAscClz = 'sort-active';
      } else if (sortType == 2) {
        sortDescClz = 'sort-active';
      }
      nextSortType = sortType + 1;
    }

    var sortButton = '<span class="sort-button" ';
    sortButton += ' onclick="kb.sortItemList(' + i + ', ' + nextSortType + ');"';
    sortButton += '>';
    sortButton += '<span';
    if (sortAscClz) {
       sortButton += ' class="' + sortAscClz + '"';
    }
    sortButton += '>▲</span>';
    sortButton += '<br>';
    sortButton += '<span';
    if (sortDescClz) {
       sortButton += ' class="' + sortDescClz + '"';
    }
    sortButton += '>▼</span>';
    sortButton += '</span>';

    html += '<th class="item-list"><span>' + label + '</span> ' + sortButton + '</th>';
  }
  html += '<th class="item-list" style="width:3em;"><span>&nbsp;</span></th>';

  html += '</tr>';
  return html;
};

kb.getListAll = function() {
  location.href = './';
};
kb.listAll = function() {
  if (!kb.isListLoading()) {
    kb.listStatus.sortIdx = 5;
    kb.listStatus.sortType = 2;
    kb.getList();
  }
};

kb.search = function() {
  if (kb.isListLoading()) {
    return;
  }
  kb._clear();
  var q = $el('#q').value.trim();
  var id = $el('#id-txt').value.trim();
  if (id != '') {
    id = util.toHalfWidth(id);
    if (id.match(/[ ,-]/)) {
      kb.searchByIds(id);
    } else {
      kb.showDataById(id);
    }
  } else if (q) {
    kb.searchByKeyword(q);
  } else {
    kb.listAll();
  }
};
kb.searchByIds = function(ids) {
  var q = 'id:';
  ids = util.toSingleSP(ids);
  ids = ids.replace(/\s/g, ',');
  ids = ids.split(',');
  for (var i = 0; i < ids.length; i++) {
    if (i > 0) q += ',';
    q += ids[i];
  }
  kb.searchByKeyword(q);
};
kb.searchByKeyword = function(q) {
  if (q.match(/^label:[^\s]+?$/) || q.match(/^status:[^\s]+?$/) || q.match(/^updated..:[^\s]+?$/)) {
    kb.listStatus.sortIdx = 5;
  } else if (q.match(/^created..:[^\s]+?$/)) {
    kb.listStatus.sortIdx = 3;
  } else {
    kb.listStatus.sortIdx = 9;
  }
  kb.listStatus.sortType = 2;
  var param = {q: util.encodeBase64(q)};
  kb.onStartListLoading('Searching');
  kb.callApi('search', param, kb.onSearchCb);
};
kb.onSearchCb = function(xhr, res, req) {
  kb.onGetList(xhr, res, req);
  var index = parseInt(util.getQuery('index'));
  if (!isNaN(index)) {
    var items = kb.sortList(kb.itemList, 'score', true);
    var item = items[index];
    if (item) {
      var id = item.id;
      kb.openData(id);
    }
  }
};

kb.showDataById = function(id) {
  kb.getList(id);
  kb.getData(id);
};

kb.categorySearch = function(category, label) {
  $el('#id-txt').value = '';
  kb.onInputId();
  $el('#q').value = category + ':' + label;
  kb.onInputQ();
  kb.search();
};

kb.onClickTitle = function(id) {
  if (kb.loadPendingTmrId) {
    clearTimeout(kb.loadPendingTmrId);
    kb.loadPendingTmrId = 0;
  }
  var item = kb.getMetaData(id);
  if (item.size < 1048576) {
    kb.openData(id);
  } else {
    kb.loadPendingTmrId = setTimeout(kb.onLoadPendingExpr, 500, id);
  }
  kb.highlightSelectedRow(id);
};

kb.onLoadPendingExpr = function(id) {
  kb.loadPendingTmrId = 0;
  kb.openData(id);
};

kb.getMetaData = function(id) {
  for (var i = 0; i < kb.itemList.length; i++) {
    var item = kb.itemList[i];
    if (item.id == id) return item;
  }
  return null;
};

kb.openData = function(id) {
  kb.highlightSelectedRow(id);
  kb.getData(id);
};

kb.highlightSelectedRow = function(id) {
  $el('.data-list-row').removeClass('row-selected');
  $el('#row-' + id).addClass('row-selected');
};

kb.getData = function(id) {
  kb.pendingId = id;
  if (kb.status & kb.ST_EDITING) {
    util.confirm('Cancel?', kb.cancelAndGetData, kb.cancelAndGetDataN, {focus: 'no'});
    return;
  }
  kb.status &= ~kb.ST_CONFLICTING;
  kb._getData();
};
kb.cancelAndGetData = function() {
  kb._cancel();
  kb._getData();
};
kb.cancelAndGetDataN = function() {
  kb.pendingKey = null;
};
kb._getData = function() {
  var id = kb.pendingId;
  if (id == null) return;
  kb.pendingId = null;
  kb.requestedId = id;
  var param = {id: id};
  if (kb.token) {
    param.token = kb.token;
  }
  kb.onStartDataLoading();
  kb.callApi('get', param, kb.onGetData);
};
kb.onGetData = function(xhr, res, req) {
  kb.onEndDataLoading();
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'FORBIDDEN') {
    kb.onForbidden();
    return;
  } else if (res.status != 'OK') {
    if (res.status == 'NO_ACCESS_RIGHTS') {
      kb.view.onNoRights();
    } else {
      kb.showInfotip(res.status, 3000);
    }
    return;
  }

  var data = res.body;
  if (data.id != kb.requestedId) {
    return;
  }

  var data_status = data.data_status;
  var b64Title = ((data.TITLE == undefined) ? '' : data.TITLE);
  var b64Labels = data.LABELS;
  var b64Body = data.BODY;

  var title = util.decodeBase64(b64Title);
  var labels = util.decodeBase64(b64Labels);
  var body = util.decodeBase64(b64Body);

  kb.content = {};
  kb.content = util.copyObject(data, kb.content);
  kb.content.TITLE = title;
  kb.content.LABELS = labels;
  kb.content.BODY = body;

  if (data_status == 'OK') {
    kb.showData(kb.content);
    $el('.for-view').show();
  } else {
    kb._clear();
    kb.showInfotip(data_status);
  }
};

kb.buildStatusHTML = function(status) {
  if (!status) return '';
  var html = '';
  var st = {};
  var stateList = [];
  if (kb.configInfo && kb.configInfo.state_list) {
    stateList = kb.configInfo.state_list;
  }
  for (var i = 0; i < stateList.length; i++) {
    var state = stateList[i];
    if (state.name == status) {
      st = state;
      break;
    }
  }
  html = '<span class="status"';
  if (st.fgcolor || st.bgcolor) {
    html += ' style="';
    if (st.fgcolor) {
      html += 'color:' + st.fgcolor + ';';
    }
    if (st.bgcolor) {
      html += 'background:' + st.bgcolor + ';';
    }
   html += '"';
  }
  if (kb.mode != 'view') {
    html += ' onclick="kb.categorySearch(\'status\', \'' + status + '\');"';
  }
   html += '>';
  html += status;
  html += '</span>';
  return html;
};

kb.buildLabelsHTML = function(labels) {
  var labelList = [];
  if (labels) {
    labelList = labels.replace(/\s{2,}/g, ' ').split(' ');
  }
  var html = '';
  for (var i = 0; i < labelList.length; i++) {
    var label = util.escHtml(labelList[i]);
    html += '<span class="label"';
    if (kb.mode != 'view') {
      html += ' onclick="kb.categorySearch(\'label\', \'' + label + '\');"';
    }
    html += '>' + label + '</span>';
  }
  return html;
};

kb.createNew = function() {
  kb.status |= kb.ST_NEW;
  kb._clear();
  kb.edit();
  $el('#chk-encryption').checked = kb.config.default_data_encryption;
  $el('#content-title-edt').focus();
};

kb.editLabels = function() {
  kb.status |= kb.ST_EDIT_ONLY_LABELS;
  kb.edit();
  $el('#content-title-edt').disabled = true;
  $el('#content-body-edt').disabled = true;
  $el('#select-status').disabled = true;
  $el('#chk-encryption').disabled = true;
  $el('#content-labels-edt').focus();
};

kb.edit = function() {
  kb.status |= kb.ST_EDITING;

  $el('#new-button').disabled = true;
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  $el('#clear-button').disabled = true;
  $el('.for-view').hide();
  $el('.for-edit').show();

  $el('#content-body').hide();
  $el('#content-body-edt-wrp').show();

  $el('#info-label').hide();
  $el('#info-edit').show();

  $el('#content-title-edt').disabled = false;
  $el('#content-body-edt').disabled = false;
  $el('#select-status').disabled = false;
  $el('#chk-encryption').disabled = false;

  $el('#content-id-edt').value = kb.content.id;
  $el('#content-title-edt').value = kb.content.TITLE;
  $el('#content-body-edt').value = kb.content.BODY;
  $el('#content-labels-edt').value = kb.content.LABELS;
  $el('#chk-encryption').checked = kb.content.encrypted;
};

kb.onEditEnd = function() {
  kb.status &= ~kb.ST_EDITING;
  kb.status &= ~kb.ST_EDIT_ONLY_LABELS;
  kb.status &= ~kb.ST_NEW;

  $el('#content-body').show();

  $el('#content-id-edt').value = '';

  $el('#info-label').show();
  $el('#info-edit').hide();
  $el('#content-title-edt').value = '';

  $el('#content-body-edt-wrp').hide();
  $el('#content-body-edt').value = '';

  $el('#content-labels-edt').value = '';

  $el('#new-button').disabled = false;
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
  $el('#clear-button').disabled = false;

  if (kb.content) kb.showData(kb.content);

  if (kb.content.id) {
    $el('.for-view').show();
  } else {
    $el('.for-view').hide();
  }

  $el('.for-edit').hide();
};

kb.confirmSaveAndExit = function() {
  kb.status |= kb.ST_SAVE_CONFIRMING;
  util.confirm('Save and Exit?', kb.saveAndExit);
};
kb.saveAndExit = function() {
  kb.status |= kb.ST_EXIT;
  kb.save();
};

kb.save = function() {
  kb.status &= ~kb.ST_SAVE_CONFIRMING;
  var id = $el('#content-id-edt').value.trim();
  if (kb.status & kb.ST_NEW) {
    if (id == '') {
      kb.status &= ~kb.ST_NEW;
    } else {
      kb.checkExists(id);
      return;
    }
  }

  var encryption = ($el('#chk-encryption').checked ? '1' : '0');
  var title = $el('#content-title-edt').value;
  var body = $el('#content-body-edt').value;
  var labels = $el('#content-labels-edt').value;
  labels = labels.replace(/\s{2,}/g, ' ');
  var status = $el('#select-status').value;
  var orgUdate = kb.content.U_DATE;

  if (!title) {
    kb.showInfotip('Title is required', 3000);
    $el('#content-title-edt').focus();
    return;
  }

  kb.content.id = id;
  kb.content.TITLE = title;
  kb.content.BODY = body;
  kb.content.LABELS = labels;
  kb.content.STATUS = status;

  var b64Title = util.encodeBase64(title);
  var b64Labels = util.encodeBase64(labels);
  var b64Body = util.encodeBase64(body);

  var data = {
    encryption: encryption,
    org_u_date: orgUdate
  };

  if (kb.status & kb.ST_EDIT_ONLY_LABELS) {
    data.only_labels = true;
    data.LABELS = b64Labels;
  } else {
    data.only_labels = false;
    data.TITLE = b64Title;
    data.LABELS = b64Labels;
    data.STATUS = status;
    data.BODY = b64Body;
  }

  kb.drawContentBodyArea4Progress('Saving');

  var j = util.toJSON(data);
  var param = {
    id: id,
    data: j
  };
  kb.callApi('save', param, kb.onSaveData);

  if (kb.status & kb.ST_EXIT) {
    kb.onEditEnd();
  }
};
kb.onSaveData = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    var savedData = res.body;
    if (kb.status & kb.ST_EXIT) {
      var id = savedData.saved_id;
      kb.reloadListAndData(id);
      kb.status &= ~kb.ST_EXIT;
    }
    kb.content.U_DATE = savedData.U_DATE;
    kb.showInfotip('OK');
  } else if (res.status == 'CONFLICT') {
    kb.status |= kb.ST_CONFLICTING;
    $el('#content-body').innerHTML = 'ERROR!';
    var data = res.body;
    var dt = util.getDateTimeString(+data.U_DATE);
    var msg = 'The data is already updated.\n\n'
    msg += '<div style="text-align:left;">';
    msg += 'DATE: ' + dt + '\n';
    msg += 'BY  : ' + data.U_USER;
    msg += '</div>';
    util.alert('Conflict!', msg, kb.onConflictOK);
  } else {
    log.e(res.status + ':' + res.body);
  }
};

kb.touch = function() {
  kb.status |= kb.ST_TOUCH_CONFIRMING;
  util.confirm('Update the last update date to now?', kb._touch);
};
kb._touch = function() {
  kb.edit();
  kb.saveAndExit();
};

kb.reloadListAndData = function(id) {
  kb.listStatus.sortIdx = 5;
  kb.listStatus.sortType = 2;
  kb.search();
  kb.getData(id);
};

kb.onConflictOK = function() {
  kb.edit();
};

kb.checkExists = function(id) {
  var param = {id: id};
  kb.callApi('check_exists', param, kb.onCheckExists);
};
kb.onCheckExists = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    var exists = res.body;
    if (exists) {
      kb.showInfotip('ALREADY_EXISTS');
    } else {
      kb.status &= ~kb.ST_NEW
      kb.save();
    }
  } else {
    log.e(res.status + ':' + res.body);
  }
};

kb.cancel = function() {
  kb.status |= kb.ST_CANCEL_CONFIRMING;
  util.confirm('Cancel?', kb._cancel, {focus: 'no'});
};
kb._cancel = function() {
  kb.onEditEnd();
  if (kb.status & kb.ST_CONFLICTING) {
    kb.reloadListAndData(kb.content.id);
  }
};

kb.showData = function(content) {
  var id = content.id;
  var cDate = content.C_DATE;
  var uDate = content.U_DATE;
  var title = content.TITLE;
  var labels = content.LABELS;
  var status = content.STATUS;
  var data_status = content.data_status;

  var cDateStr = '';
  var uDateStr = '';
  if (cDate != undefined) cDateStr = kb.getDateTimeString(+cDate);
  if (uDate != undefined) uDateStr = kb.getDateTimeString(+uDate);
  var labelsHTML = kb.buildLabelsHTML(labels);

  var contentBody = content.BODY;
  contentBody = util.escHtml(contentBody);

  if ($el('#enrich').checked) {
    contentBody = contentBody.replace(/&quot;/g, '"');
    contentBody = util.linkUrls(contentBody);

    var w = kb.linkDataUrl(contentBody, false, -1);
    contentBody = w.s;
    if (w.i == -1) w.i = 0;
    w = kb.linkDataUrl(contentBody, true, w.i);
    contentBody = w.s;
    contentBody = kb.decodeB64Image(contentBody);
  }

  var idLabel = '';
  if (id != '') idLabel = id + ':';

  var titleLabel = util.escHtml(title);
  titleLabel = '<span class="pseudo-link" onclick="kb.openData(\'' + id + '\');">' + titleLabel + '</span>';

  $el('#content-id').innerHTML = idLabel;
  $el('#content-title').innerHTML = titleLabel;
  $el('#content-labels').innerHTML = labelsHTML;
  $el('#select-status').value = status;
  if (kb.status & kb.ST_APP_READY) {
    $el('#content-body').innerHTML = contentBody;
  }

  if (content.data_status == 'EMPTY') {
    $el('#content-created-date').innerHTML = '';
    $el('#content-created-by').innerHTML = '';
    $el('#content-updated-date').innerHTML = '';
    $el('#content-updated-by').innerHTML = '';
  } else {
    $el('#content-created-date').innerHTML = cDateStr;
    $el('#content-created-by').innerHTML = 'by ' + content.C_USER;
    $el('#content-updated-date').innerHTML = uDateStr;
    $el('#content-updated-by').innerHTML = 'by ' + content.U_USER;
  }

  var statusLabel = '';
  if (data_status == 'OK') {
    statusLabel = kb.buildStatusHTML(status);
  } else if (data_status != 'EMPTY') {
    statusLabel = '<span class="status-label-err">' + data_status + '</span>';
  }
  $el('#status').innerHTML = statusLabel;

  $el('#content-wrp').scrollTop = 0
  if (id) {
    $el('.for-view').show();
  } else {
    $el('.for-view').hide();
  }

  if ((id == '0') || (isNaN(id))) {
    $el('#delete-button').hide();
    $el('#clear-button').show();
  } else {
    $el('#delete-button').show();
    $el('#clear-button').hide();
  }
};

kb.linkDataUrl = function(s, f, index) {
  var items = [];
  var m = s.match(/data:.+;base64,\n?[^\n][A-za-z0-9+\-/=\n]+?\n{2}/g);
  if (f) {
    m = s.match(/data:.+;base64,\n?[^\n][A-za-z0-9+\-/=\n]+?\n*$/g);
  }
  if (!m) return {s: s, i: -1};
  for (var i = 0; i < m.length; i++) {
    items.push(m[i]);
  }
  var idx = index;
  for (i = 0; i < items.length; i++) {
    var w = items[i];
    if (!w.match(/^data:image/)) {
      var t = w.match(/data:(.+);/)[1];
      if (index == -1) idx = i;
      var a = '<span class="pseudo-link link" onclick="kb.dlContent(\'' + kb.content.id + '\', \'' + idx + '\');" data-tooltip="Download">[DATA] ' + t + '</span>' + '\n\n'
      s = s.replace(w, a);
    }
  }
  return {s: s, i: i};
};

kb.decodeB64Image = function(s) {
  var m = s.match(/^\n*data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+$/);
  if (m) {
    var w =m[0].replace(/\n/g, '');
    s = s.replace(/data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+/, '<img src="' + w + '">');
    return s;
  }
  m = s.match(/data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+\n\n/g);
  if (!m) {
    s = s.replace(/(data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+)$/, '<img src="$1">');
    return s;
  }
  var imgs = [];
  for (var i = 0; i < m.length; i++) {
    var a = m[i];
    var b = a.match(/(data:image\/.+;base64,)\n?([A-za-z0-9+/=][A-za-z0-9+/=\n]+)\n\n/);
    w = b[1] + b[2].replace(/\n/g, '');
    imgs.push(w);
  }
  for (i = 0; i < imgs.length; i++) {
    s = s.replace(/(?<!")data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+\n\n/, '\n<img src="' + imgs[i] + '">\n\n');
  }
  s = s.replace(/(data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+)$/, '<img src="$1">');
  return s;
};

kb.onEnrichChange = function() {
  kb.showData(kb.content);
};

kb.clear = function() {
  kb._clear();
};
kb._clear = function() {
  kb.clearContent();
  kb.showData(kb.content);
};
kb.clearContent = function() {
  kb.content = {
    id: '',
    data_status: 'EMPTY',
    C_DATE: '',
    C_USER: '',
    U_DATE: '',
    U_USER: '',
    TITLE: '',
    LABELS: '',
    STATUS: '',
    BODY: ''
  };
};

kb.delete = function(id) {
  util.confirm('Delete?', kb._delete, {focus: 'no', data: id});
};
kb._delete = function(id) {
  if (id == undefined) {
    id = kb.content.id;
  }
  var param = {id: id};
  kb.callApi('delete', param, kb.onDelete);
  kb._clear();
};
kb.onDelete = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'FORBIDDEN') {
    kb.onForbidden();
    return;
  }
  if (res.status == 'OK') {
    kb.showInfotip('OK');
    kb.getList ();
  } else {
    kb.showInfotip(res.status);
    log.e(res.status + ':' + res.body);
  }
};

kb.clearData = function(id) {
  util.confirm('Clear?', kb._clearData, {focus: 'no', data: id});
};
kb._clearData = function(id) {
  if (id == undefined) {
    id = kb.content.id;
  }
  kb.edit();
  $el('#content-body-edt').value = '';
  kb.save();
};

kb.export = function() {
  util.confirm('Export?', kb._export);
};
kb._export = function() {
  param = {
    'act': 'export'
  }
  util.postSubmit('api.cgi', param);
};

kb.onHttpError = function(status) {
  var m = 'HTTP_ERROR: ' + status;
  log.e(m);
  kb.showInfotip(m);
};
kb.onApiError = function(res) {
  var m = res.status;
  if (res.body) m += ': ' + res.body;
  log.e(m);
  kb.showInfotip(m);
};

kb.onFontRangeChanged = function(el) {
  var v = el.value;
  kb.setFontSize(v);
};
kb.setFontSize = function(v) {
  var fontSize = v + 'px';
  $el('#font-range').value = v;
  $el('#content-body').style.fontSize = fontSize;
  $el('#content-body-edt').style.fontSize = fontSize;
  $el('#fontsize').innerHTML = fontSize;
};
kb.resetFontSize = function() {
  kb.setFontSize(12);
};

kb.onFontChanged = function(el) {
  var v = el.value;
  kb.setFont(v);
};
kb.setFont = function(v) {
  $el('#content-body').style.fontFamily = v;
  $el('#content-body-edt').style.fontFamily = v;
};

kb.setMonospaceFont = function(f) {
  var n = (f ? 'monospace' : '');
  $el('#font').value = n;
  kb.setFont(n);
};

kb.getSelfSizePos = function(el) {
  var rect = el.getBoundingClientRect();
  var resizeBoxSize = 6;
  var sp = {};
  sp.w = el.clientWidth;
  sp.h = el.clientHeight;
  sp.x1 = rect.left - resizeBoxSize / 2;
  sp.y1 = rect.top - resizeBoxSize / 2;
  sp.x2 = sp.x1 + el.clientWidth;
  sp.y2 = sp.y1 + el.clientHeight;
  return sp;
},

kb.nop = function() {
  return false;
};
kb.disableTextSelect = function() {
  document.onselectstart = kb.nop;
};
kb.enableTextSelect = function() {
  document.onselectstart = kb.onselectstart;
};

kb.onAreaResizeStart = function(e) {
  kb.uiStatus = kb.UI_ST_AREA_RESIZING;
  var x = e.clientX;
  var y = e.clientY;
  var sp1 = kb.getSelfSizePos($el('#list-area'));
  var sp2 = kb.getSelfSizePos($el('#content-area'));
  kb.areaSize.orgY = y;
  kb.areaSize.orgSP1 = sp1;
  kb.areaSize.orgSP2 = sp2;
  kb.disableTextSelect();
  document.body.style.cursor = 'ns-resize';

};
kb.onAreaResize = function(e) {
  var x = e.clientX;
  var y = e.clientY;
  var adj = 8;
  var dH = kb.areaSize.orgY - y;
  var h1 = kb.areaSize.orgSP1.h - dH - adj;
  var h2 = kb.areaSize.orgSP2.h + dH - adj;
  if ((h1 < 70) || (h2 < 100)) {
    return;
  }
  kb.setAreaSize(h1, h2);
};
kb.storeAreaSize = function() {
  var sp1 = kb.getSelfSizePos($el('#list-area'));
  var sp2 = kb.getSelfSizePos($el('#content-area'));
  var adj = 8;
  var h1 = sp1.h - adj;
  var h2 = sp2.h - adj;
  kb.orgH = {h1: h1, h2: h2};
};
kb.resetAreaSize = function() {
  kb.setAreaSize(kb.orgH.h1, kb.orgH.h2);
};
kb.setAreaSize = function(h1, h2) {
  $el('#list-area').style.height = h1 + 'px';
  $el('#content-area').style.height = h2 + 'px';
};
kb.onAreaResizeEnd = function(e) {
  kb.enableTextSelect();
  document.body.style.cursor = 'default';
  kb.uiStatus = kb.UI_ST_NONE;
};

kb.copyContent = function() {
  if (kb.content) {
    kb.copy(kb.content.BODY);
  }
};

kb.showUrl = function() {
  var id = kb.content.id;
  var url = location.href;
  url = url.replace(/\?.*/, '');
  url += '?id=' + id;
  kb.contentUrl = url;
  var m = '<span id="content-url" class="pseudo-link" onclick="kb.copyUrl();" data-tooltip="Click to copy">' + url + '</span>\n\n';
  var listTokens = '<div style="width:100%;text-align:left;line-height:1.8em;">';
  listTokens += 'Token: ';
  listTokens +=  '<span id="valid-until"></span>\n';
    var tokenKeys = [];
  if (kb.configInfo && kb.configInfo.token_keys) {
    tokenKeys = kb.configInfo.token_keys;
  }
  for (var i = 0; i < tokenKeys.length; i++) {
    var tokenKey = tokenKeys[i];
    listTokens += '<button style="margin-right:8px;" onclick="kb.applyToken(\'' + id + '\', \'' + tokenKey + '\')"> SELECT </button>' + tokenKey + '\n';
  }
  listTokens += '<button style="margin-right:8px;" onclick="kb.applyToken(\'' + id + '\', null)">DESELECT</button>\n';
  listTokens += '</div>';
  m += listTokens;
  util.alert(m)
};

kb.copyUrl = function() {
  var url = $el('#content-url').innerText;
  kb.copy(url);
  kb.contntUrl = '';
};

kb.applyToken = function(id, tokenKey) {
  if (tokenKey == null) {
    $el('#content-url').innerText = kb.contentUrl;
    $el('#valid-until').innerText = '';
    return;
  }
  var now = Date.now();
  var validUntilTime = now + kb.configInfo.token_valid_sec * 1000;
  var validUntil = util.getDateTimeString(validUntilTime, '%YYYY-%MM-%DD %HH:%mm:%SS %Z');
  var srcToken = id + ':' + tokenKey + ':' + now;
  var token = util.encodeBSB64(srcToken, 0);
  token = encodeURIComponent(token);
  url = kb.contentUrl + '&token=' + token;
  $el('#content-url').innerText = url;
  $el('#valid-until').innerText = 'Valid until ' + validUntil;
};

kb.copy = function(s) {
  util.copy(s);
  kb.showInfotip('Copied');
};

kb.showInfotip = function(m, d) {
  var opt = {
    style: {
      'font-size': '14px'
    }
  };
  util.infotip.show(m, d, opt);
};

kb.getDateTimeString = function(dt, fmt) {
  if (!fmt) fmt = '%YYYY-%MM-%DD %HH:%mm:%SS';
  return util.getDateTimeString(dt, fmt);
};

kb.onStartListLoading = function(msg) {
  kb.status |= kb.ST_LIST_LOADING;
  kb.drawInfo('<span class="progdot">' + msg + '</span>');
  kb.drawListContent('');
  kb.onStartLoading();
};
kb.onEndListLoading = function() {
  kb.status &= ~kb.ST_LIST_LOADING;
  kb.onEndLoading();
};

kb.onStartDataLoading = function() {
  kb.status |= kb.ST_DATA_LOADING;
  kb.onStartLoading();
  kb.dataLoadingTmrId = setTimeout(kb.onDataLoading, 200);
};
kb.onDataLoading = function() {
  if (kb.dataLoadingTmrId > 0) {
    kb.drawContentBodyArea4Progress('Loading');
  }
};
kb.onEndDataLoading = function() {
  kb.status &= ~kb.ST_DATA_LOADING;
  clearTimeout(kb.dataLoadingTmrId);
  kb.dataLoadingTmrId = 0;
  kb.onEndLoading();
};

kb.onStartLoading = function() {
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  kb.clear();
};
kb.onEndLoading = function() {
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
};

kb.isListLoading = function() {
  return (kb.status & kb.ST_LIST_LOADING);
};

kb.drawContentBodyArea4Progress = function(msg) {
  $el('#content-body').innerHTML = '<span class="progdot">' + msg + '</span>';
};

kb.dlContent = function(id, idx) {
  if (id == undefined) id = kb.content.id;
  var opt = {
    data: {
      id: id,
      idx: idx
    }
  };
  util.confirm('Download?', kb._dlContent, opt);
};
kb._dlContent = function(data) {
  kb.dlB64Content(data.id, data.idx);
};
kb.dlB64Content = function(id, idx) {
  var token = util.getQuery('token');
  param = {
    act: 'dlb64content',
    id: id
  };
  if (idx != undefined) {
    param.idx = idx;
  }
  if (token) {
    param.token = token;
  }
  util.postSubmit('api.cgi', param);
};

kb.closeDialog = function() {
  kb.status &= ~kb.ST_SAVE_CONFIRMING;
  kb.status &= ~kb.ST_CANCEL_CONFIRMING;
  kb.status &= ~kb.ST_TOUCH_CONFIRMING;
  util.dialog.close();
};

$onKeyDown = function(e) {
  var FNC_TBL = {78: kb.onKeyDownN, 86: kb.onKeyDownV, 89: kb.onKeyDownY};
  var fn = FNC_TBL[e.keyCode];
  if (fn) fn(e);
};
$onCtrlS = function(e) {
  if (kb.status & kb.ST_EDITING) {
    if (e.shiftKey) {
      kb.save();
    } else {
      kb.confirmSaveAndExit();
    }
  }
};
kb.onKeyDownY = function(e) {
  if (kb.status & kb.ST_SAVE_CONFIRMING) {
    util.dialog.close();
    kb.saveAndExit();
  } else if (kb.status & kb.ST_CANCEL_CONFIRMING) {
    util.dialog.close();
    kb._cancel();
  } else if (kb.status & kb.ST_TOUCH_CONFIRMING) {
    util.dialog.close();
    kb._touch();
  }
};
kb.onKeyDownN = function(e) {
  if ((kb.status & kb.ST_SAVE_CONFIRMING) || (kb.status & kb.ST_CANCEL_CONFIRMING) || (kb.status & kb.ST_TOUCH_CONFIRMING)) {
    kb.closeDialog();
  }
};

kb.onKeyDownV = function(e) {
  if ((e.ctrlKey) && (kb.status & kb.ST_EDITING)) {
    if (kb.clipboardEnabled) kb.pasteImage();
  }
};

kb.onInputId = function() {
  if ($el('#id-txt').value) {
    kb.disableQ();
  } else {
    kb.enableQ();
  }
}
kb.disableId = function() {
  $el('#id-txt').disabled = true;
  $el('#id-label').addClass('input-label-disable');
};
kb.enableId = function() {
  $el('#id-txt').disabled = false;
  $el('#id-label').removeClass('input-label-disable');
};
kb.onInputQ = function(e) {
  if ($el('#q').value) {
    kb.disableId();
  } else {
    kb.enableId();
  }
};
kb.disableQ = function() {
  $el('#q').disabled = true;
  $el('#keyqord-label').addClass('input-label-disable');
};
kb.enableQ = function() {
  $el('#q').disabled = false;
  $el('#keyqord-label').removeClass('input-label-disable');
};

$onEnterKey = function(e) {
  if ($el('.q-txt').hasFocus()) {
    if (!kb.isListLoading()) {
      kb.search();
    }
  }
};
$onEscKey = function(e) {
  kb.closeDialog();
};

kb.onMouseMove = function(e) {
  if (kb.uiStatus == kb.UI_ST_AREA_RESIZING) {
    kb.onAreaResize(e);
  }
};
kb.onMouseUp = function(e) {
  if (kb.uiStatus == kb.UI_ST_AREA_RESIZING) {
    kb.onAreaResizeEnd(e);
  }
};

kb.http = function(req, cb) {
  req.cb = cb;
  websys.http(req);
};
kb.onForbidden = function() {
  websys.authRedirection(location.href);
};

kb.pasteImage = async function() {
  var permission = await navigator.permissions.query({name: 'clipboard-read'});
  if (permission.state == 'denied') {
    return;
  }
  var contents = await navigator.clipboard.read();
  for (var item of contents) {
    if (!item.types.includes('image/png')) {
      break;
    }
    var blob = await item.getType('image/png');
    var reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = function() {
      var dataUrl = reader.result;
      if (dataUrl) kb.insertBinData(dataUrl);
    };
  }
};

kb.selectText = function(el, st, ed) {
  el.focus();
  el.selectionStart = st;
  el.selectionEnd = ed;
};

kb.keyHandlerD = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var el = $el('#content-body-edt');
    var st = el.selectionStart;
    var ed = el.selectionEnd;
  }
  var t = kb.extractSelectedText(s);
  var m;
  try {
    var s = util.decodeBSB64(t, kb.bsb64.n);
    util.copy(s);
    m = 'Decoded';
  } catch(e) {
    m = '<span style="color:#f77;">DECODE ERROR</span>';
  }
  if (kb.status & kb.ST_EDITING) {
    kb.selectText(el, st, ed);
  }
  util.infotip.show(m);
};
kb.keyHandlerE = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var el = $el('#content-body-edt');
    var st = el.selectionStart;
    var ed = el.selectionEnd;
  }
  var t = kb.extractSelectedText(s);
  var m;
  try {
    var s = util.encodeBSB64(t, kb.bsb64.n);
    util.copy(s);
    m = 'Encoded';
  } catch(e) {
    m = '<span style="color:#f77;">ENCODE ERROR</span>';
  }
  if (kb.status & kb.ST_EDITING) {
    kb.selectText(el, st, ed);
  }
  util.infotip.show(m);
};
kb.extractSelectedText = function() {
  var s = window.getSelection();
  return s.toString();
};

//-------------------------------------------------------------------------
$onBeforeUnload = function(e) {
  if (kb.status & kb.ST_EDITING) e.returnValue = '';
};

kb.view = {};
kb.view.init = function() {
  $el('.for-view').hide();
  var id = util.getQuery('id');
  kb.getData(id);
};

kb.view.onNoRights = function() {
  var msg = 'ERROR: NO_ACCESS_RIGHTS\n\n';
  msg += 'You do not have permission to access.\n';
  msg += 'Please contact the administrator and get valid token.';
  $el('#content-body').textseq(msg, {cursor: 3});
};
