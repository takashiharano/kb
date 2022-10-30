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
def build_main_screen(context):
    html = '''<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=Edge">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
<meta name="viewport" content="width=device-width,initial-scale=1">
'''
    html += '<title>' + appconfig.title + '</title>'
    html += '<style>'
    html += build_css(mode='main')
    html += '</style>'
    html += '<script src="' + ROOT_PATH + 'libs/debug.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '''<script src="kb.js"></script>
</head>
<body>
<div id="body1">
  <div id="list-area" class="area">
    <div style="position:relative;">
      <button id="new-button" style="margin-right:32px;" onclick="kb.createNew();">NEW</button>
      <span id="id-label">ID:</span> <input type="text" id="id-txt" class="q-txt" spellcheck="false" style="width:46px;">
      <span id="keyqord-label" style="margin-left:8px;">KEYWORD:</span> <input type="text" id="q" class="q-txt" spellcheck="false" style="margin-left:4px;"><button id="search-button" style="margin-left:4px;min-width:32px;" onclick="kb.search();">SEARCH</button>
      <button id="all-button" style="margin-left:8px;min-width:32px;" onclick="kb.getListAll();">LIST ALL</button>
      <span style="position:absolute;right:5px;">
        <span id="clock"></span>
'''
    if web.has_permission(context, 'kb.export'):
        html += '        <button id="export-button" style="margin-left:8px;min-width:32px;" onclick="kb.export();">EXPORT</button>'

    html += '''
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
    <div id="adjuster"></div>
    <div>
      <div id="info-area">
        <button id="edit-button" class="for-view" style="min-width:32px;" onclick="kb.edit();">EDIT</button>
        <pre id="content-id"></pre>
        <span id="info-label">
          <pre id="content-title"></pre>
          <pre id="content-labels"></pre>
        </span>

        <span id="info-edit">
          <input type="text" id="content-id-edt" spellcheck="false" style="display:none;">
          <span style="margin-left:4px;">TITLE:</span>
          <input type="text" id="content-title-edt" spellcheck="false">
          <span style="margin-left:16px;">LABELS:</span>
          <input type="text" id="content-labels-edt" spellcheck="false">
          <span style="margin-left:16px;">STATUS:</span>
          <select id="select-status"></select>
          <input type="checkbox" id="chk-encryption"><label for="chk-encryption">ENCRYPTION</label>
        </span>
      </div>
      <div style="display:inline-block;position:absolute;right:10px;">
        <span id="buttons-r" class="for-view">
          <input type="checkbox" id="chk-plain-text"><label for="chk-plain-text">Plain text</label>
          <button id="copy-url-button" style="margin-left:8px;" onclick="kb.copyContent();">COPY</button>
          <button id="copy-url-button" style="margin-left:2px;" onclick="kb.showUrl();">URL</button>
'''
    if web.has_permission(context, 'kb.delete'):
        html += '          <button id="delete-button" class="red-button" style="min-width:32px;margin-left:8px;" onclick="kb.delete();">DELETE</button>'

    html += '''
        </span>
        <span id="buttons-w" class="for-edit">
          <button id="save-button" style="min-width:32px;" onclick="kb.save();">SAVE</button>
          <button id="cancel-button" onclick="kb.cancel();">CANCEL</button>
        </span>
      </div>
    </div>
    <div style="height:calc(100% - 70px);">
      <div id="content-wrp1">
        <div id="content-wrp">
          <pre id="content-body"></pre>
          <div id="content-body-edt-wrp">
            <textarea id="content-body-edt" spellcheck="false"></textarea>
            <div id="content-body-st"></div>
          </div>
        </div>
        <div style="height:25px;">
          <input type="range" value="0" min="0" max="256" step="1" id="font-range" style="position:relative;top:6px;" oninput="kb.onFontRangeChanged(this);" onchange="kb.onFontRangeChanged(this);"><span id="fontsize"></span>
          <button onclick="kb.resetFontSize();">RESET</button>
        </div>
      </div>
    </div>
  </div>
</div></body></html>'''
    return html

#------------------------------------------------------------------------------
def build_view_screen(context):
    html = '''<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
<meta name="viewport" content="width=device-width,initial-scale=1">
'''
    html += '<title>' + appconfig.title + '</title>'
    html += '<style>'
    html += build_css(mode='view')
    html += '</style>'
    html += '<script src="' + ROOT_PATH + 'libs/debug.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '''
<style>
#content-area {
  height: calc(100vh - 18px);
}
</style>
<script>
var kb = {};
kb.mode = 'view'
'''
    html += 'kb.token = \'' + web.get_raw_request_param('token', '') + '\';\n'
    html += '</script>'
    html += '<script src="kb.js"></script>'
    html += '''
</head>
<body>
<div id="body1">
  <div id="content-area" class="area">
    <div>
      <div id="meta-info">
        <span id="content-created-date"></span> <span id="content-created-by"></span><span id="content-updated-date" style="margin-left:32px;"></span> <span id="content-updated-by"></span>
        <span style="position:absolute;right:5px;">
          <span id="clock"></span>
        </span>
      </div>
      <div id="info-area">
        <span id="content-id"></span>
        <span id="content-title"></span>
        <span id="info-label">
        <span id="content-labels"></span>
      </div>
      <div style="display:inline-block;position:absolute;right:10px;">
        <span id="buttons-r">
          <input type="checkbox" id="chk-plain-text"><label for="chk-plain-text">Plain text</label>
          <button id="copy-url-button" style="margin-left:8px;" onclick="kb.copyContent();">COPY</button>
        </span>
      </div>
    </div>
    <div style="height:calc(100% - 74px);">
      <div id="content-wrp1">
        <div id="content-wrp">
          <pre id="content-body"></pre>
          </div>
        </div>
        <div style="height:25px;">
          <input type="range" value="0" min="0" max="256" step="1" id="font-range" style="position:relative;top:6px;" oninput="kb.onFontRangeChanged(this);" onchange="kb.onFontRangeChanged(this);"><span id="fontsize"></span>
          <button onclick="kb.resetFontSize();">RESET</button>
        </div>
      </div>
    </div>
  </div>
</div></body></html>'''
    return html

#------------------------------------------------------------------------------
def build_css(mode=''):
    css = ''
    css += 'body{'
    css += '  width: 100%;'
    css += '  height: calc(100vh - 10px);'
    css += '  margin: 0;'
    css += '  background: ' + appconfig.background1 + ';'
    css += '  color: ' + appconfig.fg_color + ';'
    css += '  font-size: 13px;'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '}'
    css += 'input {'
    css += '  font-size: 13px;'
    css += '  border: none;'
    css += '  border-bottom: solid 1px #888;'
    css += '  padding: 2px;'
    css += '  color: ' + appconfig.fg_color + ';'
    css += '  background: transparent;'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '  outline: none;'
    css += '}'
    css += 'button, input[type="button"], input[type="submit"] {'
    css += '  min-width: 45px;'
    css += '  border: 1px solid ' + appconfig.button_border + ';'
    css += '  border-radius: 3px;'
    css += '  outline: none;'
    css += '  color: ' + appconfig.button_fgcolor + ';'
    css += '  background:  ' + appconfig.button_background + ';'
    css += '  font-size: 13px;'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '  transition: all 0.2s ease;'
    css += '}'
    css += '''
button:focus, input[type="button"]:focus, input[type="submit"]:focus {
  background: ' + appconfig.button_focus_background + ';'
  color: ' + appconfig.button_focus_fgcolor + ';'
}
input[type="checkbox"] {
  position: relative;
  top: 2px;
}
'''
    css += 'button:hover, input[type="button"]:hover, input[type="submit"]:hover {'
    css += '  cursor: pointer;'
    css += '  background: ' + appconfig.button_hover_background + ';'
    css += '  color: ' + appconfig.button_hover_fgcolor + ';'
    css += '  transition: all 0.2s ease;'
    css += '}'
    css += 'button:disabled, input[type="button"]:disabled, input[type="submit"]:disabled {'
    css += '  border: 1px solid ' + appconfig.button_disabled_border + ';'
    css += '  background: ' + appconfig.button_disabled_background + ';'
    css += '  color: ' + appconfig.button_disabled_fgcolor + ';'
    css += '}'

    css += '''
pre {
  margin: 0;
  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;
}
a {
  color:#cef;
}
'''

    css += 'textarea {'
    css += '  outline: none;'
    css += '  background: transparent;'
    css += '  color: ' + appconfig.fg_color + ';'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '}'

    css += '''
h1, h2, h3 {
  color: #a5afb7;
}
table {
  border-collapse: collapse;
}
'''
    css += '.area {'
    css += '  position: relative;'
    css += '  border: 1px solid ' + appconfig.border_color + ';'
    css += '  border-radius: 3px;'
    css += '  padding: 4px;'
    css += '}'
    css += '.red-button {'
    css += '  border: 1px solid ' + appconfig.button_red_border + ';'
    css += '  background: ' + appconfig.button_red_background + ';'
    css += '  color: ' + appconfig.button_red_fgcolor + ';'
    css += '}'
    css += '.red-button:focus {'
    css += '  background: ' + appconfig.button_red_focus_background + ';'
    css += '  color: ' + appconfig.button_red_focus_fgcolor + ';'
    css += '}'
    css += '.red-button:hover {'
    css += '  background: ' + appconfig.button_red_hover_background + ';'
    css += '  color: ' + appconfig.button_red_hover_fgcolor + ';'
    css += '}'
    css += '.text-red {'
    css += '  color: ' + appconfig.text_red + ';'
    css += '}'

    css += '''
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
    css += '.item {'
    css += '  background: ' + appconfig.background4 + ';'
    css += '}'
    css += '#list-area {'
    css += '  width: 100%;'
    css += '  height: 230px;'
    css += '  margin: 4px 2px 2px 2px;'
    css += '  background: ' + appconfig.background2 + ';'
    css += '}'

    css += '''
#list-wrp {
  height: calc(100% - 32px);
  overflow: auto;
}
#list {
  margin-top: 4px;
}
#adjuster {
  position: relative;
  width: 100%;
  height: 4px;
  top: -8px;
  cursor: ns-resize;
}
'''
    css += '.data-list-row:hover {'
    css += '  background: ' + appconfig.list_hover_background + ';'
    css += '}'
    css += '#content-area {'
    css += '  width: 100%;'
    css += '  height: calc(100vh - 270px);'
    css += '  margin: 2px;'
    css += '  background: ' + appconfig.background3 + ';'
    css += 'font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '}'
    css += '.title {'
    css += '  color: ' + appconfig.title_color + ';'
    css += '}'
    css += '.title-disabled {'
    css += '  color: ' + appconfig.title_disabled_color + ';'
    css += '}'
    css += '''
#info-area {
  display: inline-block;
}
#meta-info {
  margin-bottom: 4px;
  height: 1.2em;
  color: #ccc;
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
  margin-left: 16px;
}
#content-wrp1 {
  width: calc(100% - 6px);
  min-width: 70%;
  height: 100%;
  float: left;
  margin-top:10px;
  margin-right:2px;
}
#content-wrp {
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
  height: calc(100% - 1.3em);
}
#content-body-st {
  color: #a5afb7;
}
'''
    css += '.label {'
    css += '  border-radius: 3px;'
    css += '  margin-right: 4px;'
    css += '  padding: 1px 8px;'
    css += '  background: ' + appconfig.label_background + ';'
    css += '  color: ' + appconfig.label_fgcolor + ';'
    css += '}'

    if mode != 'view':
        css += '.label:hover {'
        css += '  background: ' + appconfig.label_hover_background + ';'
        css += '  cursor: pointer;'
        css += '}'

    css += '.dialog {'
    css += '  border: 1px solid ' + appconfig.dialog_border + ';'
    css += '  background: ' + appconfig.dialog_background + '!important;'
    css += '  color: ' + appconfig.dialog_fgcolor + ' !important;'
    css += '}'
    css += '.status-label-ok {'
    css += '  color: ' + appconfig.status_label_ok_fgcolor + ';'
    css += '  background: ' + appconfig.status_label_ok_background + ';'
    css += '}'

    css += '.status-label-err {'
    css += '  color: ' + appconfig.status_label_err_fgcolor + ';'
    css += '  background: ' + appconfig.status_label_err_background + ';'
    css += '}'

    css += '.status-label-encrypted {'
    css += '  color: ' + appconfig.status_label_encrypted_fgcolor + ';'
    css += '  background: ' + appconfig.status_label_encrypted_background + ';'
    css += '}'

    css += '#clock {'
    css += '  color: ' + appconfig.clock_color + ';'
    css += '}'

    css += '''
.status {
  border-radius: 3px;
}
.status:hover {
  cursor: pointer;
}
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
td.center {
  text-align: center;
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

#font-range {
  width: 256px;
}

.input-disable {
  color: #888;
}
'''
    return css

#------------------------------------------------------------------------------
def main():
    context = web.on_access()
    context['authorized'] = web.auth(False)

    id = util.get_request_param('id')

    if context['authorized'] or id is None:
        html = build_main_screen(context)
    else:
        html = build_view_screen(context)

    util.send_html(html)
