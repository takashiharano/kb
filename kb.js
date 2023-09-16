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
kb.ST_PROP_EDITING = 1 << 11;

kb.UI_ST_NONE = 0;
kb.UI_ST_AREA_RESIZING = 1;

kb.LIST_COLUMNS = [
  {key: 'id', label: 'ID', meta: true},
  {key: 'TITLE', label: 'TITLE'},
  {key: 'DATA_TYPE', label: 'DL'},
  {key: 'C_DATE', label: 'CREATED'},
  {key: 'C_USER', label: 'BY'},
  {key: 'U_DATE', label: 'UPDATED'},
  {key: 'U_USER', label: 'BY'},
  {key: 'ASSIGNEE', label: 'ASSIGNEE'},
  {key: 'STATUS', label: 'STATUS'},
  {key: 'LABELS', label: 'LABELS'},
  {key: 'score', label: 'SCORE', meta: true},
  {key: 'size', label: 'SIZE', meta: true},
  {key: 'DATA_PRIVS', label: 'DATA_PRIVS', forAdmin: true},
  {key: 'encrypted', label: '', meta: true}
];
kb.onselectstart = document.onselectstart;

kb.status = 0;
kb.uiStatus = kb.UI_ST_NONE;
kb.listStatus = {
  sortIdx: 5,
  sortOrder: 2
};
kb.configInfo = null;
kb.itemList = [];
kb.totalCount = 0;
kb.pendingId = null;
kb.scm = '';
kb.scmProps = null;
kb.data = null;
kb.data_bak = null;
kb.urlOfData = '';
kb.dndHandler = null;
kb.areaSize = {
  orgY: 0,
  orgSP1: 0,
  orgSP2: 0,
  orgDH: 0,
  dH: 0
};
kb.requestedId = null;
kb.loadPendingTmrId = 0;
kb.dataLoadingTmrId = 0;
kb.clipboardEnabled = false;

kb.bsb64 = {n: 1};

kb.toolsWindow = null;

$onReady = function(e) {
  $el('#draw-mode').addEventListener('change', kb.onDrawModeChange);
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
  var scm = util.getQuery('scm');
  var q = util.getQuery('q');
  var id = util.getQuery('id');
  if (scm) {
    kb.scm = scm;
  }
  if (kb.scm && (kb.scm != kb.defaultScm)) {
    $el('#scm-name').innerHTML = ' - ' + scm;
  }
  if (id) {
    kb.listAndShowDataById(id);
  } else if (q) {
    q = decodeURIComponent(q);
    $el('#q').value = q;
    kb.search();
  } else {
    kb.getList();
  }
  kb.getSchemaProps(scm, kb.onGetSchemaProps);
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
  var param = {
    scm: kb.scm
  };
  if (id != undefined) {
    param.id = id;
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
  kb.fixedItemList = (data.fixed_data_list ? data.fixed_data_list : []);
  kb.itemList = data.data_list;
  kb.totalCount = data.total_count;
  kb.drawList(kb.fixedItemList, kb.itemList, kb.listStatus.sortIdx, kb.listStatus.sortOrder, kb.totalCount);
  if (kb.itemList.length == 1) {
    $el('#id-txt').value = '';
    kb.onInputSearch()
  }
};

kb.drawInfo = function(html) {
  $el('#info').innerHTML = html;
};

kb.drawListContent = function(html) {
  $el('#list').innerHTML = html;
  $el('#list-wrp').scrollTop = 0;
};

kb.sortList = function(itemList, sortKey, desc, byMetaCol) {
  var items = util.copyObject(itemList);
  var srcList = items;
  if (!byMetaCol) {
    srcList = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      item.content.id = item.id;
      srcList.push(item.content);
    }
  }
  var asNum = true;
  var sortedList = util.sortObject(srcList, sortKey, desc, asNum);
  if (!byMetaCol) {
    var tmpList = [];
    for (i = 0; i < sortedList.length; i++) {
      var content = sortedList[i];
      for (var j = 0; j < items.length; j++) {
        var item = items[j];
        if (content.id == item.id) {
          item.content = content;
          tmpList.push(item);
        }
      }
    }
    items = tmpList;
  }
  return items;
};

kb.drawList = function(fixedItems, items, sortIdx, sortOrder, totalCount) {
  if (sortIdx >= 0) {
    if (sortOrder > 0) {
      var srtDef = kb.LIST_COLUMNS[sortIdx];
      var desc = (sortOrder == 2);
      items = kb.sortList(items, srtDef.key, desc, srtDef.meta);
    }
  }

  var htmlList = '';
  for (var i = 0; i < fixedItems.length; i++) {
    var data = fixedItems[i];
    htmlList += kb.buildListRow(data, true);
  }
  for (var i = 0; i < items.length; i++) {
    data = items[i];
    htmlList += kb.buildListRow(data);
  }
  htmlList += '</table>';

  var htmlHead = kb.buildListHeader(kb.LIST_COLUMNS, sortIdx, sortOrder);
  var html = htmlHead + htmlList; 
  kb.drawListContent(html);

  var infoHtml = items.length + ' ' + util.plural('item', items.length);
  if ((kb.config.list_max > 0) && (totalCount > kb.config.list_max)) {
    infoHtml += ' (' + totalCount + ' in total)';
  }

  kb.drawInfo(infoHtml);

  if (kb.data && kb.data.id != '') {
    kb.highlightSelectedRow(kb.data.id);
  }
};

kb.buildListRow = function(data, fixed) {
  var id = data.id;
  var data_status = data.status;
  var content = data.content || {};

  var status = content.STATUS;
  var b64Title = ((content.TITLE == undefined) ? '' : content.TITLE);
  var b64Labels = content.LABELS;
  var cDate = content.C_DATE;
  var uDate = content.U_DATE;
  var score = (data.score == undefined ? '' : data.score);

  var cDateStr = '';
  var cUser = (content.C_USER ? content.C_USER : '');
  var cUserLink = '';
  if (cUser) {
    cUserLink = '<span class="pseudo-link" onclick="kb.fieldSearch(\'created_by\', \'' + cUser + '\');">' + cUser + '</span>';
  }

  var uDateStr = '';
  var uUser = (content.U_USER ? content.U_USER : '');
  var uUserLink = '';
  if (uUser) {
    uUserLink = '<span class="pseudo-link" onclick="kb.fieldSearch(\'updated_by\', \'' + uUser + '\');">' + uUser + '</span>';
  }

  var assignee = (content.ASSIGNEE ? content.ASSIGNEE : '');
  var assigneeLink = '';
  if (assignee) {
    assigneeLink = '<span class="pseudo-link" onclick="kb.fieldSearch(\'assignee\', \'' + assignee + '\');">' + assignee + '</span>';
  }

  var dataPrivs = content.DATA_PRIVS || '';
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
  if (content.DATA_TYPE == 'dataurl') {
    dlLink = '<span class="dl-link" onclick="kb.dlContent(\'' + id + '\');" data-tooltip="Download">&#x1F517;</span>';
  }
  var labelsHTML = kb.buildItemsHTML('label', labels);
  var privsHTML = kb.buildItemsHTML('priv', dataPrivs);
  var html = '<tr id="row-' + id + '" class="data-list-row">';
  html += '<td><input type="checkbox" onchange="kb.checkItem(\'' + id + '\', this)"';
  if (kb.checkedIds.includes(id)) html += ' checked';
  html += '></td>'
  html += '<td style="padding-right:16px;">' + id + (fixed ? '<span style="color:#888;">*</span>' : '') + '</td>'

  html += '<td style="min-width:300px;max-width:600px;">';
  if (data_status == 'OK') {
    html += '<span style="display:inline-block;width:100%;overflow:hidden;text-overflow:ellipsis;" class="title pseudo-link" onclick="kb.onClickTitle(\'' + id + '\');">';
  } else {
    html += '<span class="title-disabled">';
  }
  html += '<span';
  if (util.lenW(title) > 76) {
    var escTitle = util.escHtml(title);
    html += ' data-tooltip="' + escTitle + '"';
  }
  html += '>' + title + '</span>';
  html += '</span></td>';

  html += '<td style="padding-right:16px;text-align:center;">' + dlLink + '</td>';
  html += '<td style="padding-right:8px;">' + cDateStr + '</td>';
  html += '<td style="padding-right:16px;">' + cUserLink + '</td>';
  html += '<td style="padding-right:8px;">' + uDateStr + '</td>';
  html += '<td style="padding-right:8px;">' + uUserLink + '</td>';
  html += '<td style="padding-right:16px;">' + assigneeLink + '</td>';
  html += '<td>' + statusLabel + '</td>';
  html += '<td style="padding-left:20px;">' + labelsHTML + '</td>';
  html += '<td>' + score + '</td>';
  html += '<td style="text-align:right;padding-left:0.5em;">' + size + '</td>';
  if (kb.LIST_COLUMNS[12].forAdmin && kb.isSysAdmin) {
    html += '<td style="padding-left:20px;">' + privsHTML + '</td>';
  }
  html += '<td style="text-align:center;cursor:default;">' + encrypted + '</td>';

  if (data_status != 'OK') {
    html += '<td class="center"><span class="pseudo-link text-red" data-tooltip="Delete" onclick="kb.delete(\'' + id + '\');">X</span></td>';
  }
  html += '</tr>';
  return html;
};

kb.sortItemList = function(sortIdx, sortOrder) {
  if (sortOrder > 2) {
    sortOrder = 0;
  }
  kb.listStatus.sortIdx = sortIdx;
  kb.listStatus.sortOrder = sortOrder;
  kb.drawList(kb.fixedItemList, kb.itemList, sortIdx, sortOrder, kb.totalCount);
};

kb.checkedIds = [];
kb.checkItem = function(id, el) {
  if (el.checked) {
    kb.checkedIds.push(id);
    $el('#touch-button').disabled = false;
    return;
  }
  var newList = [];
  for (var i = 0; i < kb.checkedIds.length; i++) {
    var v = kb.checkedIds[i];
    if (v != id) newList.push(v);
  }
  kb.checkedIds = newList;
  if (newList.length == 0) $el('#touch-button').disabled = true;
};

//---------------------------------------------------------
kb.buildListHeader = function(columns, sortIdx, sortOrder) {
  var html = '<table id="list-table" class="item list-table item-list">';
  html += '<tr class="item-list">';

  html += '<th class="item-list">&nbsp;</th>';
  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    if (column.forAdmin && !kb.isSysAdmin) {
      continue;
    }
    var label = column['label'];

    var sortAscClz = '';
    var sortDescClz = '';
    var nextSortType = 1;
    if (i == sortIdx) {
      if (sortOrder == 1) {
        sortAscClz = 'sort-active';
      } else if (sortOrder == 2) {
        sortDescClz = 'sort-active';
      }
      nextSortType = sortOrder + 1;
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
  var url = './';
  if (kb.scm != '') url += '?scm=' + kb.scm;
  history.replaceState(null, '', url);
  $el('#q').value = '';
  $el('#id-txt').value = '';
  kb.onInputSearch()
  kb.resetAreaSize();
  kb.checkedIds = [];
  kb.listAll();
  $el('#q').focus();
};
kb.listAll = function() {
  if (!kb.isListLoading()) {
    kb.listStatus.sortIdx = 5;
    kb.listStatus.sortOrder = 2;
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
      kb.listAndShowDataById(id);
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
    kb.listStatus.sortIdx = 10;
  }
  kb.listStatus.sortOrder = 2;
  var param = {
    scm: kb.scm,
    q: util.encodeBase64(q)
  };
  kb.onStartListLoading('Searching');
  kb.callApi('search', param, kb.onSearchCb);
};
kb.onSearchCb = function(xhr, res, req) {
  kb.onGetList(xhr, res, req);
  var index = parseInt(util.getQuery('index'));
  if (!isNaN(index)) {
    var items = kb.sortList(kb.itemList, 'score', true, true);
    var item = items[index];
    if (item) {
      var id = item.id;
      kb.openData(id);
    }
  }
};

kb.listAndShowDataById = function(id) {
  kb.getList(id);
  kb.getData(id);
};

kb.fieldSearch = function(field, keyword) {
  $el('#id-txt').value = '';
  kb.onInputId();
  if (keyword.match(/ /)) keyword = '"' + keyword + '"';
  $el('#q').value = field + ':' + keyword;
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
    kb.showData(id);
  } else {
    kb.loadPendingTmrId = setTimeout(kb.onLoadPendingExpr, 500, id);
  }
  kb.highlightSelectedRow(id);
};

kb.onLoadPendingExpr = function(id) {
  kb.loadPendingTmrId = 0;
  kb.showData(id);
};

kb.getMetaData = function(id) {
  var d = kb._getMetaData(id, kb.itemList);
  if (d) return d;
  d = kb._getMetaData(id, kb.fixedItemList);
  if (d) return d;
  return null;
};
kb._getMetaData = function(id, itemList) {
  for (var i = 0; i < itemList.length; i++) {
    var item = itemList[i];
    if (item.id == id) return item;
  }
  return null;
};

kb.showData = function(id) {
  kb.openData(id);
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
  var param = {
    scm: kb.scm,
    id: id
  };
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

  var data_status = data.status;
  if (data_status != 'OK') {
    kb._clear();
    kb.showInfotip(data_status);
    return;
  }

  kb.data = {};
  kb.data = util.copyObject(data, kb.data);

  var content = data.content;
  if (content) {
    var b64Title = ((content.TITLE == undefined) ? '' : content.TITLE);
    var b64Labels = content.LABELS;
    var b64Body = content.BODY;
    var title = util.decodeBase64(b64Title);
    var labels = util.decodeBase64(b64Labels);
    var body = util.decodeBase64(b64Body);
    kb.data.content.TITLE = title;
    kb.data.content.LABELS = labels;
    kb.data.content.BODY = body;
  }

  kb.drawData(kb.data);
  $el('.for-view').show();
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
    html += ' onclick="kb.fieldSearch(\'status\', \'' + status + '\');"';
  }
   html += '>';
  html += status;
  html += '</span>';
  return html;
};

kb.buildItemsHTML = function(keyname, items) {
  var itemList = [];
  if (items) {
    itemList = items.replace(/\s{2,}/g, ' ').split(' ');
  }
  var html = '';
  for (var i = 0; i < itemList.length; i++) {
    var item = util.escHtml(itemList[i]);
    html += '<span class="label"';
    if (kb.mode != 'view') {
      html += ' onclick="kb.fieldSearch(\'' + keyname + '\', \'' + item + '\');"';
    }
    html += '>' + item + '</span>';
  }
  return html;
};

kb.createNew = function() {
  kb.status |= kb.ST_NEW;
  kb._clear();
  kb.edit();
  var encrypt = kb.config.default_data_encryption;
  if ('encrypt' in kb.scmProps) {
    encrypt = kb.scmProps.encrypt;
  }
  $el('#chk-encryption').checked = encrypt;
  $el('#content-title-edt').focus();
  $el('#chk-silent').disabled = true;
};

kb.duplicate = function() {
  kb.status |= kb.ST_NEW;
  kb.data_bak = util.copyObject(kb.data);
  kb.data.id = '';
  kb.drawData(kb.data);
  kb.edit();
  var encrypt = kb.config.default_data_encryption;
  if ('encrypt' in kb.scmProps) {
    encrypt = kb.scmProps.encrypt;
  }
  $el('#chk-encryption').checked = encrypt;
  $el('#content-title-edt').focus();
  $el('#chk-silent').disabled = true;
};

kb.editLabels = function() {
  kb.status |= kb.ST_EDIT_ONLY_LABELS;
  kb.edit();
  $el('#content-title-edt').disabled = true;
  $el('#content-body-edt').disabled = true;
  $el('#select-status').disabled = true;
  $el('#chk-encryption').disabled = true;
  $el('#content-labels-edt').focus();
  $el('#chk-silent').checked = true;
};

kb.edit = function() {
  kb.status |= kb.ST_EDITING;

  $el('#id-txt').disabled = true;
  $el('#q').disabled = true;
  kb.updateSearchLabels();

  $el('#new-button').disabled = true;
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  $el('#touch-button').disabled = true;
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
  $el('#chk-silent').disabled = false;

  var data = kb.data;
  var content = data.content;

  $el('#content-id-edt').value = data.id;
  $el('#content-title-edt').value = content.TITLE;
  $el('#content-body-edt').value = content.BODY;
  $el('#content-labels-edt').value = content.LABELS;
  $el('#chk-encryption').checked = data.encrypted;
  $el('#chk-silent').checked = false;
};

kb.onEditEnd = function() {
  kb.status &= ~kb.ST_EDITING;
  kb.status &= ~kb.ST_EDIT_ONLY_LABELS;
  kb.status &= ~kb.ST_NEW;
  kb.data_bak = null;

  $el('#content-body').show();

  $el('#content-id-edt').value = '';

  $el('#info-label').show();
  $el('#info-edit').hide();
  $el('#content-title-edt').value = '';

  $el('#content-body-edt-wrp').hide();
  $el('#content-body-edt').value = '';

  $el('#content-labels-edt').value = '';

  $el('#id-txt').disabled = false;
  $el('#q').disabled = false;
  kb.onInputSearch()

  $el('#new-button').disabled = false;
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
  $el('#clear-button').disabled = false;
  kb.enableTouchButton();

  if (kb.data) kb.drawData(kb.data);

  if (kb.data.id) {
    $el('.for-view').show();
  } else {
    $el('.for-view').hide();
  }

  $el('.for-edit').hide();
};

kb.enableTouchButton = function() {
  if (kb.checkedIds.length > 0) $el('#touch-button').disabled = false;
};

kb.confirmSaveAndExit = function() {
  if (!(kb.status & kb.ST_SAVE_CONFIRMING)) {
    kb.status |= kb.ST_SAVE_CONFIRMING;
    util.confirm('Save and Exit?', kb.saveAndExit, kb.cancelSave);
  }
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

  var orgUdate = kb.data.content.U_DATE;
  var encryption = ($el('#chk-encryption').checked ? '1' : '0');
  var silent = ($el('#chk-silent').checked ? '1' : '0');
  var title = $el('#content-title-edt').value;
  var body = $el('#content-body-edt').value;
  var labels = $el('#content-labels-edt').value.trim();
  labels = labels.replace(/\s{2,}/g, ' ');
  var status = $el('#select-status').value;
  var assignee = $el('#content-assignee-edt').value.trim();

  if (!title) {
    kb.showInfotip('Title is required', 3000);
    $el('#content-title-edt').focus();
    return;
  }

  kb.data.id = id;
  kb.data.content.TITLE = title;
  kb.data.content.BODY = body;
  kb.data.content.LABELS = labels;
  kb.data.content.STATUS = status;

  var b64Title = util.encodeBase64(title);
  var b64Labels = util.encodeBase64(labels);
  var b64Body = util.encodeBase64(body);

  var only_labels;
  var content = {};
  if (kb.status & kb.ST_EDIT_ONLY_LABELS) {
    only_labels = true;
    content.LABELS = b64Labels;
  } else {
    only_labels = false;
    content.TITLE = b64Title;
    content.LABELS = b64Labels;
    content.STATUS = status;
    content.ASSIGNEE = assignee;
    content.BODY = b64Body;
  }

  var data = {
    org_u_date: orgUdate,
    encryption: encryption,
    only_labels: only_labels,
    silent: silent,
    content: content
  };


  kb.drawContentBodyArea4Progress('Saving');

  var j = util.toJSON(data);
  var param = {
    scm: kb.scm,
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
    kb.data.content.U_DATE = savedData.U_DATE;
    kb.showInfotip('OK');
  } else if (res.status == 'CONFLICT') {
    kb.status |= kb.ST_CONFLICTING;
    $el('#content-body').innerHTML = 'ERROR!';
    var data = res.body;
    var m = kb.buildConflictMsg(data);
    util.alert('Conflict!', m, kb.onConflictOK);
  } else {
    kb.onApiError(res);
  }
};
kb.cancelSave = function() {
  kb.status &= ~kb.ST_SAVE_CONFIRMING;
};

kb.buildConflictMsg = function(data) {
    var dt = util.getDateTimeString(+data.U_DATE);
    var m = 'The data is already updated.\n\n'
    m += '<div style="text-align:left;">';
    m += 'DATE: ' + dt + '\n';
    m += 'BY  : ' + data.U_USER;
    m += '</div>';
    return m;
}

kb.touch = function() {
  kb.status |= kb.ST_TOUCH_CONFIRMING;
  var m = 'Update the last update date to now?\n<input type="checkbox" id="chk-keep-updated-by"><label for="chk-keep-updated-by">Keep updated by</label>';
  util.confirm(m, kb._touch, kb.cancelTouch);
};
kb._touch = function() {
  kb.status &= ~kb.ST_TOUCH_CONFIRMING;
  var ids = '';
  for (var i = 0; i < kb.checkedIds.length; i++) {
    if (i > 0) ids += ',';
    ids += kb.checkedIds[i];
  }
  var keepUpdatedBy = ($el('#chk-keep-updated-by').checked ? '1' : '0');
  var param = {scm: kb.scm, ids: ids, keep_updated_by: keepUpdatedBy};
  kb.callApi('touch', param, kb.onTouchDone);
  kb.drawContentBodyArea4Progress('Updating');
};
kb.onTouchDone = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    kb.checkedIds = [];
    if (kb.data && kb.data.id != '') {
      kb.reloadListAndData(kb.data.id);
    } else {
      $el('#content-body').innerHTML = '';
      kb.search();
    }
    kb.showInfotip('OK');
  } else {
    log.e(res.status + ':' + res.body);
  }
};
kb.cancelTouch = function() {
  kb.status &= ~kb.ST_TOUCH_CONFIRMING;
};

kb.reloadListAndData = function(id) {
  kb.listStatus.sortIdx = 5;
  kb.listStatus.sortOrder = 2;
  kb.search();
  kb.getData(id);
};

kb.onConflictOK = function() {
  kb.edit();
};

kb.checkExists = function(id) {
  var param = {scm: kb.scm, id: id};
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

kb.confirmCancel = function() {
  kb.status |= kb.ST_CANCEL_CONFIRMING;
  util.confirm('Cancel?', kb.cancel, kb.cancelCancel, {focus: 'no'});
};
kb.cancel = function() {
  kb.status &= ~kb.ST_CANCEL_CONFIRMING;
  kb._cancel();
};
kb._cancel = function() {
  if (kb.data_bak) {
    kb.data = kb.data_bak;
    kb.data_bak = null;
  }
  kb.onEditEnd();
  if (kb.status & kb.ST_CONFLICTING) {
    kb.reloadListAndData(kb.data.id);
  }
};
kb.cancelCancel = function() {
  kb.status &= ~kb.ST_CANCEL_CONFIRMING;
};

kb.drawData = function(data) {
  var content = data.content;
  var id = data.id;
  var cDate = content.C_DATE;
  var uDate = content.U_DATE;
  var title = content.TITLE;
  var labels = content.LABELS;
  var status = content.STATUS;
  var assignee = content.ASSIGNEE;
  var fontFamily = content.FONT;
  var data_status = data.status;
  var contentBody = content.BODY;

  var cDateStr = '';
  var uDateStr = '';
  if (cDate != undefined) cDateStr = kb.getDateTimeString(+cDate);
  if (uDate != undefined) uDateStr = kb.getDateTimeString(+uDate);
  var labelsHTML = kb.buildItemsHTML('label', labels);

  var drawMode = $el('#draw-mode').value;
  if (drawMode != '2') {
    contentBody = util.escHtml(contentBody);
  }
  if (drawMode == '1') {
    contentBody = contentBody.replace(/&quot;/g, '"');
    contentBody = util.linkUrls(contentBody);

    var w = kb.linkDataUrl(contentBody, false, -1);
    contentBody = w.s;
    if (w.i == -1) w.i = 0;
    w = kb.linkDataUrl(contentBody, true, w.i);
    contentBody = w.s;
    contentBody = kb.decodeB64Image(contentBody);

    contentBody = kb.linkBsb64Data(contentBody);
    contentBody = contentBody.replace(/^(\s*)(#.*)/g, '$1<span class="comment">$2</span>');
    contentBody = contentBody.replace(/(\n)(\s*)(#.*)/g, '$1$2<span class="comment">$3</span>');
    contentBody = contentBody.replace(/(?<!\\)```([\s\S]+?)(?<!\\)```/g, '<pre class="code">$1</pre>');
    contentBody = contentBody.replace(/(?<!\\)`(.+?)(?<!\\)`/g, '<span class="code-s">$1</span>');
    contentBody = contentBody.replace(/\\`/g, '`');
  }

  var idLabel = '';
  if (id != '') idLabel = '<span class="pseudo-link" onclick="kb.showData(\'' + id + '\');">' + id + '</span>:';
  var titleLabel = util.escHtml(title);

  $el('#content-id').innerHTML = idLabel;
  $el('#content-title').innerHTML = titleLabel;
  $el('#content-labels').innerHTML = labelsHTML;
  $el('#select-status').value = status;
  $el('#content-assignee-edt').value = assignee;
  if (kb.status & kb.ST_APP_READY) {
    $el('#content-body').innerHTML = contentBody;
  }

  if (content.data_status == 'EMPTY') {
    $el('#content-created-date').innerHTML = '';
    $el('#content-created-by').innerHTML = '';
    $el('#content-updated-date').innerHTML = '';
    $el('#content-updated-by').innerHTML = '';
    $el('#content-assignee').innerHTML = '';
  } else {
    $el('#content-created-date').innerHTML = cDateStr;
    $el('#content-created-by').innerHTML = 'by ' + content.C_USER;
    $el('#content-updated-date').innerHTML = uDateStr;
    $el('#content-updated-by').innerHTML = 'by ' + content.U_USER;
    if (content.ASSIGNEE) $el('#content-assignee').innerHTML = '&nbsp;&nbsp;ASSIGNEE: ' + content.ASSIGNEE;
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

  if (kb.hasFlag(content.FLAGS, 'NODELETE')) {
    $el('#delete-button').hide();
    $el('#clear-button').show();
  } else {
    $el('#delete-button').show();
    $el('#clear-button').hide();
  }

  if (fontFamily) {
    kb.forceFontChanged = true;
    kb.setFont(fontFamily);
  } else {
    kb.restoreFont();
    kb.forceFontChanged = false;
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
      var a = '<span class="pseudo-link link" onclick="kb.dlContent(\'' + kb.data.id + '\', \'' + idx + '\');" data-tooltip="Download">[DATA] ' + t + '</span>' + '\n\n'
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

kb.linkBsb64Data = function(s) {
  var t = '<span class="pseudo-link link" onclick="kb.decodeBSB64(\'$1\');" data-tooltip="Click to decode">$1</span>';
  s = s.replace(/(bsb64:[A-Za-z0-9+/=$]+)/g, t);
  s = s.replace(/decodeBSB64\('bsb64:/g, 'decodeBSB64(\'');
  s = s.replace(/>bsb64:([A-Za-z0-9+/=$]+)<\/span>/g, '>$1</span>');
  return s;
};

kb.onDrawModeChange = function() {
  kb.drawData(kb.data);
};

kb.clear = function() {
  kb._clear();
};
kb._clear = function() {
  kb.clearContent();
  kb.drawData(kb.data);
};
kb.clearContent = function() {
  kb.data = {
    id: '',
    status: 'EMPTY',
    content: {
      C_DATE: '',
      C_USER: '',
      U_DATE: '',
      U_USER: '',
      ASSIGNEE: '',
      TITLE: '',
      LABELS: '',
      STATUS: '',
      FLAGS: '',
      DATA_TYPE: '',
      DATA_PRIVS: '',
      BODY: ''
    }
  };
};

kb.delete = function(id) {
  util.confirm('Delete?', kb._delete, {focus: 'no', data: id});
};
kb._delete = function(id) {
  if (id == undefined) {
    id = kb.data.id;
  }
  var param = {scm: kb.scm, id: id};
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
    kb.getList();
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
    id = kb.data.id;
  }
  kb.edit();
  $el('#content-body-edt').value = '';
  kb.saveAndExit();
};

kb.export = function() {
  var s = '<div style="width:280px;">Export data?</div>\n';
  s += '<div style="display:inline-block;text-align:left;">'
  if (kb.isAdmin) {
    s += '<input type="checkbox" id="chk-export-all" checked><label for="chk-export-all">All schema</label>\n'
  }
  s += '<input type="checkbox" id="chk-decrypt"><label for="chk-decrypt">Decrypt</label>'
  s += '</div>';
  util.confirm(s, kb._export);
};
kb._export = function() {
  param = {act: 'export'};
  if ($el('#chk-export-all').checked) {
    param.all = '1'
  } else {
    param.scm = kb.scm;
  }
  if ($el('#chk-decrypt').checked) {
    param.decrypt = '1';
  }
  util.postSubmit('api.cgi', param);
};

kb.editProps = function() {
  kb.status |= kb.ST_PROP_EDITING;
  var content = kb.data.content;
  var props = '';
  for (var k in content) {
    if (k != 'BODY') {
      props += k + ': ' + content[k] + '\n';
    }
  }
  var html = '';
  html += '<div style="width:50vw;height:50vh;">';
  html += '<div style="text-align:left;margin-bottom:4px;width:150px;">';
  html += '<span>ID: </span><input type="text" id="prop-data-id" value="' + kb.data.id + '" onfocus="kb.onPropIdFocus();">';
  html += '<button id="change-id-button" style="margin-left:4px;" onclick="kb.confirmChangeDataId();" disabled>CHANGE</button>';
  html += '<button id="next-id-button" class="small-button" style="margin-left:4px;" onclick="kb.checkId();">CHECK ID</button>';
  html += '</div>';
  html += '<textarea id="props" spellcheck="false" style="width:100%;height:calc(100% - 54px);margin-bottom:8px;" onfocus="kb.onPropsFocus();">' + props + '</textarea><br>';
  html += '<button id="save-props-button" onclick="kb.confirmSaveProps();" disabled>SAVE</button>';
  html += '<button style="margin-left:10px;" onclick="kb.cancelEditProps();">Cancel</button>';
  html += '</div>';
  util.dialog.open(html);
};

kb.confirmSaveProps = function() {
  util.confirm('Save properties?', kb.saveProps);
};
kb.saveProps = function() {
  var props = $el('#props').value;
  props = props.replace(/\n{2,}/g, '\n');
  props = props.replace(/^\n/, '');
  var p = util.encodeBase64(props);
  var orgUdate = kb.data.content.U_DATE;
  var param = {
    scm: kb.scm,
    id: kb.data.id,
    org_u_date: orgUdate,
    props: p
  };
  kb.callApi('mod_props', param, kb.onSaveProps);
};
kb.onSaveProps = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    util.dialog.close();
    kb.onEditPropsEnd();
    kb.reloadListAndData(kb.data.id);
    kb.showInfotip('OK');
  } else if (res.status == 'CONFLICT') {
    kb.status |= kb.ST_CONFLICTING;
    var data = res.body;
    var m = kb.buildConflictMsg(data);
    util.alert('Conflict!', m, null);
  } else {
    m = res.status + ':' + res.body;
    log.e(m);
    kb.showInfotip(m);
  }
};
kb.cancelEditProps = function() {
  util.dialog.close();
  kb.onEditPropsEnd();
};

kb.onEditPropsEnd = function() {
  kb.status &= ~kb.ST_PROP_EDITING;
};

kb.checkId = function() {
  var param = {scm: kb.scm};
  kb.callApi('check_id', param, kb.onCheckId);
};
kb.onCheckId = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    var info = res.body;
    var nextId = info.next_id;
    var emptyIdInfo = info.empty_id_info;
    var emptyIds = emptyIdInfo.empty_ids;
    var omitCount = emptyIdInfo.omit_count;
    var m = 'NEXT ID: ' + nextId;
    if (emptyIds.length > 0) {
      m += '\n';
      m += 'EMPTY: ';
      for (var i = 0; i < emptyIds.length; i++) {
        var id = emptyIds[i];
        if (i > 0) m += ', ';
        if ((omitCount > 0) && (i == emptyIds.length - 1)) m += '..(' + omitCount + ').. ';
        var idLink = '<span class="pseudo-link" onclick="kb.selectAndChangeDataId(\'' + id + '\');">' + id + '</span>';
        m += idLink;
      }
    }
    util.alert(m);
  } else {
    m = res.status;
    log.e(m);
    kb.showInfotip(m);
  }
};

kb.selectAndChangeDataId = function(idTo) {
  $el('#prop-data-id').value = idTo;
  util.dialog.close();
  kb.confirmChangeDataId();
};
kb.confirmChangeDataId = function() {
  var idFm = kb.data.id;
  var idTo = $el('#prop-data-id').value.trim();
  if (idFm == idTo) {
    kb.showInfotip('Same as current ID.');
    return;
  }
  if (kb.validateId(idTo)) {
    kb.showInfotip('Invalid ID');
    return;
  }
  var m = 'Change ID from ' + idFm + ' to ' + idTo + ' ?'
  util.confirm(m, kb.changeDataId);
};
kb.changeDataId = function() {
  var idFm = kb.data.id;
  var idTo = $el('#prop-data-id').value.trim();
  var param = {
    scm: kb.scm,
    id_fm: idFm,
    id_to: idTo
  };
  kb.callApi('change_data_id', param, kb.onChangeDataId);
};
kb.onChangeDataId = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    util.dialog.close();
    kb.onEditPropsEnd();
    var newId = res.body.id_to;
    kb.reloadListAndData(newId);
    kb.showInfotip('OK');
  } else {
    var m = res.status;
    log.e(m);
    kb.showInfotip(m, 3000);
  }
};

kb.onPropIdFocus = function() {
  $el('#change-id-button').disabled = false;
  $el('#save-props-button').disabled = true;
};
kb.onPropsFocus = function() {
  $el('#change-id-button').disabled = true;
  $el('#save-props-button').disabled = false;
};

kb.validateId = function(id) {
  if (!id.match(/^[A-Za-z0-9_\-]+$/)) {
    return true;
  }
  return false;
};

kb.selectSchema = function() {
  var html = '';
  html += '<div style="width:400px;height:180px;">';
  html += 'SELECT SCHEMA';
  if (kb.isSysAdmin) {
    html += '<button style="position:absolute;right:16px;" onclick="kb.newSchema();">New</button>';
  }
  html += '<div style="margin-top:16px;height:calc(100% - 60px);">';
  html += '<div style="display:inline-block;width:70%;height:100%;overflow:auto;">';
  html += '<pre id="schema-list" style="text-align:left;"><span class="progdot">Loading</span></pre>';
  html += '</div>';
  html += '</div>';
  html += '<div style="margin:16px 0;">';
  html += '<button onclick="kb.closeDialog();">Close</button>';
  html += '</div>';
  html += '</div>';
  util.dialog.open(html);
  kb.updateSchemaList();
};
kb.updateSchemaList = function() {
  kb.callApi('get_schema_list', null, kb.onGetSchemaList);
};
kb.onGetSchemaList = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    return;
  }
  var scmMap = res.body;
  var html = '<table style="width:100%;">';
  for (var scm in scmMap) {
    var prop = scmMap[scm];
    var name = scm;
    if (('name' in prop) && prop['name'] != '') {
      name = prop['name'];
    }
    html += '<tr class="data-list-row">';
    html += '<td style="width:10px;">';
    if ((scm == kb.scm) || (!kb.scm && (scm == kb.defaultScm))) {
      html += '*';
    }
    html += '</td>';
    html += '<td style="padding-right:20px;white-space:nowrap;">';
    html += '<span style="display:inline-block;width:100%;overflow:hidden;text-overflow:ellipsis;" class="title pseudo-link" onclick="kb.switchSchema(\'' + scm + '\');">';
    html += '<span class="pseudo-link link">' + name + '</span>\n';
    html += '</span>';
    html += '</td>';
    if (kb.isSysAdmin) {
      html += '<td style="width:24px;">';
      html += '<span class="pseudo-link" onclick="kb.editSchemaProps(\'' + scm + '\');" data-tooltip="Edit properties">P</span>\n';
      html += '</td>';
      html += '<td style="width:16px;">';
      if ((scm != kb.defaultScm) && (scm != kb.scm)) {
        html += '<span class="pseudo-link text-red" onclick="kb.confirmDeleteSchema(\'' + scm + '\');" data-tooltip="Delete">X</span>\n';
      } else {
        html += '&nbsp;';
      }
      html += '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';
  $el('#schema-list').innerHTML = html;
};
kb.switchSchema = function(scm) {
  var url = './';
  if (scm && scm != kb.defaultScm) {
    url += '?scm=' + scm;
  }
  location.href = url;
};

kb.newSchema = function() {
  var html = kb.buildSchemaEditor(null, 'kb.createSchema');
  util.dialog.open(html);
  $el('#scm-props').value = '{\n  "name": "",\n  "privs": "",\n  "encrypt": ' + kb.config.default_data_encryption + '\n}\n';
  $el('#scm-id').focus();
};
kb.buildSchemaEditor = function(scm, cbFncName) {
  var title = (scm ? 'EDIT SCHEMA' : 'NEW SCHEMA');
  var html = '';
  html += '<div style="width:360px;height:180px;">';
  html += title;
  html += '<div style="overflow:auto;height:calc(100% - 30px);">';
  html += '<div style="display:inline-block;width:80%;">';
  html += '<pre id="schema-list" style="text-align:left;">';
  html += 'ID: <input type="text" id="scm-id" style="width:260px;">\n';
  html += '<div style="margin-top:8px;">Properties:</div>';
  html += '<textarea id="scm-props" style="width:100%;height:85px;"></textarea>';
  html += '</pre>';
  html += '</div>';
  html += '</div>';
  html += '<button style="width:60px;" onclick="' + cbFncName + '();">OK</button>';
  html += '<button style="margin-left:4px;width:60px;" onclick="kb.closeDialog();">Cancel</button>';
  html += '</div>';
  return html;
};

kb.createSchema = function() {
  var scmId = $el('#scm-id').value.trim();
  if (!scmId.match(/^[a-z0-9_\-]+$/)) {
    kb.showInfotip('Available chars are:\n- Lowercase letters\n- Numerical character\n- Hyphen\n- Underscore', 3000);
    return;
  }
  var props = $el('#scm-props').value.trim();
  var b64props = util.encodeBase64(props);
  var params = {
    scm: scmId,
    props: b64props
  };
  kb.callApi('create_schema', params, kb.onCreateSchema);
};
kb.onCreateSchema = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    kb.showInfotip(res.status);
    return;
  }
  util.dialog.close();
  kb.updateSchemaList();
  kb.showInfotip('OK');
};
kb.switchNewSchema = function(data) {
  kb.switchSchema(data.scm);
};

kb.editSchemaProps = function(scm) {
  var html = kb.buildSchemaEditor(scm, 'kb.saveSchemaProps');
  util.dialog.open(html);
  $el('#scm-id').value = scm;
  $el('#scm-id').disabled = true;
  kb.getSchemaProps(scm, kb.onGetSchemaPropsForEdit);
};
kb.getSchemaProps = function(scm, cb) {
  var params = {scm: scm};
  kb.callApi('get_schema_props', params, cb);
};
kb.onGetSchemaProps = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    kb.showInfotip(res.status);
    return;
  }
  var b64props = res.body.props;
  var props = util.decodeBase64(b64props);
  if (!props) props = '{}';
  kb.scmProps = util.fromJSON(props);
};

kb.onGetSchemaPropsForEdit = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    kb.showInfotip(res.status);
    return;
  }
  var b64props = res.body.props;
  var props = util.decodeBase64(b64props);
  $el('#scm-props').value = props;
};

kb.saveSchemaProps = function() {
  var scmId = $el('#scm-id').value.trim();
  var props = $el('#scm-props').value.trim() + '\n';
  var b64props = util.encodeBase64(props);
  var params = {
    scm: scmId,
    props: b64props
  };
  kb.callApi('save_schema_props', params, kb.onSaveSchemaProps);
};
kb.onSaveSchemaProps = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    kb.showInfotip(res.status);
    return;
  }
  var scm = res.body.scm;
  util.dialog.close();
  kb.updateSchemaList();
  if (scm == kb.scm) {
    kb.getSchemaProps(scm, kb.onGetSchemaProps);
  }
  kb.showInfotip('OK');
};

kb.confirmDeleteSchema = function(scm) {
  var code = util.randomString('0123456789', 6);
  var opt = {
    focus: 'no',
    data: {
      scm: scm,
      code: code
    }
  };
  var title = '<span class="text-red">!!! DELETE SCHEMA !!!</span>';
  var msg = '\nDelete the schema <b>' + scm + '</b> ?\n';
  msg += 'Once you get started, you cannot rollback.\n';
  msg += '\n';
  msg += 'Enter the code ' + code + ' to proceed.';
  util.dialog.text(title, msg, kb.deleteSchema, opt);
};
kb.deleteSchema = function(text, data) {
  if (text != data.code) {
    util.alert('Incorrect passcode. Aborted.');
    return;
  }
  var params = {scm: data.scm};
  kb.callApi('delete_schema', params, kb.onDeleteSchema);
};
kb.onDeleteSchema = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    util.alert(res.status);
    return;
  }
  kb.showInfotip('OK');
  kb.updateSchemaList();
};

kb.openTools = function() {
  if (kb.toolsWindow) {
    return;
  }
  var html = '';
  html += '<div style="width:100%;height:100%;">';
  html += '<div style="padding:4px;">';
  html += kb.tools.buildBsb64Html();
  html += kb.tools.buildPwGenHtml();
  html += '</div>';
  html += '</div>';

  var opt = {
    draggable: true,
    resizable: true,
    pos: 'c',
    closeButton: true,
    width: 720,
    height: 280,
    minWidth: 720,
    minHeight: 280,
    scale: 1,
    hidden: false,
    modal: false,
    title: {
      text: 'Tools'
    },
    body: {
      style: {
        background: 'rgba(0,0,0,0.8)'
      }
    },
    onclose: kb.onToolsWindowClose,
    content: html
  };

  kb.toolsWindow = util.newWindow(opt);

  kb.tools.onEncDecModeChange();
  $el('#b64-text-in').focus();
};

kb.closeToolsWindow = function() {
  if (kb.toolsWindow) {
    kb.toolsWindow.close();
  }
};

kb.onToolsWindowClose = function() {
  kb.toolsWindow = null;
};

kb.onHttpError = function(status) {
  var m = 'HTTP_ERROR: ' + status;
  log.e(m);
  kb.showInfotip(m);
};
kb.onApiError = function(res) {
  var s = res.status;
  if ((s == 'SCHEMA_NOT_FOUND') || (s == 'NO_ACCESS_RIGHTS')) {
    kb.onNotAvailable('Not Available');
  } else {
    if (res.body) s += ': ' + res.body;
    log.e(s);
  }
  kb.showInfotip(s, 2500);
};
kb.onNotAvailable = function(s) {
  kb.drawInfo('<span class="text-red">' + s + '</span>');
  kb.drawListContent('');
  $el('#new-button').disabled = true;
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  $el('#id-txt').disabled = true;
  $el('#id-label').addClass('input-label-disable');
  $el('#q').disabled = true;
  $el('#keyqord-label').addClass('input-label-disable');
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

kb.fontFamily = '';
kb.forceFontChanged = false;
kb.onFontChanged = function(el) {
  var v = el.value;
  kb.fontFamily = v;
  kb._setFont(v);
};
kb._setFont = function(v) {
  $el('#content-body').style.fontFamily = v;
  $el('#content-body-edt').style.fontFamily = v;
};
kb.restoreFont = function() {
  if (kb.forceFontChanged) {
    kb.setFont(kb.fontFamily);
  }
};
kb.setFont = function(n) {
  $el('#font').value = n;
  kb._setFont(n);
};
kb.changeFont = function(n) {
  kb.setFont(n);
  kb.fontFamily = n;
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
  kb.areaSize.orgDH = kb.areaSize.dH;
  kb.disableTextSelect();
  document.body.style.cursor = 'ns-resize';

};
kb.onAreaResize = function(e) {
  var x = e.clientX;
  var y = e.clientY;
  var adj = 8;
  var dY = kb.areaSize.orgY - y;
  var h1 = kb.areaSize.orgSP1.h - dY - adj;
  var h2 = kb.areaSize.orgSP2.h + dY - adj;
  var dH = kb.areaSize.orgDH - dY;
  kb.areaSize.dH = dH;
  if ((h1 < 100) || (h2 < 100)) {
    return;
  }
  kb.setAreaSize(h1, dH);
};
kb.storeAreaSize = function() {
  var sp1 = kb.getSelfSizePos($el('#list-area'));
  var adj = 8;
  var h1 = sp1.h - adj;
  kb.orgH = {h1: h1};
};
kb.resetAreaSize = function() {
  kb.setAreaSize(kb.orgH.h1, 0);
  kb.areaSize.orgDH = 0;
  kb.areaSize.dH = 0;
};
kb.setAreaSize = function(h1, dH) {
  $el('#list-area').style.height = h1 + 'px';
  var h2 = kb.contentHeightAdj + dH;
  $el('#content-area').style.height = 'calc(100vh - ' + h2 + 'px)';
};
kb.onAreaResizeEnd = function(e) {
  kb.enableTextSelect();
  document.body.style.cursor = 'default';
  kb.uiStatus = kb.UI_ST_NONE;
};

kb.copyContent = function() {
  if (kb.data && kb.data.content) {
    kb.copy(kb.data.content.BODY);
  }
};

kb.confirmSaveAsHtml = function() {
  var m = 'Save as HTML?\n<input type="checkbox" id="chk-export-color"><label for="chk-export-color">w/ color style</label>';
  util.confirm(m, kb.saveAsHtml);
}
kb.saveAsHtml = function() {
  var html = $el('#content-body').innerHTML;
  var body = util.encodeBase64(html);
  var fontSize = $el('#font-range').value;
  var fontFamily = $el('#font').value;
  var wColor = ($el('#chk-export-color').checked ? '1' : '0');
  param = {
    act: 'export_html',
    scm: kb.scm,
    id: kb.data.id,
    fontsize: fontSize,
    fontfamily: fontFamily,
    with_color: wColor,
    body: body
  };
  util.postSubmit('api.cgi', param);
};

kb.getUrl4Id = function(id) {
  var url = location.href;
  url = url.replace(/\?.*/, '') + '?';
  if (kb.scm != '') url += 'scm=' + kb.scm + '&';
  url += 'id=' + id;
  return url;
};

kb.showUrl = function() {
  var id = kb.data.id;
  var url = kb.getUrl4Id(id);
  kb.urlOfData = url;
  var m = '<span id="content-url" class="pseudo-link" onclick="kb.copyUrl();" data-tooltip="Click to copy">' + url + '</span>\n\n';
  if (kb.isSysAdmin && !kb.data.content.DATA_PRIVS) {
    var listTokens = '<div style="width:100%;text-align:left;line-height:1.8em;">';
    listTokens += 'Token: ';
    listTokens +=  '<span id="valid-until"></span>\n';
      var tokenKeys = [];
    if (kb.configInfo && kb.configInfo.token_keys) {
      tokenKeys = kb.configInfo.token_keys;
    }
    listTokens += '<div style="margin-left:16px;">';
    for (var i = 0; i < tokenKeys.length; i++) {
      var tokenKey = tokenKeys[i];
      listTokens += '<span class="pseudo-link" onclick="kb.applyToken(\'' + id + '\', \'' + tokenKey + '\')">' + tokenKey  + '</span>\n';
    }
    listTokens += '</div>';
    listTokens += '</div>';
    m += listTokens;
  }
  util.alert(m)
};

kb.copyUrl = function() {
  var url = $el('#content-url').innerText;
  kb.copy(url);
  kb.contntUrl = '';
};

kb.applyToken = function(id, tokenKey) {
  if (tokenKey == null) {
    $el('#content-url').innerText = kb.urlOfData;
    $el('#valid-until').innerText = '';
    return;
  }
  var now = Date.now();
  var validUntilTime = now + kb.configInfo.token_valid_sec * 1000;
  var validUntil = util.getDateTimeString(validUntilTime, '%YYYY-%MM-%DD %HH:%mm:%SS %Z');
  var srcToken = kb.scm + ':' + id + ':' + tokenKey + ':' + now;
  var token = util.encodeBSB64(srcToken, 0);
  token = encodeURIComponent(token);
  var url = kb.urlOfData + '&token=' + token;
  var until = 'Valid until ' + validUntil;
  until += '<span class="pseudo-link" style="margin-left:16px;" onclick="kb.applyToken(\'' + id + '\', null)">&lt;X&gt;</span>';
  $el('#content-url').innerText = url;
  $el('#valid-until').innerHTML = until;
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
  $el('#touch-button').disabled = true;
  kb.clear();
};
kb.onEndLoading = function() {
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
  kb.enableTouchButton();
};

kb.isListLoading = function() {
  return (kb.status & kb.ST_LIST_LOADING);
};

kb.drawContentBodyArea4Progress = function(msg) {
  $el('#content-body').innerHTML = '<span class="progdot">' + msg + '</span>';
};

kb.dlContent = function(id, idx) {
  if (id == undefined) id = kb.data.id;
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
  } else if (kb.status & kb.ST_PROP_EDITING) {
    kb.confirmSaveProps();
  }
};
kb.onKeyDownY = function(e) {
  if (kb.status & kb.ST_SAVE_CONFIRMING) {
    kb.closeDialog();
    kb.saveAndExit();
  } else if (kb.status & kb.ST_CANCEL_CONFIRMING) {
    kb.closeDialog();
    kb.cancel();
  } else if (kb.status & kb.ST_TOUCH_CONFIRMING) {
    kb.closeDialog();
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
  kb.updateSearchLabels();
}
kb.disableId = function() {
  $el('#id-txt').disabled = true;
};
kb.enableId = function() {
  $el('#id-txt').disabled = false;
};
kb.onInputQ = function(e) {
  if ($el('#q').value) {
    kb.disableId();
  } else {
    kb.enableId();
  }
  kb.updateSearchLabels();
};
kb.disableQ = function() {
  $el('#q').disabled = true;
};
kb.enableQ = function() {
  $el('#q').disabled = false;
};

kb.onInputSearch = function() {
  kb.onInputId();
  kb.onInputQ();
};
kb.clearKeywords = function() {
  $el('#id-txt').value = '';
  $el('#q').value = '';
  kb.onInputSearch();
  $el('#q').focus();
};

kb.updateSearchLabels = function() {
  $el('#id-label').removeClass('input-label-disable');
  if ($el('#id-txt').disabled) $el('#id-label').addClass('input-label-disable');
  $el('#keyqord-label').removeClass('input-label-disable');
  if ($el('#q').disabled) $el('#keyqord-label').addClass('input-label-disable');
};

kb.confirmLogout = function() {
  util.confirm('Logout?', kb.logout);
};
kb.logout = function() {
  websys.logout(kb.cbLogout);
};
kb.cbLogout = function() {
  var url = './';
  if (kb.scm != '') url += '?scm=' + kb.scm;
  location.href = url;
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
  if (kb.status & kb.ST_PROP_EDITING) {
    kb.onEditPropsEnd();
  }
  kb.closeToolsWindow();
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

kb.decodeBSB64 = function(t) {
  var m;
  try {
    var s = util.decodeBSB64(t, kb.bsb64.n);
    util.copy(s);
    m = 'Decoded';
  } catch(e) {
    m = '<span style="color:#f77;">DECODE ERROR</span>';
  }
  util.infotip.show(m, {pos: 'pointer'});
};

kb.keyHandlerD = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var el = $el('#content-body-edt');
    var st = el.selectionStart;
    var ed = el.selectionEnd;
  }
  var t = kb.extractSelectedText();
  if (!t) return;
  kb.decodeBSB64(t);
  if (kb.status & kb.ST_EDITING) {
    kb.selectText(el, st, ed);
  }
};
kb.keyHandlerE = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var el = $el('#content-body-edt');
    var st = el.selectionStart;
    var ed = el.selectionEnd;
  }
  var t = kb.extractSelectedText();
  if (!t) return;
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

kb.hasFlag = function(flgs, flag) {
  if (!flgs) return false;
  flag = flag.toLowerCase();
  flgs = flgs.toLowerCase().split('|');
  for (var i = 0; i < flgs.length; i++) {
    if (flgs[i] == flag) return true;
  }
  return false;
};

//-------------------------------------------------------------------------
kb.tools = {};

kb.tools.buildBsb64Html = function() {
  var html = '';
  html += '<div style="margin-bottom:8px;">';
  html += '<select id="encdec-mode" style="margin-right:8px;" onchange="kb.tools.onEncDecModeChange();">';
  html += '<option value="bsb64">BSB64</option>';
  html += '<option value="b64s">Base64s</option>';
  html += '</select>';
  html += '<b>Encoder/Decoder</b>';
  html += '<button style="margin-left:216px;" onclick="kb.tools.resetB64Input();">Reset</button>';
  html += '</div>';
  html += '<table>';
  html += '<tr style="height:28px;">';
  html += '<td>Input: </td>';
  html += '<td>';
  html += '<input type="text" id="b64-text-in" style="width:400px;">';
  html += '</td>';
  html += '<td>';

  html += '<span class="area-bsb64">';
  html += '<span style="margin-left:4px;">n=</span><select id="bsb64-n">';
  html += '<option value="0">0</option>';
  html += '<option value="1" selected>1</option>';
  html += '<option value="2">2</option>';
  html += '<option value="3">3</option>';
  html += '<option value="4">4</option>';
  html += '<option value="5">5</option>';
  html += '<option value="6">6</option>';
  html += '<option value="7">7</option>';
  html += '</select>';
  html += '</span>';

  html += '<span class="area-b64s">';
  html += '<span style="margin-left:4px;">Key:</span>';
  html += '<input type="password" id="b64s-key" style="width:150px;">';
  html += '<input type="checkbox" id="b64s-key-s" onchange="kb.tools.b64KeySecretChange();" checked>';
  html += '<label for="b64s-key-s">Hide</label>';
  html += '</span>';

  html += '</td>';
  html += '</tr>';
  html += '<tr>';
  html += '<td>&nbsp;</td>';
  html += '<td style="padding-top:8px;">';
  html += '<button onclick="kb.tools.encB64();">Encode</button>';
  html += '<button style="margin-left:8px;" onclick="kb.tools.decB64();">Decode</button>';
  html += '</td>';
  html += '</tr>';
  html += '<tr>';
  html += '<td>Output: </td>';
  html += '<td>';
  html += '<input type="text" id="b64-text-out" class="tools-output" style="width:400px;" readonly>';
  html += '</td>';
  html += '<td>';
  html += '<button class="small-button" style="margin-left:4px;" onclick="kb.tools.copy(\'b64-text-out\');">Copy</button>';
  html += '</td>';
  html += '</tr>';
  html += '</table>';
  return html;
};

kb.tools.onEncDecModeChange = function() {
  var mode = $el('#encdec-mode').value;
  if (mode == 'b64s') {
    $el('.area-bsb64').setStyle('display', 'none');
    $el('.area-b64s').setStyle('display', '');
  } else {
    $el('.area-bsb64').setStyle('display', '');
    $el('.area-b64s').setStyle('display', 'none');
  }
};

kb.tools.b64KeySecretChange = function() {
  var type = ($el('#b64s-key-s').checked ? 'password' : 'text');
  $el('#b64s-key').type = type;
};

kb.tools.encB64 = function() {
  kb.tools.encdecB64(true);
};

kb.tools.decB64 = function() {
  kb.tools.encdecB64(false);
};

kb.tools.encdecB64 = function(enc) {
  var s = $el('#b64-text-in').value;
  var mode = $el('#encdec-mode').value;
  if (mode == 'b64s') {
    var k = $el('#b64s-key').value;
    var f = (enc ? util.encodeBase64s : util.decodeBase64s);
  } else {
    k = $el('#bsb64-n').value;
    f = (enc ? util.encodeBSB64 : util.decodeBSB64);
  }
  try {
    var v = f(s, k);
    var clz = '';
  } catch (e) {
    v = 'ERROR';
  }
  $el('#b64-text-out').value = v;
  if (v == 'ERROR') {
    util.addClass('#b64-text-out', 'text-error');
  } else {
    util.removeClass('#b64-text-out', 'text-error');
  }
};

kb.tools.resetB64Input = function() {
  $el('#b64-text-in').value = '';
  $el('#b64-text-out').value = '';
};

kb.tools.buildPwGenHtml = function() {
  var html = '';
  html += '<div style="margin-top:32px;">';
  html += '<div style="margin-bottom:8px;"><b>Password Generator</b></div>';
  html += '<table>';
  html += '<tr>';
  html += '<td>';
  html += 'Chars:';
  html += '</td>';
  html += '<td>';
  html += '<input type="text" id="pwgen-chars" style="width:480px;" value="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789">';
  html += '<span style="margin-left:4px;">Length:</span><input type="text" id="pwgen-len" style="width:28px;" value="8">';
  html += '<button style="margin-left:4px;" onclick="kb.tools.genPw();">Generate</button>';
  html += '</td>';
  html += '</tr>';
  html += '<tr>';
  html += '<td>';
  html += 'Output:';
  html += '</td>';
  html += '<td>';
  html += '<input type="text" id="pwgen-out" class="tools-output" style="width:400px;" readonly>';
  html += '<button class="small-button" style="margin-left:4px;" onclick="kb.tools.copy(\'pwgen-out\');">Copy</button>';
  html += '</td>';
  html += '</tr>';
  html += '</table>';
  html += '</div>';
  return html;
};

kb.tools.genPw = function() {
  var chars = $el('#pwgen-chars').value;
  var len = $el('#pwgen-len').value | 0;
  var s = '';
  if (len > 0) s = util.randomString(chars, len);
  $el('#pwgen-out').value = s;
};

kb.tools.copy = function(id) {
  var v = $el('#' + id).value;
  if (v) {
    util.copy(v);
    kb.showInfotip('Copied.');
  }
};

kb.openNewWindow = function() {
  window.open(location.href);
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
