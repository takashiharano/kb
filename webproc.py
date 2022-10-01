#==============================================================================
# Knowledge Base System
# Copyright (c) 2021 Takashi Harano
#==============================================================================
import os
import sys

import appconfig

ROOT_PATH = appconfig.root_path

sys.path.append(os.path.join(os.path.dirname(__file__), ROOT_PATH + 'libs'))
import util

util.append_system_path(__file__, ROOT_PATH)
util.append_system_path(__file__, ROOT_PATH + 'websys/bin')
import web
import kb

#------------------------------------------------------------------------------
# HTML
def build_html():
    html = '''<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
<meta name="viewport" content="width=device-width,initial-scale=1">
'''
    html += '<title>' + appconfig.title + '</title>'
    html += '<style>'
    html += 'body{'
    html += '  width: 100%;'
    html += '  height: calc(100vh - 10px);'
    html += '  margin: 0;'
    html += '  background: ' + appconfig.background1 + ';'
    html += '  color: ' + appconfig.fg_color + ';'
    html += '  font-size: 13px;'
    html += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    html += '}'
    html += 'input {'
    html += '  font-size: 13px;'
    html += '  border: none;'
    html += '  border-bottom: solid 1px #888;'
    html += '  padding: 2px;'
    html += '  color: ' + appconfig.fg_color + ';'
    html += '  background: transparent;'
    html += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    html += '  outline: none;'
    html += '}'
    html += 'button, input[type="button"], input[type="submit"] {'
    html += '  min-width: 45px;'
    html += '  border: 1px solid ' + appconfig.button_border + ';'
    html += '  border-radius: 3px;'
    html += '  outline: none;'
    html += '  color: ' + appconfig.button_fgcolor + ';'
    html += '  background:  ' + appconfig.button_background + ';'
    html += '  font-size: 13px;'
    html += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    html += '  transition: all 0.2s ease;'
    html += '}'
    html += '''
button:focus, input[type="button"]:focus, input[type="submit"]:focus {
  background: ' + appconfig.button_focus_background + ';'
  color: ' + appconfig.button_focus_fgcolor + ';'
}
'''
    html += 'button:hover, input[type="button"]:hover, input[type="submit"]:hover {'
    html += '  cursor: pointer;'
    html += '  background: ' + appconfig.button_hover_background + ';'
    html += '  color: ' + appconfig.button_hover_fgcolor + ';'
    html += '  transition: all 0.2s ease;'
    html += '}'
    html += 'button:disabled, input[type="button"]:disabled, input[type="submit"]:disabled {'
    html += '  border: 1px solid ' + appconfig.button_disabled_border + ';'
    html += '  background: ' + appconfig.button_disabled_background + ';'
    html += '  color: ' + appconfig.button_disabled_fgcolor + ';'
    html += '}'

    html += '''
pre {
  margin: 0;
  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;
}
a {
  color:#cef;
}
'''

    html += 'textarea {'
    html += '  outline: none;'
    html += '  background: transparent;'
    html += '  color: ' + appconfig.fg_color + ';'
    html += 'font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    html += '}'

    html += '''
h1, h2, h3 {
  color: #a5afb7;
}
table {
  border-collapse: collapse;
}
'''
    html += '.area {'
    html += '  border: 1px solid ' + appconfig.border_color + ';'
    html += '  border-radius: 3px;'
    html += '  padding: 4px;'
    html += '}'
    html += '.red-button {'
    html += '  border: 1px solid ' + appconfig.button_red_border + ';'
    html += '  background: ' + appconfig.button_red_background + ';'
    html += '  color: ' + appconfig.button_red_fgcolor + ';'
    html += '}'
    html += '.red-button:focus {'
    html += '  background: ' + appconfig.button_red_focus_background + ';'
    html += '  color: ' + appconfig.button_red_focus_fgcolor + ';'
    html += '}'
    html += '.red-button:hover {'
    html += '  background: ' + appconfig.button_red_hover_background + ';'
    html += '  color: ' + appconfig.button_red_hover_fgcolor + ';'
    html += '}'
    html += '''
#q {
  width: 500px;
}
#body1 {
  display: none;
  width: calc(100% - 17px);
}
.selected {
  background: #2f3a42;
}
'''
    html += '.item {'
    html += '  background: ' + appconfig.background4 + ';'
    html += '}'
    html += '#list-area {'
    html += '  width: 100%;'
    html += '  height: 230px;'
    html += '  margin: 4px 2px 2px 2px;'
    html += '  background: ' + appconfig.background2 + ';'
    html += '}'

    html += '''
#list-wrp {
  height: calc(100% - 32px);
  overflow: auto;
}
#list {
  margin-top: 4px;
}
'''
    html += '.data-list-row:hover {'
    html += '  background: ' + appconfig.list_hover_background + ';'
    html += '}'
    html += '#content-area {'
    html += '  width: 100%;'
    html += '  height: calc(100vh - 270px);'
    html += '  margin: 2px;'
    html += '  background: ' + appconfig.background3 + ';'
    html += 'font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    html += '}'
    html += '.title {'
    html += '  color: ' + appconfig.title_color + ';'
    html += '}'
    html += '''
#info-area {
  display: inline-block;
}

#content-id {
  display: inline-block;
}
#content-id-edt {
  width: 50px;
}
#content-title {
  display: inline-block;
  min-width: 400px;
  max-width: 800px;
}
#content-title-edt {
  width: 600px;
}
#content-labels {
  display: inline-block;
  margin-left: 32px;
}
#content-labels-edt {
  width: 300px;
}
#chk-encryption {
  position: relative;
  top: 2px;
  margin-left: 16px;
}
#chk-dataurl-decode {
  position: relative;
  top: 2px;
}
#content-left {
  display: inline-block;
  width: calc(100% - 6px);
  min-width: 70%;
  height: 100%;
  float: left;
  margin-top:10px;
  margin-right:2px;
}
#content-wrp {
  display: inline-block;
  width: 100%;
  height: 100%;
  padding: 4px;
  overflow: auto;
}
#content-body-edt-wrp {
  width: 100%;
  height: calc(100% - 10px);
}
#content-body-edt {
  width: calc(100% - 8px);
  height: calc(100% - 12px);
}
#content-body-st {
  color: #a5afb7;
}
'''
    html += '.label {'
    html += '  border-radius: 3px;'
    html += '  margin-right: 4px;'
    html += '  padding: 1px 8px;'
    html += '  background: ' + appconfig.label_background + ';'
    html += '  color: ' + appconfig.label_fgcolor + ';'
    html += '}'
    html += '.label:hover {'
    html += '  background: ' + appconfig.label_hover_background + ';'
    html += '  cursor: pointer;'
    html += '}'
    html += '.dialog {'
    html += '  border: 1px solid ' + appconfig.dialog_border + ';'
    html += '  background: ' + appconfig.dialog_background + '!important;'
    html += '  color: ' + appconfig.dialog_fgcolor + ' !important;'
    html += '}'
    html += '.status-label-ok {'
    html += '  color: ' + appconfig.status_label_ok_fgcolor + ';'
    html += '  background: ' + appconfig.status_label_ok_background + ';'
    html += '}'

    html += '.status-label-err {'
    html += '  color: ' + appconfig.status_label_err_fgcolor + ';'
    html += '  background: ' + appconfig.status_label_err_background + ';'
    html += '}'

    html += '.status-label-encrypted {'
    html += '  color: ' + appconfig.status_label_encrypted_fgcolor + ';'
    html += '  background: ' + appconfig.status_label_encrypted_background + ';'
    html += '}'

    html += '#clock {'
    html += '  color: ' + appconfig.clock_color + ';'
    html += '}'

    html += '''
table.item-list,td.item-list,th.item-list {
  border: 1px solid #888;
  border-top: none;
  border-right: none;
  border-left: none;
  border-collapse: collapse;
  white-space: nowrap;
  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;
}

td.item-list {
  padding-right: 16px;
}

.sort-button {
  display: inline-block;
  line-height: 1em;
  color: #555;
  font-size: 8px;
}
.sort-button:hover {
  cursor: pointer;
}
.sort-active {
  color: #ccc;
}

#labels-label {
  margin-left: 16px;
}
</style>
'''
    html += '<script src="' + ROOT_PATH + 'libs/debug.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '''<script src="kb.js"></script>
</head>
<body>
<div id="body1">
  <div id="list-area" class="area">
    <div style="position:relative;">
      <button id="new-button" style="margin-right:24px;" onclick="kb.createNew();">NEW</button>
      <input type="text" id="q" spellcheck="false" style="margin-left:4px;"><button id="search-button" style="margin-left:4px;min-width:32px;" onclick="kb.search();">SEARCH</button>
      <button id="all-button" style="margin-left:8px;min-width:32px;" onclick="kb.getListAll();">LIST ALL</button>
      <span style="position:absolute;right:5px;">
        <span id="clock"></span>
        <button id="export-button" style="margin-left:8px;min-width:32px;" onclick="kb.export();">EXPORT</button>
      </span>
    </div>
    <div style="height:1em;">
      <pre id="info"></pre>
    </div>
    <div id="list-wrp">
      <pre id="list" class="item"></pre>
    </div>
  </div>
  <div id="content-area" class="area">
    <div>
      <div id="info-area">
        <button id="edit-button" style="min-width:32px;" onclick="kb.edit();">EDIT</button>
        <span id="info-label">
          <pre id="content-id"></pre>
          <pre id="content-title"></pre>
          <pre id="content-labels"></pre>
        </span>

        <span id="info-edit">
          <input type="text" id="content-id-edt" spellcheck="false" style="display:none;">
          <span style="margin-left:20px;">TITLE:</span>
          <input type="text" id="content-title-edt" spellcheck="false">
          <span style="margin-left:20px;">LABELS:</span>
          <input type="text" id="content-labels-edt" spellcheck="false">
          <input type="checkbox" id="chk-encryption"><label for="chk-encryption">ENCRYPTION</label>
        </span>
      </div>
      <div style="display:inline-block;position:absolute;right:10px;">
        <span id="buttons-r">
          <input type="checkbox" id="chk-dataurl-decode" style="position:relative;top:2px;"><label for="chk-dataurl-decode">Decode data-url</label>
          <button id="copy-url-button" style="margin-left:8px;" onclick="kb.copyUrl();">Copy URL</button>
          <button id="delete-button" class="red-button" style="min-width:32px;margin-left:8px;" onclick="kb.delete();">DELETE</button>
        </span>
        <span id="buttons-w">
          <button id="save-button" style="min-width:32px;" onclick="kb.save();">SAVE</button>
          <button id="cancel-button" onclick="kb.cancel();">CANCEL</button>
        </span>
      </div>
    </div>
    <div style="height:calc(100% - 84px);">
      <div id="content-left">
        <div id="content-wrp">
          <pre id="content-body"></pre>
          <div id="content-body-edt-wrp">
            <textarea id="content-body-edt" spellcheck="false"></textarea>
            <div id="content-body-st"></div>
          </div>
        </div>
        <div style="height:25px;">
          <input type="range" value="0" min="0" max="128" step="1" id="font-range" style="position:relative;top:6px;" oninput="kb.onFontRangeChanged(this);" onchange="kb.onFontRangeChanged(this);"><span id="fontsize"></span>
          <button onclick="kb.resetFontSize();">RESET</button>
        </div>
      </div>
    </div>
  </div>
</div></body></html>'''
    return html

#------------------------------------------------------------------------------
def print_screen():
    html = build_html()
    print("Content-Type: text/html")
    print()
    print(html)

#------------------------------------------------------------------------------
# User Impl.
#------------------------------------------------------------------------------
def get_request_param(key):
    return web.get_request_param(key)

def get_raw_request_param(key):
    return web.get_raw_request_param(key)

def get_current_user_name():
    return web.get_current_user_name()

def send_result_json(status, body):
    web.send_result_json(status, body)

#------------------------------------------------------------------------------
def web_process():
  web.on_access()
  if not web.auth(False):
    send_result_json('FORBIDDEN', None)
    return

  status = 'OK'
  result_data = None

  act = get_request_param('act')
  if act == 'list':
    result_data = kb.send_list()
  elif act == 'search':
    q = get_request_param('q')
    q = util.decode_base64(q)
    result_data = kb.search_data(q)
  elif act == 'get':
    id = get_request_param('id')
    result_data = kb.get_data(id)
  elif act == 'save':
    id = get_request_param('id')
    data_json = get_request_param('data')
    data = util.from_json(data_json)
    user = get_current_user_name()
    saved_id = kb.save_data(id, data, user)
    result_data = saved_id
  elif act == 'delete':
    id = get_request_param('id')
    status = kb.delete_data(id)
  elif act == 'check_exists':
    id = get_request_param('id')
    result_data = kb.check_exists(id)
  else:
    act = web.get_raw_request_param('act')
    if act == 'export':
      b = kb.export_data()
      util.send_binary(b, filename='kbdata.zip')
      return

    status = 'ERR'

  send_result_json(status, result_data)
