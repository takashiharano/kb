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
kb.ST_LOGIC_EDITING = 1 << 12;

kb.UI_ST_NONE = 0;
kb.UI_ST_AREA_RESIZING = 1;

kb.DEFAULT_FONT_SIZE = 14;

kb.LIST_COLUMNS = [
  {key: 'id', label: 'ID', meta: true},
  {key: 'category', label: '&nbsp;', align: 'c', sort: false},
  {key: 'TITLE', label: 'TITLE'},
  {key: 'PASSWORD', label: '', align: 'c'},
  {key: 'C_DATE', label: 'CREATED'},
  {key: 'C_USER', label: 'BY'},
  {key: 'U_DATE', label: 'UPDATED'},
  {key: 'U_USER', label: 'BY'},
  {key: 'ASSIGNEE', label: 'ASSIGNEE'},
  {key: 'STATUS', label: 'STATUS'},
  {key: 'LABELS', label: 'LABELS'},
  {key: 'score', label: 'SCORE', align: 'r', meta: true},
  {key: 'size', label: 'SIZE', align: 'r', meta: true},
  {key: 'PRIVS', label: 'PRIVS', forAdmin: true},
  {key: 'LOGIC', label: '&nbsp;'},
  {key: 'DATA_TYPE', label: 'DL', align: 'c'},
  {key: 'encrypted', label: '&nbsp;', meta: true}
];

kb.ANONYMOUS_USER_NAME = 'Anonymous';

kb.onselectstart = document.onselectstart;

kb.status = 0;
kb.uiStatus = kb.UI_ST_NONE;
kb.listStatus = {
  sortKey: 'U_DATE',
  sortOrder: 2
};
kb.configInfo = null;
kb.fixedDataList = [];
kb.dataList = [];
kb.totalCount = 0;
kb.elapsed = 0;
kb.pendingId = null;
kb.scm = '';
kb.scmProps = null;
kb.data = null;
kb.pw = {
  toView: null,
  toSave: null
};
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
kb.mode = kb.mode || null;
kb.toolsWindow = null;
kb.logicEditorWindow = null;
kb.scmList = [];
kb.activeScmIdx = 0;
kb.activeScmId = null;
kb.savingLogic = '';

$onReady = function(e) {
  $el('#draw-mode').addEventListener('change', kb.onDrawModeChange);
  var fontSize = util.getQuery('fontsize') | 0;
  if (!fontSize) fontSize = kb.DEFAULT_FONT_SIZE;
  kb.setFontSize(fontSize);
  util.clock('#clock');
  if (kb.mode == 'view') {
    kb.view.init();
    kb.onAppReady();
  } else {
    $el('#content-header').hide();
    kb.init();
  }
  util.addKeyHandler('D', 'down', kb.keyHandlerD, {ctrl: true, alt: true});
  util.addKeyHandler('E', 'down', kb.keyHandlerE, {ctrl: true, alt: true});
  util.addKeyHandler('L', 'down', kb.keyHandlerL, {ctrl: false, alt: true});
  util.addKeyHandler('P', 'down', kb.keyHandlerP);
  util.addKeyHandler('S', 'down', kb.keyHandlerS, {ctrl: false, alt: true});
  util.addKeyHandler('T', 'down', kb.keyHandlerT, {ctrl: false, alt: true});
  util.addKeyHandler('W', 'down', kb.keyHandlerW, {ctrl: false, alt: true});
  util.addKeyHandler(9, 'down', kb.keyHandlerTab);
  util.addKeyHandler(38, 'down', kb.keyHandlerUp);
  util.addKeyHandler(40, 'down', kb.keyHandlerDn);
  dbg.x.addCmdTbl(kb.cmd.CMD_TBL);
  kb.historyBuf = new util.RingBuffer(kb.HISTORY_MAX);
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
  if (id) {
    kb.listAndShowDataById(id);
  } else if (q) {
    q = decodeURIComponent(q);
    $el('#q').value = q;
    kb.search();
  } else {
    var limit = kb.getLimit();
    kb.getDataList(null, null, limit);
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
  var v1 = v.slice(0, cp);
  var v2 = v.slice(cp);

  var p = data.indexOf(',');
  if (p == -1) {
    el.value = v1 + data + v2;
    return;
  }

  p++;
  var h = data.slice(0, p);
  var d = data.slice(p);
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

kb.getDataList = function(id, reload, limit, inclHidden) {
  var param = {
    scm: kb.scm
  };
  if (id != undefined) {
    param.id = id;
  }
  if (reload) param.reload = '1';
  if (limit != undefined) param.limit = limit;
  if (inclHidden) param.include_hidden = '1';
  kb.onStartListLoading('Loading');
  kb.callApi('data_list', param, kb.onGetList);
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
  kb.fixedDataList = (data.fixed_data_list ? data.fixed_data_list : []);
  kb.dataList = data.data_list;
  kb.totalCount = data.total_count;
  kb.elapsed = data.elapsed;

  var allDataSize = data.all_data_size;
  var scmDataSize = data.scm_data_size;
  if ((allDataSize != undefined) && (scmDataSize != undefined)) {
    var aSize = util.convByte(allDataSize);
    var cSize = util.convByte(scmDataSize)
    $el('#all-data-size').innerHTML = 'Current DB size: scm=' + cSize + 'B / all=' + aSize + 'B';
  }

  kb.drawDataList(kb.fixedDataList, kb.dataList, kb.listStatus.sortKey, kb.listStatus.sortOrder, kb.totalCount, kb.elapsed);
  if (kb.dataList.length == 1) {
    $el('#id-txt').value = '';
    kb.onInputSearch()
  }
};

kb.drawInfo = function(html) {
  $el('#info').innerHTML = html;
};

kb.drawDataListContent = function(html) {
  $el('#list').innerHTML = html;
  $el('#list-wrp').scrollTop = 0;
};

kb.toSortIndex = function(k) {
  var idx = -1;
  for (var i = 0; i < kb.LIST_COLUMNS.length; i++) {
    if (kb.LIST_COLUMNS[i].key == k) {
      idx = i;
      break;
    }
  }
  return idx;
};

kb.sortList = function(dataList, sortKey, desc, byMetaCol) {
  var items = util.copyObject(dataList);
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
  var sortedList = util.sortObjectList(srcList, sortKey, desc, asNum);
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

kb.drawDataList = function(fixedItems, items, sortKey, sortOrder, totalCount, elapsed) {
  var sortIdx = kb.toSortIndex(sortKey);
  if (sortIdx >= 0) {
    if (sortOrder > 0) {
      var srtDef = kb.LIST_COLUMNS[sortIdx];
      var desc = (sortOrder == 2);
      items = kb.sortList(items, srtDef.key, desc, srtDef.meta);
    }
  }

  var htmlList = '';
  var cnt = 0;
  for (var i = 0; i < fixedItems.length; i++) {
    var data = fixedItems[i];
    htmlList += kb.buildDataListRow(data, true, ++cnt);
  }
  for (var i = 0; i < items.length; i++) {
    data = items[i];
    htmlList += kb.buildDataListRow(data, false, ++cnt);
  }
  htmlList += '</table>';

  var htmlHead = kb.buildListHeader(sortIdx, sortOrder);
  var html = htmlHead + htmlList; 
  kb.drawDataListContent(html);

  var n = fixedItems.length + items.length;
  var infoHtml = n + ' ' + util.plural('item', n);

  var limit = kb.getLimit();
  if (limit == null) {
    limit = kb.config.list_max;
  }
  if ((limit > 0) && (totalCount > limit)) {
    infoHtml += ' (' + totalCount + ' in total)';
  }
  var ms = Math.floor(elapsed * 1000);
  var t = util.ms2time(ms);
  infoHtml += '<span style="margin-left:16px;">' + t + '</span>';

  kb.drawInfo(infoHtml);

  if (kb.data && kb.data.id != '') {
    kb.highlightSelectedRow(kb.data.id);
  }
};

kb.buildDataListRow = function(data, fixed, cnt) {
  var currentUserName = kb.getUserName();
  var id = data.id;
  var data_status = data.status;
  var content = data.content || {};

  var status = content.STATUS;
  var title = ((content.TITLE == undefined) ? '' : content.TITLE);
  var labels = content.LABELS;
  var cDate = content.C_DATE;
  var uDate = content.U_DATE;
  var score = (data.score == undefined ? '' : data.score);

  var cDateStr = kb.toDateTimeString(cDate);
  var cUser = (content.C_USER ? content.C_USER : '');
  var cUserLabel = cUser;
  if (cUser == kb.ANONYMOUS_USER_NAME) {
    cUserLabel = '<span class="text-muted">' + cUserLabel + '</span>';
  }
  var cUserLink = '';
  if (cUser) {
    cUserLink = '<span class="pseudo-link" onclick="kb.fieldSearch(\'created_by\', \'' + cUser + '\');">' + cUserLabel + '</span>';
  }

  var uDateStr = kb.toDateTimeString(uDate);
  var uUser = (content.U_USER ? content.U_USER : '');
  var uUserLabel = uUser;
  if (uUser == kb.ANONYMOUS_USER_NAME) {
    uUserLabel = '<span class="text-muted">' + uUserLabel + '</span>';
  }
  var uUserLink = '';
  if (uUser) {
    uUserLink = '<span class="pseudo-link" onclick="kb.fieldSearch(\'updated_by\', \'' + uUser + '\');">' + uUserLabel + '</span>';
  }

  var assignee = (content.ASSIGNEE ? content.ASSIGNEE : '');
  var assigneeLink = '';
  if (assignee) {
    if (assignee.toLowerCase() == currentUserName.toLowerCase()) assigneeLink = '<span style="color:#d66;cursor:default;" data-tooltip2="You">*</span>'
    assigneeLink += '<span class="pseudo-link" onclick="kb.fieldSearch(\'assignee\', \'' + assignee + '\');">' + assignee + '</span>';
  }

  var dataPrivs = content.PRIVS || '';

  if (!title) {
    title = '&lt;NO TITLE&gt;';
  }
  var statusLabel = '';
  if (data_status == 'OK') {
    statusLabel = kb.buildStatusHTML(status);
  } else {
    statusLabel = '<span class="status-label-err">' + data_status + '</span>';
  }
  var size = (data.size == undefined ? '' : util.formatNumber(data.size));
  var hasLogic = '';
  if (content.LOGIC) {
    hasLogic = '<span data-tooltip="Logic">&lt;/&gt;</span>';
  }
  var isPwReq = '';
  if (content.PASSWORD) {
    isPwReq = '&#x1F512;';
    isPwReq = '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAYhJREFUOE+dkj1IA0EQhd9sUupZ2Xu3OWwVS1PERhQvp4XpYylaq51JJ9aKpfax0MuBYKOClqKt3E+0TmWwTHZkYwLJeZHgwLLszptvZ2eGkGJR5OQBOgIw23O/AXwgpf+YlFPyIgzdRSLuC5s9/7TemSmfy3lPgzEpAOeaiFyAt4X4utBipSbKAJ0xs5fL+esjAUGwagiR/SSiV8vy5geFcey+MPOcUu0p275p9X1DGQSBUxCC7pTiqm37lUFAEDgVIehQiIxpmlfvvwBh6K4IwfvMKBDhPq24fR8RKqZZf9CabgZR5J4AvJMWNPqOTqX0dqnZdCdbLW7pVzsdro4DyWToUGdjGGTQX/8eBevXQyleGgloNDZmlOo0NCRZuLEAP7UpdtslZd1I68ifGeiAOHaP9W5Z3t6/AGHoXOvA5PQNfeHjY81qt0UE4ELK+lbipYI+27Y/NBdRVDwHUM5mlezNQfESwDIRnsdpIzMWANxKWd/sAuLYLTFzCYBe41iNiGqW5dW+AQ941btDhiwFAAAAAElFTkSuQmCC" style="width:14px;margin-right:8px;">';
  }
  var encrypted = '';
  if (data.encrypted) {
    encrypted = '<span data-tooltip="Encrypted">*</span>';
  }
  var dlLink = '';
  if (content.DATA_TYPE == 'dataurl') {
    dlLink = '<span class="dl-link" onclick="kb.dlContent(\'' + id + '\');" data-tooltip="Download">&#x1F517;</span>';
  }
  var labelsHTML = kb.buildItemsHTML('label', labels);
  var privsHTML = kb.buildItemsHTML('priv', dataPrivs);
  var rowClass = ((cnt % 2 == 0) ? 'row-even' : 'row-odd');

  var chkBox = '<input type="checkbox" onchange="kb.checkItem(\'' + id + '\', this)"';
  if (kb.checkedIds.includes(id)) chkBox += ' checked';
  chkBox += '>';

  var idLabel = (fixed ? '<span style="color:#888;cursor:default;" data-tooltip2="Fixed">*</span>' : '') + id;
  var catLabel = kb.getCategory(labels);
  var titleLabel = '';
  if (data_status == 'OK') {
    titleLabel += '<span style="display:inline-block;width:100%;overflow:hidden;text-overflow:ellipsis;" class="title pseudo-link" onclick="kb.onClickTitle(\'' + id + '\');">';
  } else {
    titleLabel += '<span class="title-disabled">';
  }
  titleLabel += '<span';
  if (util.lenW(title) > 76) {
    var escTitle = util.escHtml(title);
    titleLabel += ' data-tooltip="' + escTitle + '"';
  }
  titleLabel += '>' + title + '</span>';
  titleLabel += '</span>';

  var html = '<tr id="row-' + id + '" class="data-list-row text-muted ' + rowClass + '">';
  html += '<td>' + chkBox + '</td>';
  html += '<td style="text-align:right;padding-right:8px;">' + idLabel + '</td>';
  html += '<td style="padding-right:4px;text-align:center;">' + catLabel + '</td>';
  html += '<td style="min-width:300px;max-width:550px;">' + titleLabel + '</td>';
  html += '<td style="text-align:center;width:16px;cursor:default;">' + isPwReq + '</td>';
  html += '<td style="width:145px;padding-right:0.5em;">' + cDateStr + '</td>';
  html += '<td style="padding-right:16px;">' + cUserLink + '</td>';
  html += '<td style="width:145px;padding-right:0.5em;">' + uDateStr + '</td>';
  html += '<td style="padding-right:16px;">' + uUserLink + '</td>';
  html += '<td style="padding-right:8px;">' + assigneeLink + '</td>';
  html += '<td style="padding-right:0.5em;">' + statusLabel + '</td>';
  html += '<td>' + labelsHTML + '</td>';
  html += '<td style="text-align:right;padding-left:0.5em;padding-right:0.5em;">' + score + '</td>';
  html += '<td style="text-align:right;padding-left:0.5em;padding-right:0.5em;">' + size + '</td>';
  if (kb.LIST_COLUMNS[kb.toSortIndex('PRIVS')].forAdmin && kb.isSysAdmin) html += '<td>' + privsHTML + '</td>';
  html += '<td style="text-align:center;cursor:default;">' + hasLogic + '</td>';
  html += '<td style="padding-right:16px;text-align:center;">' + dlLink + '</td>';
  html += '<td style="text-align:center;width:16px;cursor:default;">' + encrypted + '</td>';

  if (data_status != 'OK') {
    html += '<td class="center"><span class="pseudo-link text-red" data-tooltip="Delete" onclick="kb.delete(\'' + id + '\');">X</span></td>';
  }
  html += '</tr>';
  return html;
};

kb.sortDataList = function(sortKey, sortOrder) {
  if (sortOrder > 2) {
    sortOrder = 0;
  }
  kb.listStatus.sortKey = sortKey;
  kb.listStatus.sortOrder = sortOrder;
  kb.drawDataList(kb.fixedDataList, kb.dataList, sortKey, sortOrder, kb.totalCount, kb.elapsed);
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
kb.buildListHeader = function(sortIdx, sortOrder) {
  var columns = kb.LIST_COLUMNS;
  var html = '<table id="list-table" class="item list-table item-list">';
  html += '<tr class="item-list">';

  html += '<th class="item-list">&nbsp;</th>';
  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    if (column.forAdmin && !kb.isSysAdmin) {
      continue;
    }
    var key = column['key'];
    var label = column['label'];

    var clz = '';
    if (column.align == 'c') {
      clz = 'text-center';
    } else if (column.align == 'r') {
      clz = 'text-right';
    }
    if (clz) clz = ' ' + clz;

    var head = label;
    if (column.sort !== false) {
      var sortButton = kb.buildSortButton(key, i, sortIdx, sortOrder);
      head = '<span class="colum-header" onclick="kb.sortDataList(\'' + key + '\', ' + sortButton.nextSortType + ');">' + label + '</span> ' + sortButton.button;
    }

    html += '<th class="item-list' + clz + '">' + head + '</th>';
  }
  html += '<th class="item-list" style="width:3em;"><span>&nbsp;</span></th>';

  html += '</tr>';
  return html;
};

kb.buildSortButton = function(key, idx, sortIdx, sortOrder) {
  var sortAscClz = '';
  var sortDescClz = '';
  var nextSortType = 1;
  if (idx == sortIdx) {
    if (sortOrder == 1) {
      sortAscClz = 'sort-active';
    } else if (sortOrder == 2) {
      sortDescClz = 'sort-active';
    }
    nextSortType = sortOrder + 1;
  }

  var sortButton = '<span class="sort-button" ';
  sortButton += ' onclick="kb.sortDataList(\'' + key + '\', ' + nextSortType + ');"';
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
  return {button: sortButton, nextSortType: nextSortType};
};

kb.getDataListAll = function() {
  var url = './';
  if (kb.scm != '') url = kb.appendQuery(url, 'scm=' + kb.scm);
  var limit = kb.getLimit();
  history.replaceState(null, '', url);
  $el('#q').value = '';
  $el('#id-txt').value = '';
  kb.onInputSearch()
  kb.resetAreaSize();
  kb.checkedIds = [];
  kb.listAll(false, limit);
  $el('#q').focus();
};
kb.listAll = function(reload, limit, inclHidden) {
  if (!kb.isListLoading()) {
    kb.listStatus.sortKey = 'U_DATE';
    kb.listStatus.sortOrder = 2;
    kb.getDataList(null, reload, limit, inclHidden);
  }
};

kb.appendQuery = function(q, p) {
  if (q.match(/\?/)) {
    q += '&' + p;
  } else {
    q += '?' + p;
  }
  return q;
};

kb.getLimit = function() {
  var pLimit = $el('#limit').value.trim();
  var limit = (((pLimit == '') || (isNaN(pLimit))) ? null : (pLimit | 0));
  return limit;
};

kb.search = function(reload) {
  if (kb.isListLoading()) {
    return;
  }
  kb._clear();
  var q = $el('#q').value.trim();
  var limit = kb.getLimit();
  var id = $el('#id-txt').value.trim();
  if (id != '') {
    id = util.toHalfWidth(id);
    if (id.match(/[ ,-]/)) {
      kb.searchByIds(id, reload, limit);
    } else {
      kb.listAndShowDataById(id);
    }
  } else if (q) {
    if (q == '!') {
      kb.listAll(reload, limit, true);
    } else {
      kb.searchByKeyword(q, reload, limit);
    }
    saveHistory(q);
  } else {
    kb.listAll(reload, limit);
  }
};
kb.searchByIds = function(ids, reload, limit) {
  var q = 'id:';
  ids = util.toSingleSP(ids);
  ids = ids.replace(/\s/g, ',');
  ids = ids.split(',');
  for (var i = 0; i < ids.length; i++) {
    if (i > 0) q += ',';
    q += ids[i];
  }
  kb.searchByKeyword(q, reload, limit);
};
kb.searchByKeyword = function(q, reload, limit) {
  if (q.match(/^label:[^\s]+?$/) || q.match(/^status:[^\s]+?$/) || q.match(/^updated_..:.+?$/) || q.match(/^assignee:.+?$/)) {
    kb.listStatus.sortKey = 'U_DATE';
  } else if (q.match(/^created_..:.+?$/)) {
    kb.listStatus.sortKey = 'C_DATE';
  } else {
    kb.listStatus.sortKey = 'score';
  }
  kb.listStatus.sortOrder = 2;
  var param = {
    scm: kb.scm,
    q: util.encodeBase64(q)
  };
  if (reload) param.reload = '1';
  if (limit != undefined) param.limit = limit;
  kb.onStartListLoading('Searching');
  kb.callApi('search', param, kb.onSearchCb);
};
kb.onSearchCb = function(xhr, res, req) {
  kb.onGetList(xhr, res, req);
  var index = parseInt(util.getQuery('index'));
  if (!isNaN(index)) {
    var items = kb.sortList(kb.dataList, 'score', true, true);
    var item = items[index];
    if (item) {
      var id = item.id;
      kb.openData(id);
    }
  }
};

kb.listAndShowDataById = function(id) {
  id = id.replace(/!$/, '');
  kb.getDataList(id);
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
  var d = kb._getMetaData(id, kb.dataList);
  if (d) return d;
  d = kb._getMetaData(id, kb.fixedDataList);
  if (d) return d;
  return null;
};
kb._getMetaData = function(id, dataList) {
  for (var i = 0; i < dataList.length; i++) {
    var item = dataList[i];
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

kb.getData = function(id, reload) {
  kb.pendingId = id;
  if (kb.status & kb.ST_EDITING) {
    util.confirm('Cancel?', kb.cancelAndGetData, kb.cancelAndGetDataN, {focus: 'no'});
    return;
  }
  kb.status &= ~kb.ST_CONFLICTING;
  kb._getData(reload);
};
kb.cancelAndGetData = function() {
  kb._cancel();
  kb._getData();
};
kb.cancelAndGetDataN = function() {
  kb.pendingKey = null;
};

kb.clearPwValue = function() {
  kb.pw = {
    toView: null,
    toSave: null
  };
};

kb._getData = function(reload) {
  var id = kb.pendingId;
  if (id == null) return;
  kb.pendingId = null;
  kb.requestedId = id;
  if (!reload) {
    kb.clearPwValue();
  }
  var param = {
    scm: kb.scm,
    id: id
  };
  if (kb.token) {
    param.token = kb.token;
  }
  if (reload) {
    param.reload = '1';
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
    var m = ((data_status == 'DATA_FORBIDDEN') ? 'Permission denied' : data_status);
    kb._clear();
    kb.showInfotip(m);
    return;
  }

  kb.data = {};
  kb.data = util.copyObject(data, kb.data);

  var content = data.content;
  if (content) {
    var title = ((content.TITLE == undefined) ? '' : content.TITLE);
    var labels = content.LABELS;
    var b64Body = content.BODY;
    var body = util.decodeBase64(b64Body);
    kb.data.content.TITLE = title;
    kb.data.content.LABELS = labels;
    kb.data.content.LOGIC = (content.LOGIC ? util.decodeBase64(content.LOGIC) : '');
    kb.data.content.BODY = body;
  }

  if (kb.hasFieldValue(content, 'PASSWORD') && !kb.pw.toView) {
    kb.openPasswordInputDialog();
  } else {
    kb.showReceivedData();
  }
  kb.enableButtons4View();
};
kb.showReceivedData = function() {
  kb.drawData(kb.data);
  $el('#content-header').show();
  $el('.for-view').show();
};

kb.openPasswordInputDialog = function() {
  var opt = {
    secure: true,
    closeAnywhere: true,
    onenter: kb.onPwEnter,
    onclose: kb.onPwClose
  };
  util.dialog.text('Enter password', kb.showDataWithPassword, kb.showDataWithPasswordC, opt);
};
kb.showDataWithPassword = function(pw) {
  var pw0 = kb.data.content.PASSWORD;
  var pw1 = kb.getHash(pw);
  if (pw0 != pw1) {
    setTimeout(kb.openPasswordInputDialog, 0);
    return;
  }
  kb.pw.toView = pw;
  kb.pw.toSave = pw;
  kb.showReceivedData();
};
kb.showDataWithPasswordC = function() {
  kb.onPwMismatched();
};
kb.onPwEnter = function(pw) {
  kb.showDataWithPassword(pw);
};
kb.onPwClose = function(pw) {
  kb.showDataWithPasswordC();
};
kb.onPwMismatched = function() {
  kb.data.content.BODY = '';
  kb.showReceivedData();
  kb.disableButtons4View();
  if (kb.isAdmin) $el('#props-button').disabled = false;
};
kb.disableButtons4View = function() {
  kb.switchButtons4View(true);
};
kb.enableButtons4View = function() {
  kb.switchButtons4View(false);
};
kb.switchButtons4View = function(f) {
  var ids = ['edit-button', 'edit-labels-button', 'exec-logic-button', 'props-button', 'copy-text-button', 'save-html-button', 'dup-button'];
  for (var i = 0; i < ids.length; i++) {
    $el('#' + ids[i]).disabled = f;
  }
};

kb.getHash = function(src) {
  var SALT = 'kb';
  var shaObj = new jsSHA('SHA-256', 'TEXT');
  shaObj.update(src);
  shaObj.update(SALT);
  var hash = shaObj.getHash('HEX');
  return hash;
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

  var stColor = (st.color ? st.color : '#ccc');
  html = '<span class="status"';
  html += ' style="';
  html += 'color:' + stColor + ';';
  html += 'border: 1px solid ' + stColor + ';';
  html += '"';
  if (kb.mode != 'view') {
    html += ' onclick="kb.fieldSearch(\'status\', \'' + status + '\');"';
  }
  html += '>';
  html += status;
  html += '</span>';
  return html;
};

kb.getCategory = function(labels) {
  var catLabel = '';
  var cat = kb._getCategory(labels);
  if (!cat) return catLabel;
  var name = cat.name;
  var alt = cat.alt;
  if (cat.image) {
    var imgPath = 'res/' + cat.image;
    catLabel = '<img src="' + imgPath + '" class="cat-img"';
    if (name) catLabel += 'data-tooltip-1500="' + name + '"';
    catLabel += '>';
  } else {
    catLabel = kb.buildCategoryHTML(name, cat.color, alt)
  }
  return catLabel;
};

kb._getCategory = function(labels) {
  var cat = null;
  if (!labels) return cat;
  var labelList = labels.replace(/\s{2,}/g, ' ').split(' ');
  var label = labelList[0];
  var macted;
  for (var i = 0; i < kb.categories.length; i++) {
    var category = kb.categories[i];
    var catLabels = category.labels.replace(/\s/g, '');
    if (catLabels.includes('||')) {
      matched = kb.matchLabelsOr(catLabels, label);
    } else if (catLabels.includes('&&')) {
      matched = kb.matchLabelsAnd(catLabels, labelList);
    } else {
      matched = (catLabels == label);
    }
    if (matched) {
      cat = category;
      break;
    }
  }
  return cat;
};

kb.matchLabelsOr = function(labels, label) {
  var a = labels.split('||');
  for (var i = 0; i < a.length; i++) {
    if (a[i] == label) return true;
  }
  return false;
};

kb.matchLabelsAnd = function(labels, labelList) {
  var a = labels.split('&&');
  for (var i = 0; i < a.length; i++) {
    if (a[i] != labelList[i]) return false;
  }
  return true;
};

kb.buildCategoryHTML = function(name, color, alt) {
  var stColor = (color ? color : '#ccc');
  var html = '<span class="category"';
  html += ' style="';
  html += 'color:' + stColor + ';';
  html += 'border: 1px solid ' + stColor + ';';
  html += 'cursor:default;';
  html += '"';
  if (alt) html += 'data-tooltip-1500="' + alt + '"';
  html += '>';
  html += name;
  html += '</span>';
  return html;
};

kb.buildItemsHTML = function(keyname, items, snipN, snipL) {
  if (snipN == undefined) snipN = 0;
  if (snipL == undefined) snipL = 3;
  var dataList = [];
  if (items) {
    dataList = items.replace(/\s{2,}/g, ' ').split(' ');
  }
  var clickable = (kb.mode != 'view');
  var html = '';
  for (var i = 0; i < dataList.length; i++) {
    var item = util.escHtml(dataList[i]);
    var snip = ((snipN > 0) && (i >= snipN));
    html += kb.createLabel(keyname, item, snip, snipL, clickable);
  }
  return html;
};
kb.createLabel = function(keyname, text, snip, snipL, clickable) {
  var dispLabel = (snip ? dispLabel = util.snip(text, snipL, 0) : text);
  var html = '<span class="label"';
  if (clickable) {
    html += ' onclick="kb.fieldSearch(\'' + keyname + '\', \'' + text + '\');"';
    if (snip) html += ' data-tooltip="' + text + '"';
  }
  html += '>' + dispLabel + '</span>';
  return html;
};

kb.createNew = function() {
  kb.status |= kb.ST_NEW;
  $el('#content-header').show();
  kb.clearPwValue();
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
  $el('#set-pw-button').disabled = true;
  $el('#chk-encryption').disabled = true;
  $el('#chk-silent').checked = true;
  $el('#edit-logic-button').disabled = true;
  $el('#content-labels-edt').focus();
};

kb.edit = function() {
  kb.status |= kb.ST_EDITING;

  $el('#id-txt').disabled = true;
  $el('#q').disabled = true;
  $el('#limit').disabled = true;
  kb.updateSearchLabels();

  $el('#new-button').disabled = true;
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  $el('#touch-button').disabled = true;
  $el('#schema-button').disabled = true;
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
  $el('#set-pw-button').disabled = false;
  $el('#chk-encryption').disabled = false;
  $el('#chk-silent').disabled = false;
  $el('#edit-logic-button').disabled = ((kb.status & kb.ST_NEW) ? true : false);
  $el('#preview-mode').checked = false;

  var data = kb.data;
  var content = data.content;

  $el('#content-title-edt').value = content.TITLE;
  $el('#content-body-edt').value = content.BODY;
  $el('#content-labels-edt').value = content.LABELS;
  $el('#chk-encryption').checked = data.encrypted;
  $el('#chk-silent').checked = false;

  var pw = kb.pw.toView;
  kb.pw.toSave = pw;
  kb.drawPwStatus(pw);
};

kb.onEditEnd = function() {
  kb.status &= ~kb.ST_EDITING;
  kb.status &= ~kb.ST_EDIT_ONLY_LABELS;
  kb.status &= ~kb.ST_NEW;
  kb.data_bak = null;
  kb.pw.toSave = null;

  kb.closeLogicEditorWindow();

  $el('#content-body').show();

  $el('#info-label').show();
  $el('#info-edit').hide();
  $el('#content-title-edt').value = '';

  $el('#content-body-edt-wrp').hide();
  $el('#content-body-edt').value = '';

  $el('#content-labels-edt').value = '';

  $el('#id-txt').disabled = false;
  $el('#q').disabled = false;
  $el('#limit').disabled = false;
  kb.onInputSearch()

  $el('#new-button').disabled = false;
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
  $el('#clear-button').disabled = false;
  $el('#schema-button').disabled = false;
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
  kb.saveData();
};

kb.saveData = function() {
  kb.status &= ~kb.ST_SAVE_CONFIRMING;
  var id = kb.data.id;
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
  var logic = kb.data.content.LOGIC;

  if (!title) {
    kb.showInfotip('Title is required', 3000);
    $el('#content-title-edt').focus();
    return;
  }

  var hash = '';
  if (kb.pw.toSave) {
    hash = kb.getHash(kb.pw.toSave);
  }
  kb.data.content.PASSWORD = hash;
  if (kb.pw.toSave != null) {
    kb.pw.toView = kb.pw.toSave;
  }

  kb.data.id = id;
  kb.data.content.TITLE = title;
  kb.data.content.BODY = body;
  kb.data.content.LABELS = labels;
  kb.data.content.STATUS = status;

  var b64Logic = util.encodeBase64(logic);
  var b64Body = util.encodeBase64(body);

  var only_labels;
  var content = {};
  if (kb.status & kb.ST_EDIT_ONLY_LABELS) {
    only_labels = true;
    content.LABELS = labels;
  } else {
    only_labels = false;
    content.TITLE = title;
    content.LABELS = labels;
    content.STATUS = status;
    content.ASSIGNEE = assignee;
    content.FLAGS = kb.data.content.FLAGS;
    content.PASSWORD = kb.data.content.PASSWORD;
    content.LOGIC = b64Logic;
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
  kb.callApi('save_data', param, kb.onSaveData);

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
    var id = savedData.saved_id;
    if (kb.status & kb.ST_EXIT) {
      kb.reloadListAndData(id);
      kb.status &= ~kb.ST_EXIT;
    }
    kb.data.id = id;
    kb.data.content.U_DATE = savedData.U_DATE;
    $el('#edit-logic-button').disabled = false;
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
      kb.search(true);
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
  kb.listStatus.sortKey = 'U_DATE';
  kb.listStatus.sortOrder = 2;
  kb.search(true);
  kb.getData(id, true);
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
      kb.saveData();
    }
  } else {
    log.e(res.status + ':' + res.body);
  }
};

kb.confirmCancel = function() {
  var title = $el('#content-title-edt').value;
  var body = $el('#content-body-edt').value;
  var labels = $el('#content-labels-edt').value;
  if (!title && !body && !labels) {
    kb.cancel();
  } else {
    kb.status |= kb.ST_CANCEL_CONFIRMING;
    util.confirm('Cancel?', kb.cancel, kb.cancelCancel, {focus: 'no'});
  }
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

  var cDateStr = kb.toDateTimeString(cDate);
  var uDateStr = kb.toDateTimeString(uDate);
  var labelsHTML = kb.buildItemsHTML('label', labels, 3, 3);

  var drawMode = $el('#draw-mode').value;
  contentBody = kb.getContentForView(contentBody, drawMode);

  var idLabel = '';
  if (id != '') idLabel = '<span class="pseudo-link" onclick="kb.showData(\'' + id + '\');" data-tooltip2="Reload">' + id + '</span>:';
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

  $el('#exec-logic-button').disabled = (content.LOGIC ? false : true);

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

  setTimeout(kb.postDrawData, 0);
};

kb.getContentForView = function(s, mode) {
  if (mode != '2') {
    s = util.escHtml(s);
  }
  if (mode == '1') {
    s = s.replace(/&quot;/g, '"');
    s = util.linkUrls(s);

    var w = kb.linkDataUrl(s, false, -1);
    s = w.s;
    if (w.i == -1) w.i = 0;
    w = kb.linkDataUrl(s, true, w.i);
    s = w.s;
    s = kb.decodeB64Image(s);

    s = kb.linkBsb64Data(s);
    s = kb.linkB64sData(s);
    s = kb.linkCopy(s);
    s = kb.linkKB(s);

    s = s.replace(/^(\s*)(#.*)/g, '$1<span class="comment">$2</span>');
    s = s.replace(/(\n)(\s*)(#.*)/g, '$1$2<span class="comment">$3</span>');

    s = s.replace(/(?<!\\)```([\s\S]+?)(?<!\\)```/g, '<pre class="code">$1</pre>');
    s = s.replace(/(?<!\\)`(.+?)(?<!\\)`/g, '<span class="code-s">$1</span>');
    s = s.replace(/\\`/g, '`');

    s = s.replace(/(?<!\\)\*\*([\s\S]+?)(?<!\\)\*\*/g, '<b>$1</b>');
    s = s.replace(/\\(\*)/g, '$1');
  }
  return s;
};

kb.postDrawData = function(id) {
  var els = $el('.imgdata');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var r = el.getBoundingClientRect();
    el.rect = r;
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
    s = s.replace(/data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+/, '<img src="' + w + '" class="imgdata">');
    return s;
  }
  m = s.match(/data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+\n\n/g);
  if (!m) {
    s = s.replace(/(data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+)$/, '<img src="$1" class="imgdata">');
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
    s = s.replace(/(?<!")data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+\n\n/, '\n<img src="' + imgs[i] + '" class="imgdata">\n\n');
  }
  s = s.replace(/(data:image\/.+;base64,\n?[A-za-z0-9+/=][A-za-z0-9+/=\n]+)$/, '<img src="$1" class="imgdata">');
  return s;
};

kb.linkBsb64Data = function(s) {
  var t = '<span class="pseudo-link link" onclick="kb.openBSB64Dialog(\'$2\', 0);" data-tooltip2="Click to decode">$2</span>';
  s = s.replace(/(bsb64:)([A-Za-z0-9+/=$]+)/g, t);
  return s;
};

kb.linkB64sData = function(s) {
  var t = '<span class="pseudo-link link" onclick="kb.openB64sDialog(\'$2\');" data-tooltip2="Click to decode">$2</span>';
  s = s.replace(/(b64:)([A-Za-z0-9+/=$]+)/g, t);
  return s;
};

kb.linkCopy = function(s) {
  var w = s.match(/&lt;copy&gt;(.+?)&lt;\/copy&gt;/g);
  if (!w) return s;

  var a = [];
  for (var i = 0; i < w.length; i++) {
    var v = w[i].replace(/&lt;copy&gt;(.+?)&lt;\/copy&gt;/, '$1');
    a.push(v);
  }

  for (i = 0; i < a.length; i++) {
    a[i] = a[i].replace(/\\/g, '\\\\').replace(/&#39;/g, '\\\'').replace(/"/g, '&quot;');
  }

  for (i = 0; i < a.length; i++) {
    var t = '<span class="pseudo-link" onclick="kb.copy(\'' + a[i] + '\', 1);" data-tooltip2="Click to copy">$1</span>';
    s = s.replace(/&lt;copy&gt;(.+?)&lt;\/copy&gt;/, t);
  }

  return s;
};

kb.linkKB = function(s, attr) {
  var url = './';
  if (kb.scm != '') url = kb.appendQuery(url, 'scm=' + kb.scm);
  url = kb.appendQuery(url, 'id=$1');
  if (attr == undefined) attr = 'target="_blank" rel="noopener"';
  var t = '<a href="' + url + '"';
  if (attr) t += ' ' + attr;
  t += '>KB#$1</a>';
  return s.replace(/KB#([0-9A-Za-z\-._]+)/g, t);
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
      PRIVS: '',
      LOGIC: '',
      BODY: ''
    }
  };
};

kb.delete = function(id) {
  util.confirm('Delete?', kb._delete, {focus: 'no', data: id, className: 'color-border-danger'});
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
    kb.getDataList(null, true);
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

kb.switchPreviewMode = function() {
  if ($el('#preview-mode').checked) {
    kb.switchToPreview();
  } else {
    kb.switchToEdit();
  }
};
kb.switchToEdit = function() {
  $el('#content-body').hide();
  $el('#content-body-edt-wrp').show();
};
kb.switchToPreview = function() {
  var v = $el('#content-body-edt').value;
  v = kb.getContentForView(v, 1);
  $el('#content-body').innerHTML = v;
  $el('#content-body').show();
  $el('#content-body-edt-wrp').hide();
};

kb.export = function() {
  var s = '<div style="width:280px;">Export data?</div>\n';
  s += '<div style="display:inline-block;text-align:left;">'
  if (kb.isAdmin) {
    s += '<input type="checkbox" id="chk-export-all" checked><label for="chk-export-all">All schema</label>\n'
  }
  s += '<input type="checkbox" id="chk-decrypt" checked><label for="chk-decrypt">Decrypt</label>'
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
    if (kb.isPropFieldAllowed(k)) {
      props += k + ': ' + content[k] + '\n';
    }
  }
  var html = '';
  html += '<div style="width:50vw;height:50vh;">';
  html += '<div style="text-align:left;margin-bottom:4px;width:150px;">';
  html += '<span>ID: </span><input type="text" id="prop-data-id" value="' + kb.data.id + '" onfocus="kb.onPropIdFocus();"' + (kb.isAdmin ? '' : ' disabled') + '>';
  if (kb.isAdmin) {
    html += '<button id="change-id-button" style="margin-left:4px;" onclick="kb.confirmChangeDataId();" disabled>CHANGE</button>';
    html += '<button id="next-id-button" class="small-button" style="margin-left:4px;" onclick="kb.checkId();">CHECK ID</button>';
  }
  html += '</div>';
  html += '<textarea id="props" spellcheck="false" style="width:calc(100% - 12px);height:calc(100% - 60px);margin-bottom:8px;" onfocus="kb.onPropsFocus();">' + props + '</textarea><br>';
  html += '<button id="save-props-button" onclick="kb.confirmSaveProps();" disabled>SAVE</button>';
  html += '<button style="margin-left:10px;" onclick="kb.cancelEditProps();">Cancel</button>';
  html += '</div>';
  util.dialog.open(html);
};

kb.isPropFieldAllowed = function(k) {
  if ((k == 'BODY') || (k == 'LOGIC')) return false;
  if (kb.isAdmin) return true;
  if (kb.RESTRICTED_PROP_KEYS.includes(k)) return false;
  return true;
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
    var vacantIdInfo = info.vacant_id_info;
    var vacantIds = vacantIdInfo.vacant_ids;
    var omitCount = vacantIdInfo.omit_count;
    var m = 'NEXT ID: <span class="pseudo-link" onclick="kb.selectAndChangeDataId(\'' + nextId + '\');">' + nextId + '</span>';
    if (vacantIds.length > 0) {
      m += '\n';
      m += 'VACANT: ';
      for (var i = 0; i < vacantIds.length; i++) {
        var id = vacantIds[i];
        if (i > 0) m += ', ';
        if ((omitCount > 0) && (i == vacantIds.length - 1)) m += '..(' + omitCount + ').. ';
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

kb.getCurrentLogicParamCode = function() {
  var l = ((kb.data.content && kb.data.content.LOGIC) ? kb.data.content.LOGIC : '');
  var w = util.split(l, '\t', 2);
  var logic = {
    param: w[0],
    code: w[1] || ''
  };
  return logic;
};

kb.openLogicEditor = function() {
  if (kb.logicEditorWindow) {
    return;
  }
  kb.status |= kb.ST_LOGIC_EDITING;
  var logic = kb.getCurrentLogicParamCode();
  var html = '';
  html += '<div style="width:calc(100% - 16px);height:calc(100% - 16px);padding:8px;">';

  html += '<div style="height:1em;">';
  html += '<span style="position:absolute;top:4px;right:5px;">'
  html += '<button onclick="kb.confirmTestExecLogic();">TEST</button>';
  html += '</span>';
  html += '</div>';

  html += 'param=<br>';
  html += '<textarea id="logic-param" spellcheck="false" style="width:calc(100% - 10px);height:64px;margin-bottom:8px;">' + logic.param + '</textarea><br>';
  html += 'Code:<br>';
  html += '<textarea id="logic-code" spellcheck="false" style="width:calc(100% - 10px);height:calc(100% - 180px);margin-bottom:8px;">' + logic.code + '</textarea><br>';
  html += '<div style="text-align:center;">';
  html += '<button id="save-props-button" onclick="kb.confirmSaveLogic();">SAVE</button>';
  html += '<button style="margin-left:10px;" onclick="kb.cancelEditLogic();">Cancel</button>';
  html += '</div>';
  html += '</div>';

  var opt = {
    draggable: true,
    resizable: true,
    pos: 'c',
    closeButton: true,
    width: 800,
    height: 540,
    minWidth: 400,
    minHeight: 240,
    scale: 1,
    hidden: false,
    modal: false,
    title: {
      text: 'Logic'
    },
    body: {
      style: {
        background: 'rgba(40,40,40,0.9)'
      }
    },
    onclose: kb.onLogicEditorWindowClose,
    content: html
  };

  kb.logicEditorWindow = util.newWindow(opt);

  kb.tools.onEncDecModeChange();
  $el('#logic-code').focus();
};

kb.closeLogicEditorWindow = function() {
  if (kb.logicEditorWindow) {
    kb.logicEditorWindow.close();
  }
};

kb.onLogicEditorWindowClose = function() {
  kb.onEditLogicEnd();
  kb.logicEditorWindow = null;
};

kb.confirmSaveLogic = function() {
  util.confirm('Save logic?', kb.saveLogic);
};
kb.saveLogic = function() {
  var logicParam = $el('#logic-param').value.trim();
  var logicCode = $el('#logic-code').value.trim();
  logicParam = logicParam.replace(/\t/g, '  ');
  if (logicCode) logicCode += '\n';
  var logic = '';
  if (logicParam || logicCode) logic = logicParam + '\t' + logicCode;
  kb.savingLogic = logic;
  var b64logic = util.encodeBase64(logic);
  var orgUdate = kb.data.content.U_DATE;
  var silent = ($el('#chk-silent').checked ? '1' : '0');
  var param = {
    scm: kb.scm,
    id: kb.data.id,
    org_u_date: orgUdate,
    silent: silent,
    logic: b64logic
  };
  kb.callApi('save_logic', param, kb.onSaveLogic);
};
kb.onSaveLogic = function(xhr, res, req) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status == 'OK') {
    var savedInfo = res.body;
    kb.closeLogicEditorWindow();
    kb.onEditLogicEnd();
    kb.showInfotip('OK');
    kb.data.content.LOGIC = kb.savingLogic;
    kb.savingLogic = '';
    kb.data.content.U_DATE = savedInfo.U_DATE;
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
kb.cancelEditLogic = function() {
  kb.closeLogicEditorWindow();
  kb.onEditLogicEnd();
};
kb.onEditLogicEnd = function() {
  kb.status &= ~kb.ST_LOGIC_EDITING;
};

kb.openSchemaDialog = function() {
  var html = '';
  html += '<div id="select-scm-dlg" style="width:400px;height:180px;">';
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
  var d = util.dialog.open(html);
  d.id = 'select_scm';
  kb.updateSchemaList();
  $el('#id-txt').blur();
  $el('#q').blur();
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
    $el('#schema-list').innerHTML = 'ERROR: ' + res.status;
    return;
  }
  var scmList = res.body;
  var dfltScmData = null;
  var tmpList = [];
  for (var i = 0; i < scmList.length; i++) {
    var scmData = scmList[i];
    var scmId = scmData.id;
    var title = scmId;
    var prop = scmData.props;
    if (('name' in prop) && prop.name != '') {
      title = prop['name'];
    }
    scmData['title'] = title;
    if (scmId == kb.defaultScm) {
      dfltScmData = scmData;
      continue;
    }
    tmpList.push(scmData);
  }
  util.sortObjectList(tmpList, 'title');
  scmList = tmpList;
  scmList.unshift(dfltScmData);
  kb.scmList = scmList;
  var activeScmId = null;
  kb.activeScmIdx = 0;
  var html = '<table style="width:100%;">';
  for (var i = 0; i < scmList.length; i++) {
    var scmData = scmList[i];
    html += kb.buildScmListHtml(scmData, i);
  }
  html += '</table>';
  $el('#schema-list').innerHTML = html;
  if (activeScmId) kb.setActiveScm(activeScmId);
};
kb.buildScmListHtml = function(scmData, i) {
  var scmId = scmData.id;
  var prop = scmData.props;
  var name = scmId;
  if (('name' in prop) && prop.name != '') {
    name = prop['name'];
  }
  var html = '';
  html += '<tr id="scm-list-' + scmId + '" class="scm-list-row" onmouseover="kb.setActiveScm(\'' + scmId + '\');" >';
  html += '<td style="width:10px;">';
  if ((scmId == kb.scm) || (!kb.scm && (scmId == kb.defaultScm))) {
    activeScmId = scmId;
    kb.activeScmIdx = i;
    html += '*';
  }
  html += '</td>';
  html += '<td style="padding-right:20px;white-space:nowrap;">';
  html += '<span style="display:inline-block;width:100%;overflow:hidden;text-overflow:ellipsis;" class="title pseudo-link" onclick="kb.switchSchema(\'' + scmId + '\');">';
  html += '<span class="pseudo-link link">' + name + '</span>\n';
  html += '</span>';
  html += '</td>';

  html += '<td style="width:16px;">';
  html += '<span class="pseudo-link" onclick="kb.switchSchema(\'' + scmId + '\', true);" data-tooltip="Open new window">W</span>\n';
  html += '</td>';

  if (kb.isSysAdmin) {
    html += '<td style="width:24px;">';
    html += '<span class="pseudo-link" onclick="kb.editSchemaProps(\'' + scmId + '\');" data-tooltip="Edit properties">P</span>\n';
    html += '</td>';
    html += '<td style="width:16px;">';
    if ((scmId != kb.defaultScm) && (scmId != kb.scm)) {
      html += '<span class="pseudo-link text-red" onclick="kb.confirmDeleteSchema(\'' + scmId + '\');" data-tooltip="Delete">X</span>\n';
    } else {
      html += '&nbsp;';
    }
    html += '</td>';
  }
  html += '</tr>';
  return html;
};
kb.switchSchema = function(scm, nw) {
  var url = './';
  if (scm && scm != kb.defaultScm) {
    url += '?scm=' + scm;
  }
  if (nw) {
    kb.openNewWindow(url);
  } else {
    location.href = url;
  }
};

kb.setActiveScm = function(id) {
  kb.activeScmId = id;
  kb.activeScmIdx = kb.getScmIdxFromId(id);
  $el('.scm-list-row').removeClass('data-list-row-active');
  $el('#scm-list-' + id).addClass('data-list-row-active');
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
  html += '<div style="width:500px;height:220px;">';
  html += title;
  html += '<div style="overflow:auto;height:calc(100% - 30px);">';
  html += '<div style="display:inline-block;width:80%;">';
  html += '<pre id="schema-list" style="text-align:left;">';
  html += 'ID: <input type="text" id="scm-id" style="width:calc(100% - 27px);">\n';
  html += '<div style="margin-top:8px;">Properties:</div>';
  html += '<textarea id="scm-props" style="width:100%;height:120px;"></textarea>';
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
        background: 'rgba(40,40,40,0.9)'
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
  kb.drawDataListContent('');
  $el('#new-button').disabled = true;
  $el('#search-button').disabled = true;
  $el('#all-button').disabled = true;
  $el('#id-label').addClass('input-label-disable');
  $el('#id-txt').disabled = true;
  $el('#keyqord-label').addClass('input-label-disable');
  $el('#q').disabled = true;
  $el('#limit-label').addClass('input-label-disable');
  $el('#limit').disabled = true;
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
  kb.resizeMediaPreview(v);
};

kb.resizeMediaPreview = function(v) {
  var els = $el('.imgdata');
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    kb._resizeMediaPreview(el, v);
  }
};
kb._resizeMediaPreview = function(el, v) {
  var rect = el.rect;
  var orgW = rect.width;
  var orgH = rect.height;
  var srcV = orgW;
  var prop = 'width';
  if (orgW < orgH) {
    srcV = orgH;
    prop = 'height';
  }
  var p = (v / 14) * srcV;
  el.style[prop] = p + 'px';
  el.style['max-width'] = '';
  el.style['max-height'] = '';
};

kb.resetFontSize = function() {
  kb.setFontSize(kb.DEFAULT_FONT_SIZE);
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
};

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
  document.body.style.cursor = 'auto';
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
  var m = '<span id="content-url" class="pseudo-link" onclick="kb.copyUrl();" data-tooltip2="Click to copy">' + url + '</span>\n\n';
  if (kb.isSysAdmin && !kb.data.content.PRIVS) {
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

kb.copy = function(s, f) {
  util.copy(s);
  var o = (f ? {pos: 'pointer'} : null);
  kb.showInfotip('Copied', o);
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

kb.toDateTimeString = function(s) {
  var d = '---------- --:--:--';
  if ((s != undefined) && (s != '')) {
    d = kb.getDateTimeString(+s);
  }
  return d;
};

kb.onStartListLoading = function(msg) {
  kb.status |= kb.ST_LIST_LOADING;
  kb.drawInfo('<span class="progdot">' + msg + '</span>');
  kb.drawDataListContent('');
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
  $el('#schema-button').disabled = true;
  kb.clear();
};
kb.onEndLoading = function() {
  $el('#search-button').disabled = false;
  $el('#all-button').disabled = false;
  $el('#schema-button').disabled = false;
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

kb.isDialogDisplaying = function(id) {
  var d = util.dialog.get();
  if (d && d.id == id) return true;
  return false;
};

kb.closeDialog = function() {
  kb.status &= ~kb.ST_SAVE_CONFIRMING;
  kb.status &= ~kb.ST_CANCEL_CONFIRMING;
  kb.status &= ~kb.ST_TOUCH_CONFIRMING;
  util.dialog.close();
};

$onKeyDown = function(e) {
  var FNC_TBL = {38: kb.onKeyDownUp, 40: kb.onKeyDownDn, 78: kb.onKeyDownN, 86: kb.onKeyDownV, 89: kb.onKeyDownY, 119: kb.onKeyDownF8};
  var fn = FNC_TBL[e.keyCode];
  if (fn) fn(e);
};
$onCtrlS = function(e) {
  if (kb.status & kb.ST_LOGIC_EDITING) {
    kb.confirmSaveLogic();
  } else if (kb.status & kb.ST_PROP_EDITING) {
    kb.confirmSaveProps();
  } else if (kb.status & kb.ST_EDITING) {
    if (e.shiftKey) {
      kb.saveData();
    } else {
      kb.confirmSaveAndExit();
    }
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

kb.onKeyDownF8 = function(e) {
  if (!(kb.status & kb.ST_EDITING) && (util.dialog.count() == 0)) {
    kb.getDataListAll();
  }
};

kb.onKeyDownUp = function(e) {
  if ($el('#q').hasFocus()) {
    kb.procHistoryUp();
    e.preventDefault();
  }
};
kb.onKeyDownDn = function(e) {
  if ($el('#q').hasFocus()) {
    kb.procHistoryDn();
    e.preventDefault();
  }
};

kb.HISTORY_MAX = 10;
kb.historyIdx = kb.HISTORY_MAX;
kb.kwTmp = '';
kb.historyBuf = null;
kb.procHistoryUp = function(e) {
  var histories = kb.historyBuf.getAll();
  if (histories.length == 0) return;
  if (histories.length < kb.historyIdx) {
    kb.historyIdx = histories.length;
  }
  if (kb.historyIdx == histories.length) {
    kb.kwTmp = $el('#q').value;
  }
  if (kb.historyIdx > 0) {
    kb.historyIdx--;
  }
  $el('#q').value = histories[kb.historyIdx];
};

kb.procHistoryDn = function(e) {
  var histories = kb.historyBuf.getAll();
  if (histories.length == 0) return;
  if (kb.historyIdx < histories.length) kb.historyIdx++;
  if (kb.historyIdx == histories.length) {
    $el('#q').value = kb.kwTmp;
  } else {
    $el('#q').value = histories[kb.historyIdx];
  }
};

saveHistory = function(s) {
  kb.historyBuf.add(s);
  kb.historyIdx = (kb.historyBuf.count() < kb.HISTORY_MAX) ? kb.historyBuf.count() : kb.HISTORY_MAX;
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
  $el('#keyqord-label').removeClass('input-label-disable');
  $el('#limit-label').removeClass('input-label-disable');
  if ($el('#id-txt').disabled) $el('#id-label').addClass('input-label-disable');
  if ($el('#q').disabled) $el('#keyqord-label').addClass('input-label-disable');
  if ($el('#limit').disabled) $el('#limit-label').addClass('input-label-disable');
};

kb.toggleLimit = function() {
  $el('#limit').value = (($el('#limit').value == '') ? '0' : '');
  $el('#limit').focus();
};

kb.openUserDialog = function() {
  var html = '<div style="text-align:left;">'
  html += '- <span class="pseudo-link" onclick="kb.openChangePwDialog();">Change password</span><br>';
  html += '- <span class="pseudo-link" onclick="kb.confirmLogout();">Logout</span><br>';
  html += '</div>';
  util.alert(html);
};

kb.openChangePwDialog = function() {
  websys.openChangePwDialog();
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
  } else if (kb.isDialogDisplaying('select_scm')) {
    kb.switchSchema(kb.activeScmId);
  }
};
$onEscKey = function(e) {
  kb.closeDialog();
  if (kb.status & kb.ST_PROP_EDITING) {
    kb.onEditPropsEnd();
  } else if (kb.status & kb.ST_LOGIC_EDITING) {
    kb.onEditLogicEnd();
  } else if ($el('.q-txt').hasFocus()) {
    var el = document.activeElement;
    if (el.value == '') {
      kb.focusNext(el);
    } else {
      el.value = '';
      kb.onInputSearch();
    }
  }
  kb.closeToolsWindow();
};

kb.focusNext = function(el) {
  var tgtList = ['q', 'id-txt'];
  var nextId = tgtList[0];
  for (var i = 0; i < tgtList.length; i++) {
    var id = tgtList[i];
    if (el.id == id) {
      nextId = util.arr.next(tgtList, id);
      break;
    }
  }
  $el('#' + nextId).focus();
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

kb.openBSB64Dialog = function(t, enc) {
  var opt = {
    data: {t: t, enc: enc}
  };
  var m = 'BSB64 ' + (enc ? 'encryption' : 'decryption') + ' n=';
  util.dialog.text(m, kb.bsb64DialogCb, opt);
};
kb.bsb64DialogCb = function(n, data) {
  var f = (data.enc ? kb.encodeBSB64 : kb.decodeBSB64);
  f(data.t, n);
};
kb.decodeBSB64 = function(data, n) {
  if (n == '') n = 1;
  try {
    var s = util.decodeBSB64(data, n);
    var m = 'Decoded\n\n' + kb.maskText(s);
  } catch(e) {
    m = '<span style="color:#f77;">Decode Error</span>';
  }
  kb.openResultDialog(m);
};
kb.encodeBSB64 = function(data, n) {
  if (n == '') n = 1;
  try {
    var s = util.encodeBSB64(data, n);
    var m = 'Encoded\n\n';
    m += '<span style="margin-left:50px;">' + s + '</span>';
    m += '<button class="small-button" style="margin-left:12px;margin-right:16px;" onclick="kb.copy(\'' + s + '\', true);">COPY</button>';
  } catch(e) {
    m = '<span style="color:#f77;">Decode Error</span>';
  }
  kb.openResultDialog(m);
};

kb.openB64sDialog = function(t, enc) {
  var opt = {
    secure: true,
    data: {t: t, enc: enc}
  };
  var m = 'Base64S ' + (enc ? 'encryption' : 'decryption') + ' key: ';
  m += '<button class="small-button" onclick="kb.applyDefaultKey();">USE DEFAULT</button>';
  util.dialog.text(m, kb.b64sDialogCb, opt);
};
kb.getDefaultKey = function() {
  return util.decodeBSB64(kb.config.default_encryption_key, 1);
};
kb.applyDefaultKey = function() {
  $el('.dialog-textbox')[0].value = kb.getDefaultKey();
};
kb.b64sDialogCb = function(key, data) {
  var f = (data.enc ? kb.encodeB64s : kb.decodeB64s);
  f(key, data.t);
};
kb.decodeB64s = function(key, data) {
  try {
    var s = util.decodeBase64s(data, key);
    var m = 'Decoded\n\n' + kb.maskText(s);
  } catch(e) {
    m = '<span style="color:#f77;">Decode Error</span>';
  }
  kb.openResultDialog(m);
};
kb.encodeB64s = function(key, data) {
  var m;
  try {
    var s = util.encodeBase64s(data, key);
    var m = 'Encoded\n\n';
    m += '<span style="margin-left:50px;">' + s + '</span>';
    m += '<button class="small-button" style="margin-left:12px;margin-right:16px;" onclick="kb.copy(\'' + s + '\', true);">COPY</button>';
  } catch(e) {
    m = '<span style="color:#f77;">Decode Error</span>';
  }
  kb.openResultDialog(m);
};
kb.openResultDialog = function(s) {
  util.alert(s);
};

kb.maskText = function(s) {
  var v = s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '&quot;');
  var r = '';
  r += '<div style="display:inline-block;position:relative;min-width:110px;margin-left:50px;">';
  r += '<div style="display:inline-block;position:absolute;top:0;left:0;width:100%;height:100%;background:linear-gradient(90deg, #aaa, #888 30%);cursor:pointer;" onclick="kb.peel(this);"></div>';
  r += s;
  r += '</div>';
  r += '<button class="small-button" style="margin-left:8px;margin-right:16px;" onclick="kb.copy(\'' + v + '\', true);">COPY</button>';
  return r;
};
kb.peel = function(el) {
  $el(el).fadeOut(300, kb.onPeel, el);
};
kb.onPeel = function(el) {
  el.style.display = 'none';
};

kb.keyHandlerD = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var el = $el('#content-body-edt');
    var st = el.selectionStart;
    var ed = el.selectionEnd;
  }
  var t = kb.extractSelectedText();
  if (!t) return;
  kb.openB64sDialog(t);
};
kb.keyHandlerE = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var el = $el('#content-body-edt');
    var st = el.selectionStart;
    var ed = el.selectionEnd;
  }
  var t = kb.extractSelectedText();
  if (!t) return;
  kb.openB64sDialog(t, true);
};
kb.keyHandlerL = function(e) {
  if ((kb.status & kb.ST_EDITING) || (kb.mode == 'view')) return;
  kb.getDataListAll();
};
kb.keyHandlerP = function(e) {
  if (!kb.isDialogDisplaying('select_scm')) return;
  kb.editSchemaProps(kb.activeScmId);
};
kb.keyHandlerS = function(e) {
  if ((kb.status & kb.ST_EDITING) || (kb.mode == 'view')) return;
  kb.openSchemaDialog();
};
kb.keyHandlerT = function(e) {
  if (kb.mode == 'view') return;
  kb.openTools();
};
kb.keyHandlerW = function(e) {
  if (kb.mode == 'view') return;
  kb.openNewWindow();
};
kb.keyHandlerTab = function(e) {
  if (!((kb.status & kb.ST_EDITING) && $el('#content-body-edt').hasFocus())) return;
  e.preventDefault();
  var el = $el('#content-body-edt');
  var cp = el.selectionStart;
  var v = el.value;
  var v1 = v.slice(0, cp);
  var v2 = v.slice(cp);
  el.value = v1 + '\t' + v2;
  el.selectionEnd = cp + 1;
};
kb.keyHandlerUp = function(e) {
  if (!kb.isDialogDisplaying('select_scm')) return;
  kb.activeScmIdx--;
  if (kb.activeScmIdx < 0) kb.activeScmIdx = 0;
  var id = kb.getScmIdOnList(kb.activeScmIdx);
  if (id) kb.setActiveScm(id);
};
kb.keyHandlerDn = function(e) {
  if (!kb.isDialogDisplaying('select_scm')) return;
  kb.activeScmIdx++;
  if (kb.activeScmIdx >= kb.scmList.length) kb.activeScmIdx = kb.scmList.length - 1;
  var id = kb.getScmIdOnList(kb.activeScmIdx);
  if (id) kb.setActiveScm(id);
};

kb.getScmIdOnList = function(idx) {
  var d = kb.scmList[idx];
  if (d) return d.id;
  return null;
};
kb.getScmIdxFromId = function(id) {
  for (var i = 0; i < kb.scmList.length; i++) {
    var d = kb.scmList[i];
    if (d.id == id) return i;
  }
  return -1;
};

kb.extractSelectedText = function() {
  var s = window.getSelection();
  return s.toString();
};

kb.openSetPwDialog = function() {
  var html = '';
  html += 'Set password for data encryption\n\n';
  html += '<table>';
  html += '<tr>';
  html += '<td>Password:</td>';
  html += '<td><input type="password" id="pw1" style="width:150px;"></td>';
  html += '</tr>';
  html += '<tr>';
  html += '<td>Re-type:</td>';
  html += '<td><input type="password" id="pw2" style="width:150px;"></td>';
  html += '</tr>';
  html += '</table>\n';
  html += '<div style="margin-top:8px;">';
  html += '<button onclick="kb.setDataPw();">OK</button>';
  html += '<button style="margin-left:8px;" onclick="kb.closeDialog();">Cancel</button>';
  html += '</div>';
  util.dialog.open(html);

  var pw = '';
  if (kb.pw.toSave != null) {
    pw = kb.pw.toSave;
  } else if (kb.pw.toView != null) {
    pw = kb.pw.toView;
  }
  $el('#pw1').value = pw;
  $el('#pw2').value = pw;
  $el('#pw1').focus();
};
kb.setDataPw = function() {
  var pw1 = $el('#pw1').value;
  var pw2 = $el('#pw2').value;
  if (pw1 != pw2) {
    kb.showInfotip('Password mismatch!');
    return;
  }

  kb.pw.toSave = pw1;
  kb.closeDialog();

  if (pw1) {
    kb.drawPwStatus(true);
  } else {
    kb.drawPwStatus(false);
  }
};

kb.drawPwStatus = function(f) {
  $el('#pw-status').innerHTML = (f ? '&#x1F512;' : '');
};

kb.hasFieldValue = function(content, key) {
  return ((key in content) && (content[key]));
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

kb.addFlag = function(flags, flag) {
  if (!flags) return flag;
  flgs = flags.split('|');
  for (var i = 0; i < flgs.length; i++) {
    if (flgs[i] == flag) return flags;
  }
  flgs.push(flag);
  var s = '';
  for (i = 0; i < flgs.length; i++) {
    if (i > 0) s += '|';
    s += flgs[i];
  }
  return s;
};

kb.removeFlag = function(flags, flag) {
  flgs = flags.split('|');
  var s = '';
  var cnt = 0;
  for (i = 0; i < flgs.length; i++) {
    var f = flgs[i];
    if (f == flag) continue;
    if (cnt > 0) s += '|';
    s += f;
    cnt++;
  }
  return s;
};

kb.getUserName = function() {
  var name = websys.getUserFullname();
  if (kb.configInfo && (kb.configInfo.user_name_lang != 'en')) {
    name = websys.getUserLocalName();
    if (name == '') name = websys.getUserFullname();
  }
  if (!name) name = '';
  return name;
};

//-------------------------------------------------------------------------
kb.tools = {};

kb.tools.buildBsb64Html = function() {
  var html = '';
  html += '<div style="margin-bottom:8px;">';
  html += '<b>Encoder/Decoder</b>';

  html += '<span style="margin-left:4px;">';
  html += '<input type="radio" name="encdec-mode" id="rdo-b64s" onchange="kb.tools.onEncDecModeChange();" checked>'
  html += '<label for="rdo-b64s">Base64S</label>';
  html += '<input type="radio" name="encdec-mode" id="rdo-bsb64" onchange="kb.tools.onEncDecModeChange();">'
  html += '<label for="rdo-bsb64">BSB64</label>';
  html += '</span>';

  html += '<span style="margin-left:168px;">';
  html += '<button onclick="kb.tools.resetB64Input();">Reset</button>';

  html += '<span class="area-b64s">';
  html += '<button style="margin-left:100px;" onclick="kb.tools.applyDefaultKey();">DefaultKey</button>';
  html += '</span>';

  html += '</span>';
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
  html += '<input type="checkbox" id="b64s-key-s" onchange="kb.tools.b64KeySecretChange();">';
  html += '<label for="b64s-key-s">Show</label>';
  html += '</span>';

  html += '</td>';
  html += '</tr>';
  html += '<tr>';
  html += '<td>&nbsp;</td>';
  html += '<td style="padding-top:8px;">';
  html += '<button onclick="kb.tools.encB64();">Encode</button>';
  html += '<button style="margin-left:8px;" onclick="kb.tools.decB64();">Decode</button>';
  html += '<button style="margin-left:24px;min-width:20px;" onclick="kb.tools.switchB64Value();">^v</button>';
  html += '</td>';
  html += '</tr>';
  html += '<tr>';
  html += '<td>Output: </td>';
  html += '<td>';
  html += '<input type="text" id="b64-text-out" class="tools-output" style="width:400px;" readonly>';
  html += '</td>';
  html += '<td>';
  html += '<button class="small-button" style="margin-left:4px;" onclick="kb.tools.copy(\'b64-text-out\');">Copy</button>';
  html += '<button class="small-button" style="margin-left:16px;" onclick="kb.tools.clearB64out();;">Clear</button>';
  html += '</td>';
  html += '</tr>';
  html += '</table>';
  return html;
};

kb.tools.onEncDecModeChange = function() {
  if ($el('#rdo-b64s').checked) {
    $el('.area-bsb64').setStyle('display', 'none');
    $el('.area-b64s').setStyle('display', '');
  } else {
    $el('.area-bsb64').setStyle('display', '');
    $el('.area-b64s').setStyle('display', 'none');
  }
};

kb.tools.b64KeySecretChange = function() {
  var type = ($el('#b64s-key-s').checked ? 'text' : 'password');
  $el('#b64s-key').type = type;
};

kb.tools.applyDefaultKey = function() {
  $el('#b64s-key').value = kb.getDefaultKey();
};

kb.tools.encB64 = function() {
  kb.tools.encdecB64(true);
};

kb.tools.decB64 = function() {
  kb.tools.encdecB64(false);
};

kb.tools.encdecB64 = function(enc) {
  var s = $el('#b64-text-in').value;
  if ($el('#rdo-b64s').checked) {
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

kb.tools.switchB64Value = function() {
  var v1 = $el('#b64-text-in').value;
  var v2 = $el('#b64-text-out').value;
  $el('#b64-text-in').value = v2;
  $el('#b64-text-out').value = v1;
};

kb.tools.clearB64out = function() {
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

kb.openNewWindow = function(url) {
  if (!url) url = location.href;
  window.open(url);
};

//-------------------------------------------------------------------------
kb.cmd = {};
kb.cmd.cmdKbLog = function(arg) {
  var n = arg.trim();
  var params = {n: n};
  kb.callApi('get_kb_log', params, kb.cmd.onCmdKbLog);
};
kb.cmd.onCmdKbLog = function(xhr, res) {
  if (xhr.status != 200) {
    kb.onHttpError(xhr.status);
    return;
  }
  if (res.status != 'OK') {
    kb.showInfotip(res.status);
    return;
  }
  var logs = res.body;
  var s = '';
  for (var i = 0; i < logs.length; i++) {
    var v = logs[i];
    var a = v.split('\t');
    var time = a[0];
    var user = a[1];
    var op = a[2];
    var scm = a[3];
    var id = a[4];
    var info = a[5];
    if (!info) info = '';

    time = time.replace(/T/, ' ');
    if (scm) scm = 'scm:' + scm;
    if (id) id = 'id:' + id;

    s += time + '\t' + user + '\t' + op + '\t' +scm + '\t' +id + '\t' + info + '\n';
  }
  var r = util.alignFields(s, '\t', 2);
  log.mlt(r);
};

kb.cmd.CMD_TBL = [
  {cmd: 'kblog', fn: kb.cmd.cmdKbLog, desc: 'Show KB logs'}
];

//-------------------------------------------------------------------------
kb.confirmExecLogic = function() {
  var logic = kb.getCurrentLogicParamCode();
  var opt = {
    type: 'textarea',
    style: {
      content: {
        'text-align': 'left'
      },
      textbox: {
        width: '32em',
        height: '8em'
      }
    },
    value: logic.param
  };
  util.dialog.text('Parameters:', kb.invokeLogic, opt);
};
kb.invokeLogic = function(p) {
  var logic = kb.getCurrentLogicParamCode();
  kb.execLogic(p, logic.code);
};
kb.confirmTestExecLogic = function() {
  util.confirm('Execute Logic?', kb.testExecLogic);
};
kb.testExecLogic = function() {
  var logicParam = $el('#logic-param').value;
  var logicCode = $el('#logic-code').value;
  kb.execLogic(logicParam, logicCode);
};
kb.execLogic = function(p, c) {
  p = p.trim();
  if (p) c = 'var param = ' + p + '\n' + c;
  eval(c);
};
//-----------------------------
var logic = {};
logic.getDataText = function() {
  var s = ((kb.status & kb.ST_EDITING) ? $el('#content-body-edt').value : $el('#content-body').innerHTML);
  return s;
};
logic.getDataTextAsList = function() {
  var s = logic.getDataText();
  return util.text2list(s);
};
logic.setDataText = function(s) {
  if ((kb.status & kb.ST_EDITING)) {
    $el('#content-body-edt').value = s;
  } else {
    $el('#content-body').innerHTML = s;
  }
};
logic.replaceDataText = function(r, s) {
  var re = new RegExp(re);
  var t = logic.getDataText();
  t = t.replace(re, s);
  logic.setDataText(s);
};
logic.dialog = function(s) {
  var opt = {
    style: {
      'text-align': 'left'
    }
  };
  return util.alert(s, opt);
};
//-----------------------------
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

//-------------------------------------------------------------------------
$onBeforeUnload = function(e) {
  if (kb.status & kb.ST_EDITING) {
    var m = '';
    e.preventDefault();
    e.returnValue = m;
    return m;
  }
};
