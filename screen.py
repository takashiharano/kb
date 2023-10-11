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
import js

#------------------------------------------------------------------------------
def build_main_screen(context):
    workspace_path = kb.get_workspace_path()
    msg_path = workspace_path + 'info.txt'
    message = util.read_text_file(msg_path, default='')

    html = '''<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
<meta name="viewport" content="width=device-width,initial-scale=1">
'''
    html += '<title>' + appconfig.title + '</title>'
    html += '<style>'
    html += build_css(mode='main')
    html += '</style>'
    html += '<script src="' + ROOT_PATH + 'libs/sha.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/debug.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '<script src="kb.js"></script>'
    html += '''<script src="./?res=js"></script>
</head>
<body>
<div id="body1">
  <div id="list-area" class="area">
    <div style="position:relative;height:20px;">

'''
    html += '      <a href="' + appconfig.home_path + '" style="margin-right:4px;">HOME</a>'
    html += '      <span id="system-name" style="color:' + appconfig.system_name_color + ';">' + appconfig.system_name + '</span>'
    html += '      <span id="scm-name" style="color:' + appconfig.system_name_color + ';"></span>'
    html += '      <span style="position:absolute;right:5px;">'
    html += '        <span class="pseudo-link text-dim" style="margin-right:10px;" onclick="kb.confirmLogout();">' + context.get_user_name() + '</span>'
    html += '        <span id="clock"></span>'
    html += '''
      </span>
    </div>'''

    html += '''
    <div style="position:relative;height:20px;">'''

    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.write'):
        html += '      <button id="new-button" style="margin-right:32px;" onclick="kb.createNew();">NEW</button>'

    html += '''
      <span id="id-label">ID:</span> <input type="text" id="id-txt" class="q-txt" spellcheck="false" style="width:46px;">
      <span id="keyqord-label" style="margin-left:8px;">KEYWORD:</span> <input type="text" id="q" class="q-txt" spellcheck="false" style="margin-left:4px;"><button id="search-button" style="margin-left:4px;min-width:32px;" onclick="kb.search();">SEARCH</button><button class="small-button" style="margin-left:4px;" onclick="kb.clearKeywords();">CLEAR</button><button id="all-button" style="margin-left:16px;min-width:32px;" onclick="kb.getListAll();">LIST ALL</button><button style="margin-left:24px;" onclick="kb.openNewWindow();">NEW WIN</button>
'''

    html += '      <span style="position:absolute;right:5px;">'
    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.write'):
        html += '        <button id="touch-button" style="margin-right:8px;" onclick="kb.touch();" disabled>TOUCH</button>'
    html += '        <button id="export-button" style="min-width:32px;" onclick="kb.openTools();">TOOLS</button>'
    html += '        <button id="schema-button" style="min-width:32px;" onclick="kb.selectSchema();">SCHEMA</button>'
    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.export'):
        html += '        <button id="export-button" style="margin-left:4px;min-width:32px;" onclick="kb.export();">EXPORT DATA</button>'
    html += '      </span>'

    html += '''
    </div>
    <div style="height:1em;">
      <span id="info"></span>
      <div style="display:inline-block;position:absolute;right:24px;color:#aaa;"><span id="all-data-size"></span></div>
    </div>
    <div id="list-wrp">
      <pre id="list"></pre>
    </div>
  </div>
  <div id="content-area" class="area">
    <div id="adjuster"></div>
    <div>
      <div id="info-area">
'''
    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.write'):
        html += '        <button id="edit-button" class="for-view" style="min-width:32px;" onclick="kb.edit();">EDIT</button>'

    html += '''
        <pre id="content-id"></pre>
        <span id="info-label">
          <pre id="content-title"></pre>
        </span>

        <span id="info-edit">
          <span style="margin-left:4px;">TITLE:</span>
          <input type="text" id="content-title-edt" spellcheck="false">
          <span style="margin-left:12px;">LABELS:</span>
          <input type="text" id="content-labels-edt" spellcheck="false">
          <span style="margin-left:12px;">STATUS:</span>
          <select id="select-status"></select>
          <input type="checkbox" id="chk-encryption"><label for="chk-encryption">Encrypt</label>
'''
    if context.has_permission('sysadmin'):
        html += '          <input type="checkbox" id="chk-silent"><label for="chk-silent">Silent</label>'

    html += '''
          <button id="edit-logic-button" style="margin-left:8px;" onclick="kb.openLogicEditor();" disabled>LOGIC</button>
        </span>
      </div>
      <div style="display:inline-block;position:absolute;right:10px;">
        <span id="buttons-r" class="for-view">
          <span id="content-labels-area">
            <span id="content-labels"></span>'''
    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.write'):
        html += '<button id="edit-labels-button" class="for-view small-button" style="margin-left:4px;" onclick="kb.editLabels();">EDIT</button>'

    html += '''
          </span>
          <span id="status" style="margin-right:8px;"></span>
          <select id="draw-mode">
            <option value="0">Plain</option>
            <option value="1" selected>Advanced</option>
            <option value="2">HTML</option>
          </select>'''
    html += '<button id="exec-logic-button" style="margin-left:16px;" onclick="kb.confirmExecLogic();" disabled>LOGIC</button>'
    html += '<button id="copy-text-button" style="margin-left:16px;" onclick="kb.copyContent();">COPY</button>'
    html += '<button id="copy-url-button" style="margin-left:4px;" onclick="kb.showUrl();">URL</button>'
    html += '<button id="save-html-button" style="margin-left:4px;" onclick="kb.confirmSaveAsHtml();">SAVE<span style="font-size:10px;"> AS</span></button>'

    if context.has_permission('sysadmin'):
        html += '<button id="props-button" style="min-width:32px;margin-left:8px;" onclick="kb.editProps();">PROPS</button>'

    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.write'):
        html += '<button id="dup-button" style="min-width:16px;margin-left:8px;" onclick="kb.duplicate();">DUP</button>'

    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.delete'):
        html += '<button id="delete-button" class="red-button" style="min-width:32px;margin-left:8px;" onclick="kb.delete();">DELETE</button>'

    if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb.write'):
        html += '<button id="clear-button" class="red-button" style="min-width:32px;margin-left:8px;display:hidden;" onclick="kb.clearData();">CLEAR</button>'

    html += '''
        </span>
        <span id="buttons-w" class="for-edit">
          <button id="save-button" style="min-width:32px;" onclick="kb.confirmSaveAndExit();">SAVE</button>
          <button id="cancel-button" onclick="kb.confirmCancel();">CANCEL</button>
        </span>
      </div>
    </div>
    <div style="height:calc(100% - 70px);">
      <div id="content-wrp1">
        <div id="content-wrp">
'''
    html += '          <pre id="content-body">' + message + '</pre>'
    html += '''
          <div id="content-body-edt-wrp">
            <textarea id="content-body-edt" spellcheck="false"></textarea>
            <div id="content-body-st"></div>
          </div>
        </div>
        <div style="height:25px;">
          <input type="range" value="0" min="6" max="64" step="1" id="font-range" style="position:relative;top:6px;" oninput="kb.onFontRangeChanged(this);" onchange="kb.onFontRangeChanged(this);"><span id="fontsize"></span>
          <button onclick="kb.resetFontSize();">RESET</button>
          <span style="margin-left:16px;">Font: </sapn><input type="text" id="font" oninput="kb.onFontChanged(this);" onchange="kb.onFontChanged(this);">
          <span class="pseudo-link subfunc" onclick="kb.changeFont('monospace');">[monospace]</span>
          <button onclick="kb.changeFont('');">RESET</button>
          <span style="position:absolute;right:8px;margin-top:10px;">
            <span class="for-view meta-info">
              <span>CREATED: <span id="content-created-date"></span> <span id="content-created-by"></span></span><span>&nbsp;&nbsp;UPDATED: <span id="content-updated-date"></span> <span id="content-updated-by"></span><span id="content-assignee"></span></span>
            </span>
            <span class="for-edit">
              <span style="margin-left:12px;">ASSIGNEE:</span>
              <input type="text" id="content-assignee-edt" spellcheck="false">
            </span>
          </span>
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
    html += '<script src="./?res=js"></script>'
    html += '''
</head>
<body>
<div id="body1">
  <div id="content-area" class="area">
    <div>
      <div id="meta-info" class="meta-info">
        <span>CREATED: <span id="content-created-date"></span> <span id="content-created-by"></span></span><span>&nbsp;&nbsp;UPDATED: <span id="content-updated-date"></span> <span id="content-updated-by"></span></span>
        <span id="status" style="margin-left:32px;"></span>
        <span style="position:absolute;right:5px;">
          <span id="clock"></span>
        </span>
      </div>
      <div id="info-area">
        <span id="content-id"></span>
        <span id="content-title"></span>
        <span id="info-label">
      </div>
      <div style="display:inline-block;position:absolute;right:10px;">
        <span id="content-labels-area">
          <span id="content-labels"></span>
        </span>
        <span id="buttons-r">
          <select id="draw-mode">
            <option value="0">Plain</option>
            <option value="1" selected>Advanced</option>
            <option value="2">HTML</option>
          </select>
          <button id="copy-text-button" style="margin-left:8px;" onclick="kb.copyContent();">COPY</button>
        </span>
      </div>
    </div>
    <div style="height:calc(100% - 74px);">
      <div id="content-wrp1">
        <div id="content-wrp">
          <pre id="content-body"><span class="progdot">Please wait</span></pre>
          </div>
        </div>
        <div style="height:25px;">
          <input type="range" value="0" min="6" max="64" step="1" id="font-range" style="position:relative;top:6px;" oninput="kb.onFontRangeChanged(this);" onchange="kb.onFontRangeChanged(this);"><span id="fontsize"></span>
          <button onclick="kb.resetFontSize();">RESET</button>
          <span style="margin-left:16px;">Font: </sapn><input type="text" id="font" oninput="kb.onFontChanged(this);" onchange="kb.onFontChanged(this);">
        </div>
      </div>
    </div>
  </div>
</div></body></html>'''
    return html

#------------------------------------------------------------------------------
def build_forbidden_screen(context):
    html = '''<!DOCTYPE html><html><head><meta charset="utf-8">
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
    html += '''
</head>
<body>
KB SYSTEM<br>
ACCESS PRIVILEGE IS REQUIRED.
</body></html>'''
    return html

#------------------------------------------------------------------------------
def build_auth_redirection_screen():
    html = '''<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
'''
    html += '<title>' + appconfig.title + '</title>'
    html += '<style>'
    html += build_css(mode='view')
    html += '</style>'
    html += '<script src="' + ROOT_PATH + 'libs/debug.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '<script src="./?res=js"></script>'
    html += '''
<script>
$onLoad = function() {
  websys.authRedirection(location.href);
};
</script>
</head><body></body></html>'''
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
    css += 'input:-webkit-autofill {'
    css += '  -webkit-transition: all 86400s;'
    css += '  transition: all 86400s;'
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
    css += 'button:focus, input[type="button"]:focus, input[type="submit"]:focus {'
    css += '  background: ' + appconfig.button_focus_background + ';'
    css += '  color: ' + appconfig.button_focus_fgcolor + ';'
    css += '}'
    css += '''
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

    css += 'pre {'
    css += '  margin: 0;'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '}'

    css += 'a {'
    css += '  color: ' + appconfig.link_color + ';'
    css += '  text-decoration: none;'
    css += '}'

    css += 'a:hover {'
    css += '  text-decoration: underline;'
    css += '}'

    css += '.link {'
    css += '  color: ' + appconfig.link_color + ';'
    css += '}'

    css += 'textarea {'
    css += '  outline: none;'
    css += '  background: transparent;'
    css += '  color: ' + appconfig.fg_color + ';'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '  resize: none;'
    css += '}'

    css += '''
select {
  outline: none;
}

h1, h2, h3 {
  color: #a5afb7;
}
table {
  border-collapse: collapse;
}
th {
  text-align: left;
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
    css += '.text-dim {'
    css += '  color: ' + appconfig.fg_dim_color + ';'
    css += '}'
    css += '.text-red {'
    css += '  color: ' + appconfig.text_red + ';'
    css += '}'
    css += '.text-error {'
    css += '  color: ' + appconfig.text_error + ';'
    css += '}'

    css += '.small-button {'
    css += '  min-width: 30px;'
    css += '  height: 16px;'
    css += '  font-size: 8px;'
    css += '}'

    css += '''
#q {
  width: 500px;
}
#body1 {
  display: none;
  width: calc(100% - 17px);
  min-width: 1500px;
  min-height: calc(100vh - 4px);
}
.selected {
  background: #2f3a42;
}
'''
    content_height_adj = appconfig.list_height + 32
    css += '.item {'
    css += '  width: 100%;'
    css += '  background: ' + appconfig.background4 + ';'
    css += '}'
    css += '#list-area {'
    css += '  width: 100%;'
    css += '  height: ' + str(appconfig.list_height) + 'px;'
    css += '  margin: 4px 2px 2px 2px;'
    css += '  background: ' + appconfig.background2 + ';'
    css += '}'

    css += '''
#list-wrp {
  height: calc(100% - 50px);
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
    css += '.data-list-row-active {'
    css += '  background: ' + appconfig.list_hover_background + ';'
    css += '}'
    css += '#content-area {'
    css += '  width: 100%;'
    css += '  height: calc(100vh - ' + str(content_height_adj) + 'px);'
    css += '  margin: 2px;'
    css += '  background: ' + appconfig.background3 + ';'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '}'
    css += '.title {'
    css += '  color: ' + appconfig.title_color + ';'
    css += '}'
    css += '.title-disabled {'
    css += '  color: ' + appconfig.title_disabled_color + ';'
    css += '}'
    css += '.subfunc {'
    css += '  color: ' + appconfig.subfunc_color + ';'
    css += '}'
    css += '''
#info-area {
  display: inline-block;
  height: 20px;
}
#meta-info {
  margin-bottom: 4px;
  height: 1.2em;
}
.meta-info {
  color: #aaa;
}

#content-id {
  display: inline-block;
}
#content-title {
  display: inline-block;
  min-width: 400px;
  max-width: 800px;
}
#content-title-edt {
  width: 480px;
}
#content-labels-area {
  display: inline-block;
  margin-left: 32px;
  margin-right: 32px;
}
#content-labels-edt {
  width: 200px;
}
#content-assignee-edt {
  width: 150px;
}
#chk-encryption {
  margin-left: 12px;
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
  height: calc(100% - 16px);
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
  padding: 0 3px;
}
'''

    if mode != 'view':
        css += '.status:hover {'
        css += '  cursor: pointer;'
        css += '}'

    css += '''
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
  width: 128px;
}

#font {
  width: 100px;
}

.dl-link:hover {
  cursor: pointer;
}
'''
    css += 'input[type="text"]:disabled,textarea:disabled,.input-label-disable {'
    css += '  color: ' + appconfig.text_disabled + ';'
    css += '}'

    css += '.row-selected {'
    css += '  background: ' + appconfig.list_row_selected_bg + ';'
    css += '}'

    css += '.comment {'
    css += '  color: ' + appconfig.comment_color + ';'
    css += '}'

    css += '''
.tools-output {
  border: none;
  border-bottom: 1px solid #333;
}

.code-s {
  border-radius: 3px;
  padding: 1px 2px;
  background: #555;
}
.code {
  display: inline-block;
  border: 1px solid #888;
  border-radius: 3px;
  padding: 8px;
  margin: 1px 0;
}
'''
    return css

#------------------------------------------------------------------------------
def main():
    context = web.on_access()
    res = util.get_request_param('res')
    if res == 'js':
        js.main()
        return

    scm = util.get_request_param('scm', '')
    if scm == '':
        scm = kb.get_default_scm()

    id = util.get_request_param('id')

    if kb.is_access_allowed(context):
        if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb'):
            html = build_main_screen(context)
        else:
            token = util.get_request_param('token', '')
            if token != '':
                if kb.is_valid_token(token, scm, id):
                    html = build_view_screen(context)
                else:
                    html = build_forbidden_screen(context)
            else:
                # public-mode
                html = build_main_screen(context)
    elif id is not None:
        token = util.get_request_param('token')
        if token is None:
            html = build_auth_redirection_screen()
        else:
            html = build_view_screen(context)
    else:
        html = build_auth_redirection_screen()

    util.send_html(html)
