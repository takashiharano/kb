/*!
 * Knowledge Base System
 * Copyright (c) 2021 Takashi Harano
 */
var kb = kb || {};
kb.ST_LIST_LOADING = 1;
kb.ST_DATA_LOADING = 1 << 1;
kb.ST_NEW = 1 << 2;
kb.ST_EDITING = 1 << 3;
kb.ST_EXIT = 1 << 4;

kb.UI_ST_NONE = 0;
kb.UI_ST_AREA_RESIZING = 1;

kb.LIST_COLUMNS = [
  {key: 'id', label: 'ID'},
  {key: 'TITLE', label: 'TITLE'},
  {key: 'C_DATE', label: 'CREATED'},
  {key: 'C_USER', label: 'BY'},
  {key: 'U_DATE', label: 'UPDATED'},
  {key: 'U_USER', label: 'BY'},
  {key: 'STATUS', label: 'STATUS'},
  {key: 'LABELS', label: 'LABELS'},
  {key: 'score', label: 'SCORE'},
  {key: 'encrypted', label: ''}
];
kb.onselectstart = document.onselectstart;

kb.status = 0;
kb.uiStatus = kb.UI_ST_NONE;
kb.listStatus = {
  sortIdx: 4,
  sortType: 2
};
kb.stateList = [];
kb.tokens = [];
kb.itemList= [];
kb.totalCount = 0;
kb.pendingId = null;
kb.content;
kb.contentUrl = '';

kb.areaSize = {
  orgY: 0,
  orgSP1: 0,
  orgSP2: 0
};

$onReady = function() {
  $el('#chk-plain-text').addEventListener('change', kb.onPlainTextChange);
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
  if (!id) $el('#q').focus();
};

kb.init = function() {
  kb.clearContent();
  util.addCtrlKeyHandler('S', kb.onCtrlS);
  util.addCtrlKeyHandler('Q', kb.onCtrlQ);
  $el('#id-txt').addEventListener('input', kb.onInputId);
  $el('#q').addEventListener('input', kb.onInputQ);
  util.textarea.addStatusInfo('#content-body-edt', '#content-body-st');
  $el('#adjuster').addEventListener('mousedown', kb.onAreaResizeStart);

  kb.onEditEnd();

  window.addEventListener('keydown', kb.onKeyDown);
  window.addEventListener('mousemove', kb.onMouseMove, true);
  window.addEventListener('mouseup', kb.onMouseUp, true);

  kb.getInitInfo();
};

kb.getInitInfo = function() {
  kb.callApi('get_init_info', null, kb.onGetInitInfo);
};
kb.onGetInitInfo = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError();
    return;
  }
  if (res.status == 'FORBIDDEN') {
    kb.onForbidden();
    return;
  } else if (res.status != 'OK') {
    kb.onApiError(res);
    return;
  }
  kb.onAppReady();
  var info = res.body;
  kb.tokens = info.tokens;
  var stateList = info.state_list;
  kb.stateList = stateList;
  util.addSelectOption('#select-status', '');
  for (var i = 0; i < stateList.length; i++) {
    var state = stateList[i];
    util.addSelectOption('#select-status', state.name);
  }
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
  kb.onStartListLoading();
  kb.callApi('list', param, kb.onGetList);

  kb.drawInfo('<span class="progdot">Loading</span>');
  kb.drawListContent('');
};
kb.onGetList = function(xhr, res, req) {
  kb.onEndListLoading();
  if (xhr.status != 200) {
    kb.onHttpError();
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

kb.drawList = function(items, sortIdx, sortType, totalCount) {
  if (sortIdx >= 0) {
    if (sortType > 0) {
      var sortKey = kb.LIST_COLUMNS[sortIdx].key;
      var desc = (sortType == 2);
      items = util.copyObject(items);
      var asNum = true;
      items = util.sortObject(items, sortKey, desc, asNum);
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
    var encrypted = '';
    if (data.encrypted) {
      encrypted = '<span data-tooltip="Encrypted">&#x1F512;</span>';
    }
    var labelsHTML = kb.buildLabelsHTML(labels);
    htmlList += '<tr class="data-list-row">';
    htmlList += '<td style="padding-right:16px;">' + id + '</td>'
    htmlList += '<td style="min-width:300px;max-width:600px;padding-right:32px;overflow:hidden;text-overflow:ellipsis;">';
    if (data_status == 'OK') {
      htmlList += '<span class="title  pseudo-link" onclick="kb.openData(\'' + id + '\');"';
    } else {
      htmlList += '<span class="title-disabled"';
    }
    if (util.lenW(title) > 76) {
      var escTitle = util.escHtml(title);
      htmlList += ' data-tooltip="' + escTitle + '"';
    }
    htmlList += '>';
    htmlList += title + '</span></td>';
    htmlList += '<td style="padding-right:8px;">' + cDateStr + '</td>';
    htmlList += '<td style="padding-right:16px;">' + cUser + '</td>';
    htmlList += '<td style="padding-right:8px;">' + uDateStr + '</td>';
    htmlList += '<td style="padding-right:16px;">' + uUser + '</td>';

    htmlList += '<td>' + statusLabel + '</td>';
    htmlList += '<td style="padding-left:20px;">' + labelsHTML + '</td>';
    htmlList += '<td>' + score + '</td>';
    htmlList += '<td style="text-align:center;">' + encrypted + '</td>';

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
  if ((kb.config.list_max > 0) && (kb.totalCount > kb.config.list_max)) {
    infoHtml += ' (' + kb.totalCount + ' in total)';
  }

  kb.drawInfo(infoHtml);
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
  var html = '<table id="list-table" class="list-table item-list">';
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
  if (!kb.isLoading()) {
    kb.listStatus.sortIdx = 4;
    kb.listStatus.sortType = 2;
    kb.getList();
  }
};

kb.search = function() {
  if (kb.isLoading()) {
    return;
  }

  kb._clear();
  var q = $el('#q').value.trim();
  var id = $el('#id-txt').value.trim();
  if (id != '') {
    kb.showDataById(id);
  } else if (q) {
    if (q.match(/^label:[^\s]+?$/) || q.match(/^status:[^\s]+?$/) || q.match(/^updated..:[^\s]+?$/)) {
      kb.listStatus.sortIdx = 4;
    } else if (q.match(/^created..:[^\s]+?$/)) {
      kb.listStatus.sortIdx = 2;
    } else {
      kb.listStatus.sortIdx = 8;
    }
    kb.listStatus.sortType = 2;
    var param = {q: util.encodeBase64(q)};
    kb.onStartListLoading();
    kb.callApi('search', param, kb.onGetList);
  } else {
    kb.listAll();
  }
};

kb.showDataById = function(id) {
  if (!kb.isLoading()) {
    $el('#content-body').innerHTML = '<span class="progdot">Loading</span>';
    kb.getList(id);
    kb.getData(id);
  }
};

kb.categorySearch = function(category, label) {
  $el('#id-txt').value = '';
  kb.onInputId();
  $el('#q').value = category + ':' + label;
  kb.onInputQ();
  kb.search();
};

kb.openData = function(id) {
  if (!kb.isLoading()) {
    kb.getData(id);
  }
};

kb.getData = function(id) {
  kb.pendingId = id;
  if (kb.status & kb.ST_EDITING) {
    util.confirm('Cancel?', kb.cancelAndGetData, kb.cancelAndGetDataN, {focus: 'no'});
    return;
  }
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
    kb.onHttpError();
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
  var id = data.id;
  var data_status = data.data_status;
  var cDate = data.C_DATE;
  var uDate = data.U_DATE;
  var b64Title = ((data.TITLE == undefined) ? '' : data.TITLE);
  var b64Labels = data.LABELS;
  var status = data.STATUS;
  var b64Body = data.BODY;

  var title = util.decodeBase64(b64Title);
  var labels = util.decodeBase64(b64Labels);
  var body = util.decodeBase64(b64Body);

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
  for (var i = 0; i < kb.stateList.length; i++) {
    var state = kb.stateList[i];
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

  $el('#content-id-edt').value = kb.content.id;
  $el('#content-title-edt').value = kb.content.TITLE;
  $el('#content-body-edt').value = kb.content.BODY;
  $el('#content-labels-edt').value = kb.content.LABELS;
  $el('#chk-encryption').checked = kb.content.encrypted;
};

kb.onEditEnd = function() {
  kb.status &= ~kb.ST_EDITING;
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

kb.save = function() {
  kb.status |= kb.ST_EXIT;
  util.confirm('Save?', kb._save);
};
kb._save = function() {
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

  if (kb.status & kb.ST_EXIT) {
    kb.onEditEnd();
  }

  var data = {
    encryption: encryption,
    org_u_date: orgUdate,
    TITLE: b64Title,
    LABELS: b64Labels,
    STATUS: status,
    BODY: b64Body
  };

  var j = util.toJSON(data);
  var param = {
    id: id,
    data: j
  };
  kb.callApi('save', param, kb.onSaveData);
};
kb.onSaveData = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError();
    return;
  }
  if (res.status == 'OK') {
    if (kb.status & kb.ST_EXIT) {
      var id = res.body.saved_id;
      kb.listStatus.sortIdx = 4;
      kb.listStatus.sortType = 2;
      kb.search();
      kb.getData(id);
      kb.status &= ~kb.ST_EXIT;
    }
    kb.showInfotip('OK');
  } else if (res.status == 'CONFLICT') {
    var data = res.body;
    var dt = util.getDateTimeString(+data.U_DATE);
    var msg = 'DATE: ' + dt + '\n';
    msg += 'BY: ' + data.U_USER;
    util.alert('Conflict!', msg);
  } else {
    log.e(res.status + ':' + res.body);
  }
};

kb.checkExists = function(id) {
  var param = {id: id};
  kb.callApi('check_exists', param, kb.onCheckExists);
};
kb.onCheckExists = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError();
    return;
  }
  if (res.status == 'OK') {
    var exists = res.body;
    if (exists) {
      kb.showInfotip('ALREADY_EXISTS');
    } else {
      kb.status &= ~kb.ST_NEW
      kb._save();
    }
  } else {
    log.e(res.status + ':' + res.body);
  }
};

kb.cancel = function() {
  util.confirm('Cancel?', kb._cancel, {focus: 'no'});
};
kb._cancel = function() {
  kb.onEditEnd();
};

kb.showData = function(content) {
  var id = content.id;
  var cDate = content.C_DATE;
  var uDate = content.U_DATE;
  var title = content.TITLE;
  var labels = content.LABELS;
  var status = content.STATUS;

  var cDateStr = '';
  var uDateStr = '';
  if (cDate != undefined) cDateStr = kb.getDateTimeString(+cDate);
  if (uDate != undefined) uDateStr = kb.getDateTimeString(+uDate);
  var labelsHTML = kb.buildLabelsHTML(labels);

  var contentBody = content.BODY;
  contentBody = util.escHtml(contentBody);

  if (!$el('#chk-plain-text').checked) {
    contentBody = contentBody.replace(/&quot;/g, '"');
    contentBody = util.linkUrls(contentBody);
    contentBody = kb.decodeB64Image(contentBody);
  }

  var idLabel = '';
  if (id != '') idLabel = id + ':';
  $el('#content-id').innerHTML = idLabel;
  $el('#content-title').innerHTML = util.escHtml(title);
  $el('#content-body').innerHTML = contentBody;
  $el('#content-labels').innerHTML = labelsHTML;
  $el('#select-status').value = status;

  if (content.data_status == 'EMPTY') {
    $el('#content-created-date').innerHTML = '';
    $el('#content-created-by').innerHTML = '';
    $el('#content-updated-date').innerHTML = '';
    $el('#content-updated-by').innerHTML = '';
  } else {
    $el('#content-created-date').innerHTML = 'CREATED: ' + cDateStr;
    $el('#content-created-by').innerHTML = 'by ' + content.C_USER;
    $el('#content-updated-date').innerHTML = 'UPDATED: ' + uDateStr;
    $el('#content-updated-by').innerHTML = 'by ' + content.U_USER;
  }

  $el('#content-wrp').scrollTop = 0
  if (id) {
    $el('.for-view').show();
  } else {
    $el('.for-view').hide();
  }
};

kb.decodeB64Image = function(s) {
  var imgs = [];
  var m = s.match(/(data:image\/.+;base64,)\n?([^\n][A-za-z0-9+\-/=\n]+?)\n\n/g);
  if (m) {
    for (var i = 0; i < m.length; i++) {
      var w = m[i];
      w = w.replace(/\n/g, '');
      imgs.push(w);
    }
  }
  for (i = 0; i < imgs.length; i++) {
    s = s.replace(/[^"]data:image\/.+;base64,\n?[^\n][A-za-z0-9+\-/=\n]+?\n\n/, '\n<img src="' + imgs[i] + '">\n\n');
  }
  return s;
};

kb.onPlainTextChange = function() {
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
    kb.onHttpError();
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
  var url = location.href;
  url = url.replace(/\?.*/, '');
  url += '?id=' + kb.content.id;
  kb.contentUrl = url;
  var m = '<span id="content-url">' + url + '</span>';
  m += '<button style="margin-left:16px;" onclick="kb.copyUrl();">COPY</button>\n\n';
  var listTokens = '<div style="width:100%;text-align:left;">';
  listTokens += 'Token:\n';
  for (var i = 0; i < kb.tokens.length; i++) {
    var token = kb.tokens[i];
    listTokens += '<button style="margin-right:8px;" onclick="kb.applyToken(\'' + token + '\')">SELECT</button>' + token + '\n';
  }
  listTokens += '</div>';
  m += listTokens;
  util.alert(m)
};

kb.copyUrl = function() {
  var url = $el('#content-url').innerText;
  kb.copy(url);
  kb.contntUrl = '';
};

kb.applyToken = function(token) {
  url = kb.contentUrl + '&token=' + token;
  $el('#content-url').innerText = url;
};

kb.copy = function(s) {
  util.copy(s);
  kb.showInfotip('Copied');
};

kb.showInfotip = function(m, d) {
  util.infotip.show(m, d);
};

kb.getDateTimeString = function(dt, fmt) {
  if (!fmt) fmt = '%YYYY-%MM-%DD %HH:%mm:%SS';
  return util.getDateTimeString(dt, fmt);
};

kb.onStartListLoading = function() {
  kb.status |= kb.ST_LIST_LOADING;
  kb.onStartLoading();
};
kb.onEndListLoading = function() {
  kb.status &= ~kb.ST_LIST_LOADING;
  kb.onEndLoading();
};

kb.onStartDataLoading = function() {
  kb.status |= kb.ST_DATA_LOADING;
  kb.onStartLoading();
};
kb.onEndDataLoading = function() {
  kb.status &= ~kb.ST_DATA_LOADING;
  kb.onEndLoading();
};

kb.onStartLoading = function() {
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
};
kb.onEndLoading = function() {
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
};

kb.isLoading = function() {
  return ((kb.state & kb.ST_LIST_LOADING) || (kb.state & kb.ST_DATA_LOADING));
};

kb.onCtrlS = function(e) {
  e.preventDefault();
  if (kb.status & kb.ST_EDITING) kb.save();
};
kb.onCtrlQ = function(e) {
  e.preventDefault();
  if (kb.status & kb.ST_EDITING) kb.cancel();
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
  $el('#id-label').addClass('input-disable');
};
kb.enableId = function() {
  $el('#id-txt').disabled = false;
  $el('#id-label').removeClass('input-disable');
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
  $el('#keyqord-label').addClass('input-disable');
};
kb.enableQ = function() {
  $el('#q').disabled = false;
  $el('#keyqord-label').removeClass('input-disable');
};

kb.onKeyDown = function(e) {
  if (e.keyCode == 13) {
    if ($el('.q-txt').hasFocus()) {
      if (!kb.isLoading()) {
        kb.search();
      }
    }
  }
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

kb.view = {};
kb.view.init = function() {
  $el('.for-view').hide();
  var id = util.getQuery('id');
  kb.getData(id);
};

kb.view.onNoRights = function() {
  var msg = 'ERROR: NO_ACCESS_RIGHTS\n\n';
  msg += 'You do not have permission to access.\n';
  msg += 'Please contact the administrator and get your token.';
  $el('#content-body').textseq(msg, {cursor: 3});
};
