/*!
 * Knowledge Base System
 * Copyright (c) 2021 Takashi Harano
 */
var kb = {};
kb.ST_NEW = 1;
kb.ST_EDITING = 1 << 1;
kb.ST_EXIT = 1 << 2;
kb.UI_ST_NONE = 0;
kb.UI_ST_AREA_RESIZING = 1;
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
kb.onselectstart = document.onselectstart;

kb.ready = false;
kb.status = 0;
kb.uiStatus = kb.UI_ST_NONE;
kb.listStatus = {
  sortIdx: 4,
  sortType: 2
};
kb.itemList= [];
kb.pendingId = null;
kb.content;

kb.areaSize = {
  orgY: 0,
  orgSP1: 0,
  orgSP2: 0
};

$onReady = function() {
  kb.clearContent();
  util.addCtrlKeyHandler('S', kb.onCtrlS);
  util.addCtrlKeyHandler('Q', kb.onCtrlQ);
  $el('#q').addEventListener('keydown', kb.onKeyDownOnQ);
  $el('#chk-raw-text').addEventListener('change', kb.onRawTextChange);
  util.textarea.addStatusInfo('#content-body-edt', '#content-body-st');
  $el('#adjuster').addEventListener('mousedown', kb.onAreaResizeStart);

  kb.onEditEnd();
  kb.setFontSize(12);
  util.clock('#clock');

  window.addEventListener('mousemove', kb.onMouseMove, true);
  window.addEventListener('mouseup', kb.onMouseUp, true);

  var q = util.getQuery('q');
  var id = util.getQuery('id');
  if (id) {
    $el('#q').value = 'id:' + id;
    kb.search();
    kb.getData(id);
  } else if (q) {
    q = decodeURIComponent(q);
    $el('#q').value = q;
    kb.search();
  } else {
    kb.getList();
  }
};

kb.onAppReady = function() {
  $el('#body1').style.display = 'block';
  var q = util.getQuery('id');
  if (!q) $el('#q').focus();
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
      var asNum = true;
      items = util.sortObject(items, sortKey, desc, asNum);
    }
  }

  var htmlList = '';
  for (var i = 0; i < items.length; i++) {
    var data = items[i];
    var id = data.id;
    var status = data.status;
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
      if (data.encrypted) {
        statusLabel += ' <span class="status-label-encrypted">ENCRYPTED</span>';
      }
    } else {
      statusLabel = '<span class="status-label-err">' + status + '</span>';
    }
    var labelsHTML = kb.buildLabelsHTML(labels);
    htmlList += '<tr class="data-list-row">';
    htmlList += '<td style="padding-right:16px;">' + id + '</td>'
    htmlList += '<td style="min-width:300px;max-width:600px;padding-right:32px;overflow:hidden;text-overflow:ellipsis;">';
    if (status == 'OK') {
      htmlList += '<span class="title  pseudo-link" onclick="kb.getData(\'' + id + '\');"';
    } else {
      htmlList += '<span class="title-disabled"';
    }
    if (title.length > 40) {
      htmlList += ' data-tooltip="' + title + '"';
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
    if (status != 'OK') {
      htmlList += '<td class="center"><span class="pseudo-link text-red" data-tooltip="Delete" onclick="kb.delete(\'' + id + '\');">X</span></td>';
    }
    htmlList += '</tr>';
  }
  htmlList += '</table>';

  var htmlHead = kb.buildListHeader(kb.LIST_COLUMNS, sortIdx, sortType);

  var html = htmlHead + htmlList; 
  $el('#list').innerHTML = html;
  $el('#list-wrp').scrollTop = 0;

  var infoHtml = items.length + ' ' + util.plural('item', items.length);
  $el('#info').innerHTML = infoHtml;

  kb.showInfotip('OK');
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
  html += '<th class="item-list" style="width:3em;"><span>&nbsp;</span></th>';

  html += '</tr>';
  return html;
};

kb.getListAll = function() {
  location.href = './';
};
kb.listAll = function() {
  kb.listStatus.sortIdx = 4;
  kb.listStatus.sortType = 2;
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
    kb.listAll();
  }
};

kb.labelSearch = function(label) {
  $el('#q').value = 'label:' + label;
  kb.search();
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
    encrypted: data.encrypted,
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
    kb.showInfotip(status);
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
  $el('#buttons-r').hide();
  $el('#buttons-w').show();

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
    $el('#edit-button').enable();
    $el('#buttons-r').show();
  } else {
    $el('#edit-button').disable();
    $el('#buttons-r').hide();
  }

  $el('#buttons-w').hide();
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

  var encryption = ($el('#chk-encryption').checked ? '1' : '0');
  var title = $el('#content-title-edt').value;
  var body = $el('#content-body-edt').value;
  var labels = $el('#content-labels-edt').value;
  labels = util.convertNewLine(labels, ' ');
  labels = labels.replace(/\s{2,}/g, ' ');

  if (!title) {
    kb.showInfotip('Title is required', 3000);
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
    encryption: encryption,
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
      kb.listStatus.sortIdx = 4;
      kb.listStatus.sortType = 2;
      kb.getList ();
      kb.getData(id);
      kb.status &= ~kb.ST_EXIT;
    } else {
      kb.showInfotip('OK');
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

  var cDateStr = '';
  var uDateStr = '';
  if (cDate != undefined) cDateStr = util.getDateTimeString(+cDate, kb.DATE_FORMAT);
  if (uDate != undefined) uDateStr = util.getDateTimeString(+uDate, kb.DATE_FORMAT);
  var labelsHTML = kb.buildLabelsHTML(labels);

  var contentBody = content.BODY;
  contentBody = util.escHtml(contentBody);

  if (!$el('#chk-raw-text').checked) {
    contentBody = util.linkUrls(contentBody);
    contentBody = kb.decodeB64Image(contentBody);
  }

  var idLabel = '';
  if (id != '') idLabel = id + ':';
  $el('#content-id').innerHTML = idLabel;
  $el('#content-title').innerHTML = util.escHtml(title);
  $el('#content-body').innerHTML = contentBody;
  $el('#content-labels').innerHTML = labelsHTML;
  $el('#content-wrp').scrollTop = 0
  if (id) {
    $el('#edit-button').enable();
    $el('#buttons-r').show();
  } else {
    $el('#edit-button').disable();
    $el('#buttons-r').hide();
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

kb.onRawTextChange = function() {
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
    C_DATE: '',
    U_DATE: '',
    TITLE: '',
    LABELS: '',
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
  kb.copy(kb.content.BODY);
};

kb.copyUrl = function() {
  var url = location.href;
  url = url.replace(/\?.*/, '');
  url += '?id=' + kb.content.id;
  var m = url + ' <button onclick="kb.copy(\'' + url + '\');">COPY</button>';
  util.alert(m)
};

kb.copy = function(s) {
  util.copy(s);
  kb.showInfotip('Copied');
};

kb.showInfotip = function(m, d) {
  util.infotip.show(m, d);
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
websys.init('../../');
