/*!
 * Knowledge Base System
 * Copyright (c) 2021 Takashi Harano
 */
var kb = {};
kb.ST_NEW = 1;
kb.ST_EDITING = 1 << 1;
kb.ST_EXIT = 1 << 2;
kb.DATE_FORMAT = '%YYYY-%MM-%DD %HH:%mm:%SS';
kb.LIST_COLUMNS = [
  {key: 'id', label: 'ID'},
  {key: 'TITLE', label: 'TITLE'},
  {key: 'C_DATE', label: 'CREATED'},
  {key: 'C_USER', label: 'BY'},
  {key: 'U_DATE', label: 'UPDATED'},
  {key: 'U_USER', label: 'BY'},
  {key: 'status', label: 'STATUS'},
  {key: 'LABELS', label: 'LABELS'},
  {key: 'score', label: 'SCORE'}
];

kb.ready = false;
kb.status = 0;
kb.listStatus = {
  sortIdx: 4,
  sortType: 2
};
kb.itemList= [];
kb.pendingId = null;
kb.content;

$onReady = function() {
  kb.clearContent();
  util.addCtrlKeyHandler('S', kb.onCtrlS);
  util.addCtrlKeyHandler('Q', kb.onCtrlQ);
  $el('#q').addEventListener('keydown', kb.onKeyDownOnQ);

  util.textarea.addStatusInfo('#content-body-edt', '#content-body-st');

  kb.onEditEnd();
  kb.setFontSize(12);
  util.clock('#clock');

  var q = util.getQuery('id');
  if (q) {
    $el('#q').value = 'id:' + q;
    kb.search();
    kb.getData(q);
  } else {
    kb.getList();
  }
};

kb.onAppReady = function() {
  $el('#body1').style.display = 'block';
  $el('#q').focus();
  kb.ready = true;
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

kb.getList = function() {
  kb.callApi('list', null, kb.onGetList);
};
kb.onGetList = function(xhr, res, req) {
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
  if (!kb.ready) kb.onAppReady();
  kb.itemList = res.body.data_list;
  kb.drawList(kb.itemList, kb.listStatus.sortIdx, kb.listStatus.sortType);
};

kb.drawList = function(items, sortIdx, sortType) {
  if (sortIdx >= 0) {
    if (sortType > 0) {
      var sortKey = kb.LIST_COLUMNS[sortIdx].key;
      var desc = (sortType == 2);
      items = util.copyObject(items);
      items = util.sortObject(items, sortKey, desc);
    }
  }

  var dateFormat = '%YYYY-%MM-%DD %HH:%mm:%SS';

  var htmlList = '';
  for (i = 0; i < items.length; i++) {
    data = items[i];
    var id = data.id;
    var status = data.status;
    var b64Title = ((data.TITLE == undefined) ? '' : data.TITLE);
    var b64Labels = data.LABELS;
    var cDate = data.C_DATE;
    var uDate = data.U_DATE;
    var score = (data.score == undefined ? '' : data.score);
    var cDateStr = '';
    var uDateStr = '';
    if ((cDate == undefined) || (cDate == '')) {
      cDateStr = '---------- --:--:--';
    } else {
      cDateStr = util.getDateTimeString(+cDate, kb.DATE_FORMAT);
    }
    if ((uDate == undefined) || (uDate == '')) {
      uDateStr = '---------- --:--:--';
    } else {
      uDateStr = util.getDateTimeString(+uDate, kb.DATE_FORMAT);
    }
    var title = util.decodeBase64(b64Title);
    if (!title) {
      title = '&lt;NO TITLE&gt;';
    }
    var labels = util.decodeBase64(b64Labels);
    var statusLabel = '';
    if (status == 'OK') {
      statusLabel = '<span class="status-label-ok">OK</span>';
      if (data.encrypted == 'true') {
        statusLabel += ' <span class="status-label-encrypted">ENCRYPTED</span>';
      }
    } else {
      statusLabel = '<span class="status-label-err">' + status + '</span>';
    }
    var labelsHTML = kb.buildLabelsHTML(labels);
    htmlList += '<tr class="data-list-row">';
    htmlList += '<td style="padding-right:16px;">' + id + '</td>'
    htmlList += '<td style="min-width:300px;"><span class="pseudo-link" onclick="kb.getData(\'' + id + '\');">' + title + '</span></td>';
    htmlList += '<td style="padding-right:8px;">' + cDateStr + '</td>';
    htmlList += '<td style="padding-right:16px;">' + data.C_USER + '</td>';
    htmlList += '<td style="padding-right:8px;">' + uDateStr + '</td>';
    htmlList += '<td style="padding-right:16px;">' + data.U_USER + '</td>';

    htmlList += '<td>' + statusLabel + '</td>';
    htmlList += '<td style="padding-left:20px;">' + labelsHTML + '</td>';
    htmlList += '<td>' + score + '</td>';
    htmlList += '</tr>';
  }
  htmlList += '</table>';

  var htmlHead = kb.buildListHeader(kb.LIST_COLUMNS, sortIdx, sortType);

  var html = htmlHead + htmlList; 
  $el('#list').innerHTML = html;

  var infoHtml = items.length + ' ' + util.plural('item', items.length);
  $el('#info').innerHTML = infoHtml;

  util.infotip.show('OK');
};

kb.sortItemList = function(sortIdx, sortType) {
  if (sortType > 2) {
    sortType = 0;
  }
  kb.listStatus.sortIdx = sortIdx;
  kb.listStatus.sortType = sortType;
  kb.drawList(kb.itemList, sortIdx, sortType);
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

  html += '</tr>';
  return html;
};

kb.getListAll = function() {
  kb._clear();
  $el('#q').value = '';
  kb.getList();
};

kb.search = function() {
  kb._clear();
  var q = $el('#q').value.trim();
  if (q) {
    kb.listStatus.sortIdx = 8;
    kb.listStatus.sortType = 2;
    var param = {q: util.encodeBase64(q)};
    kb.callApi('search', param, kb.onGetList);
  } else {
    kb.listStatus.sortIdx = 4;
    kb.listStatus.sortType = 2;
    kb.getList();
  }
};

kb.labelSearch = function(label) {
  $el('#q').value = 'label:' + label;
  kb.search();
};

kb.getData = function(id) {
  kb.pendingId = id;
  if (kb.status & kb.ST_EDITING) {
    util.confirm('Cancel?', kb.cancelAndGetData, kb.cancelAndGetDataN);
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
  kb.callApi('get', param, kb.onGetData);
};
kb.onGetData = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError();
    return;
  }
  if (res.status == 'FORBIDDEN') {
    kb.onForbidden();
    return;
  }

  var data = res.body;
  var id = data.id;
  var status = data.status;
  var cDate = data.C_DATE;
  var uDate = data.U_DATE;
  var b64Title = ((data.TITLE == undefined) ? '' : data.TITLE);
  var b64Labels = data.LABELS;
  var b64Body = data.BODY;

  var title = util.decodeBase64(b64Title);
  var labels = util.decodeBase64(b64Labels);
  var body = util.decodeBase64(b64Body);

  kb.content = {
    id: id,
    status: status,
    C_DATE: cDate,
    U_DATE: uDate,
    TITLE: title,
    LABELS: labels,
    BODY: body
  };

  if (status == 'OK') {
    kb.showData(kb.content);
  } else {
    kb._clear();
    util.infotip.show(status);
  }
};

kb.buildLabelsHTML = function(labels) {
  var labelList = [];
  if (labels) {
    labelList = labels.replace(/\s{2,}/g, ' ').split(' ');
  }
  var html = '';
  for (var i = 0; i < labelList.length; i++) {
    var label = util.escHtml(labelList[i]);
    html += '<span class="label" onclick="kb.labelSearch(\'' + label + '\');">' + label + '</span>';
  }
  return html;
};

kb.createNew = function() {
  kb.status |= kb.ST_NEW;
  kb._clear();
  kb.edit();
  $el('#content-title-edt').focus();
};

kb.edit = function() {
  kb.status |= kb.ST_EDITING;

  $el('#new-button').disabled = true;
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  $el('#clear-button').disabled = true;
  $el('#edit-button').disable();
  $el('#delete-button').hide();
  $el('#save-button').show();
  $el('#cancel-button').show();

  $el('#content-body').hide();
  $el('#content-body-edt-wrp').show();

  //$el('#id-label').hide();
  //$el('#id-edit').show();

  $el('#title-label').hide();
  $el('#title-edit').show();

  $el('#labels-label').hide();
  $el('#labels-edit').show();

  $el('#content-id-edt').value = kb.content.id;
  $el('#content-title-edt').value = kb.content.TITLE;
  $el('#content-body-edt').value = kb.content.BODY;
  $el('#content-labels-edt').value = kb.content.LABELS;
};

kb.onEditEnd = function() {
  kb.status &= ~kb.ST_EDITING;
  kb.status &= ~kb.ST_NEW;

  $el('#content-body').show();

  //$el('#id-label').show();
  $el('#id-edit').hide();
  $el('#content-id-edt').value = '';

  $el('#title-label').show();
  $el('#title-edit').hide();
  $el('#content-title-edt').value = '';

  $el('#content-body-edt-wrp').hide();
  $el('#content-body-edt').value = '';

  $el('#labels-label').show();
  $el('#labels-edit').hide();
  $el('#content-labels-edt').value = '';

  $el('#new-button').disabled = false;
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
  $el('#clear-button').disabled = false;

  if (kb.content) kb.showData(kb.content);

  if (kb.content.id) {
    $el('#edit-button').enable();
    $el('#delete-button').show();
  } else {
    $el('#edit-button').disable();
    $el('#delete-button').hide();
  }

  $el('#save-button').hide();
  $el('#cancel-button').hide();
};

kb.save = function() {
  kb.status |= kb.ST_EXIT;
  util.confirm('Save?', kb._save);
};
kb._save = function() {
  var id = $el('#content-id-edt').value.trim();
  if (kb.status & kb.ST_NEW) {
    if (id != '') {
      kb.checkExists(id);
      return;
    } else {
      kb.status &= ~kb.ST_NEW;
    }
  }

  var title = $el('#content-title-edt').value;
  var body = $el('#content-body-edt').value;
  var labels = $el('#content-labels-edt').value;
  labels = util.convertNewLine(labels, ' ');
  labels = labels.replace(/\s{2,}/g, ' ');

  if (!title) {
    util.infotip.show('Title is required', 3000);
    $el('#content-title-edt').focus();
    return;
  }

  kb.content.id = id;
  kb.content.TITLE = title;
  kb.content.BODY = body;
  kb.content.LABELS = labels;

  var b64Title = util.encodeBase64(title);
  var b64Labels = util.encodeBase64(labels);
  var b64Body = util.encodeBase64(body);

  if (kb.status & kb.ST_EXIT) {
    kb.onEditEnd();
  }

  var data = {
    TITLE: b64Title,
    LABELS: b64Labels,
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
      var id = res.body;
      kb.getList ();
      kb.getData(id);
      kb.status &= ~kb.ST_EXIT;
    } else {
      util.infotip.show('OK');
    }
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
      util.infotip.show('ALREADY_EXISTS');
    } else {
      kb.status &= ~kb.ST_NEW
      kb._save();
    }
  } else {
    log.e(res.status + ':' + res.body);
  }
};

kb.cancel = function() {
  util.confirm('Cancel?', kb._cancel);
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

  var cDateStr = '';
  var uDateStr = '';
  if (cDate != undefined) cDateStr = util.getDateTimeString(+cDate, kb.DATE_FORMAT);
  if (uDate != undefined) uDateStr = util.getDateTimeString(+uDate, kb.DATE_FORMAT);
  var contentBody = content.BODY;
  contentBody = util.escHtml(contentBody);
  contentBody = util.linkUrls(contentBody);
  var labelsHTML = kb.buildLabelsHTML(labels);

  var idLabel = '';
  if (id != '') idLabel = id + ':';
  $el('#content-id').innerHTML = idLabel;
  $el('#content-title').innerHTML = util.escHtml(title);
  $el('#content-body').innerHTML = contentBody;
  $el('#content-labels').innerHTML = labelsHTML;
  $el('#content-wrp').scrollTop = 0
  if (id) {
    $el('#edit-button').enable();
    $el('#delete-button').show();
  } else {
    $el('#edit-button').disable();
    $el('#delete-button').hide();
  }
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
    C_DATE: '',
    U_DATE: '',
    TITLE: '',
    LABELS: '',
    BODY: ''
  };
};

kb.delete = function() {
  util.confirm('Delete?', kb._delete);
};
kb._delete = function() {
  var id = kb.content.id;
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
    util.infotip.show('OK');
    kb.getList ();
  } else {
    util.infotip.show(res.status);
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
  util.infotip.show(m);
};
kb.onApiError = function(res) {
  var m = res.status;
  if (res.body) m += ': ' + res.body;
  log.e(m);
  util.infotip.show(m);
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

kb.onCtrlS = function(e) {
  e.preventDefault();
  if (kb.status & kb.ST_EDITING) kb.save();
};
kb.onCtrlQ = function(e) {
  e.preventDefault();
  if (kb.status & kb.ST_EDITING) kb.cancel();
};

kb.onKeyDownOnQ = function(e) {
  if (e.keyCode == 13) {
    kb.search();
  }
};

kb.http = function(req, cb) {
  req.cb = cb;
  websys.http(req);
};
kb.onForbidden = function() {
  websys.authRedirection(location.href);
};
websys.init('../../');
