#==============================================================================
# Knowledge Base System
# Copyright (c) 2021 Takashi Harano
#==============================================================================
import os
import sys

import appconfig
import style

ROOT_PATH = appconfig.root_path

sys.path.append(os.path.join(os.path.dirname(__file__), ROOT_PATH + 'libs'))
import util

util.append_system_path(__file__, ROOT_PATH + 'websys')
import websys

import kb
import js

#------------------------------------------------------------------------------
def build_main_screen(context, scm):
    default_message = get_default_message(scm)

    scm_props = kb.load_scm_props(scm)
    scm_name = scm
    if 'name' in scm_props and scm_props['name'] != '':
        scm_name = scm_props['name']

    html = '''<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
<meta name="viewport" content="width=device-width,initial-scale=1">
'''
    html += '<title>' + appconfig.title + '</title>'
    html += '<style>'
    html += style.build_css(mode='main')
    html += '</style>'
    html += '<script src="' + ROOT_PATH + 'libs/sha.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/debug.js"></script>'
    html += '<script src="' + ROOT_PATH + 'libs/util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '<script src="kb.js"></script>'
    html += '<script src="./?res=js&scm=' + scm + '"></script>'
    html += '''
</head>
<body>
<div id="body1">
  <div id="list-area" class="area">
    <div style="position:relative;height:20px;">

'''
    html += '      <a href="' + appconfig.home_path + '" style="margin-right:4px;">HOME</a>'
    html += '      <span id="system-name" style="color:' + appconfig.system_name_color + ';">' + appconfig.system_name + '</span>'

    html += '      <span id="scm-name" style="color:' + appconfig.system_name_color + ';">'
    if scm != kb.get_default_scm_id():
        html += ' - ' + scm_name
    html += '</span>'

    username = kb.get_user_name(context)
    if username == '':
        username = context.get_user_id()

    html += '      <span style="position:absolute;right:0;">'
    html += '        <span class="pseudo-link text-muted" style="margin-right:10px;" onclick="kb.openUserDialog();">' + username + '</span>'
    html += '        <span id="clock"></span>'
    html += '''
      </span>
    </div>'''

    html += '    <div style="position:relative;height:20px;">'

    if kb.can_operate(context, scm, 'write'):
        html += '      <button id="new-button" style="margin-right:32px;" onclick="kb.createNew();">NEW</button>'

    html += '      <span id="id-label">ID:</span> <input type="text" id="id-txt" class="q-txt" spellcheck="false" style="width:46px;">'
    html += '      <span id="keyqord-label" style="margin-left:8px;">KEYWORD:</span> '
    html += '<input type="text" id="q" class="q-txt" spellcheck="false" style="margin-left:4px;">'
    html += '<button id="search-button" style="margin-left:4px;min-width:32px;" onclick="kb.search();">SEARCH</button>'
    html += '<button class="small-button" style="margin-left:4px;" onclick="kb.clearKeywords();">CLEAR</button>'
    html += '<button id="all-button" style="margin-left:16px;min-width:32px;" onclick="kb.getDataListAll();">LIST ALL</button>'

    html += '<span id="limit-label" style="margin-left:16px;"><span style="cursor:pointer;" onclick="kb.toggleLimit();">Limit</span>:</span>'
    html += '<input type="text" id="limit" class="q-txt" spellcheck="false" style="width:50px;">'

    html += '<button style="margin-left:36px;" onclick="kb.openNewWindow();">NEW WIN</button>'

    html += '      <span style="position:absolute;right:0;">'

    if kb.can_operate(context, scm, 'write'):
        html += '        <button id="touch-button" style="margin-right:16px;" onclick="kb.touch();" disabled>TOUCH</button>'

    if kb.can_operate(context, scm, 'export'):
        html += '        <button id="export-button" style="margin-left:4px;min-width:32px;" onclick="kb.export();">EXPORT</button>'

    html += '        <button id="export-button" style="min-width:32px;" onclick="kb.openTools();">TOOLS</button>'
    html += '        <button id="schema-button" style="min-width:32px;" onclick="kb.openSchemaDialog();">SCHEMA</button>'
    html += '      </span>'

    html += '''
    </div>
    <div style="height:1em;">
      <span id="info"></span>
      <div style="display:inline-block;position:absolute;right:10px;color:#aaa;"><span id="all-data-size"></span></div>
    </div>
    <div id="list-wrp">
      <pre id="list"></pre>
    </div>
  </div>
  <div id="content-area" class="area">
    <div id="adjuster"></div>
    <div id="content-header">
      <div id="info-area">
'''
    if kb.can_operate(context, scm, 'write'):
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

          <label class="switch" style="margin-left:8px;">
            <input type="checkbox" id="preview-mode" onchange="kb.switchPreviewMode();">
            <span class="slider round"></span>
          </label><span style="margin-left:6px;">Preview</span>

          <span style="margin-left:12px;">STATUS:</span>
          <select id="select-status"></select>

          <button id="set-pw-button" style="margin-left:16px;" onclick="kb.openSetPwDialog();">PW</button><div id="pw-status" style="display:inline-block;margin-left:2px;width:16px;"></div>
          <button id="edit-logic-button" style="margin-left:2px;" onclick="kb.openLogicEditor();" disabled>LOGIC</button>
'''

    if context.has_permission('sysadmin'):
        html += '          <input type="checkbox" id="chk-encryption"><label for="chk-encryption">Encrypt</label>'
        html += '          <input type="checkbox" id="chk-silent"><label for="chk-silent">Silent</label>'

    html += '''
        </span>
      </div>
      <div style="display:inline-block;position:absolute;right:10px;">
        <span id="buttons-r" class="for-view">
          <span id="content-labels-area">
            <span id="content-labels"></span>'''
    if context.has_permission('sysadmin'):
        html += '<button id="edit-labels-button" class="for-view small-button" style="margin-left:4px;" onclick="kb.editLabels();">EDIT</button>'

    html += '''
          </span>
          <span id="status" style="margin-right:8px;"></span>
          <select id="draw-mode">
            <option value="0">Plain</option>
            <option value="1" selected>Advanced</option>
            <option value="2">HTML</option>
          </select>'''
    html += '<button id="exec-logic-button" style="margin-left:16px;margin-right:8px;" onclick="kb.confirmExecLogic();" disabled>LOGIC</button>'
    html += '<button id="props-button" style="min-width:32px;margin-left:8px;" onclick="kb.editProps();">PROPS</button>'

    html += '<button id="copy-text-button" style="margin-left:8px;" onclick="kb.copyContent();">COPY</button>'
    html += '<button id="copy-url-button" style="margin-left:4px;" onclick="kb.showUrl();">URL</button>'
    html += '<button id="save-html-button" style="margin-left:4px;" onclick="kb.confirmSaveAsHtml();">SAVE<span style="font-size:10px;"> AS</span></button>'

    if kb.can_operate(context, scm, 'write'):
        html += '<button id="dup-button" style="min-width:16px;margin-left:8px;" onclick="kb.duplicate();">DUP</button>'

    if kb.can_operate(context, scm, 'delete'):
        html += '<button id="delete-button" class="red-button" style="min-width:32px;margin-left:8px;" onclick="kb.delete();">DELETE</button>'

    if kb.can_operate(context, scm, 'write'):
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
    html += '          <pre id="content-body">' + default_message + '</pre>'
    html += '''
          <div id="content-body-edt-wrp">
            <textarea id="content-body-edt" spellcheck="false"></textarea>
            <div id="content-body-st"></div>
          </div>
        </div>
        <div style="position:absolute;bottom:8px;height:25px;width:calc(100% - 8px);">
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
def get_default_message(scm):
    workspace_path = kb.get_workspace_path()
    msg_path = workspace_path + 'info.txt'
    message = util.read_text_file(msg_path, default='')
    if message != '':
        return message

    data = kb.load_data(scm, 'info')
    if data['status'] == 'OK':
        content = data['content']
        message = content['BODY']

    return message

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
    html += style.build_css(mode='view')
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
    html += 'kb.token = \'' + websys.get_raw_request_param('token', '') + '\';\n'
    html += '</script>'
    html += '<script src="kb.js"></script>'
    html += '<script src="./?res=js"></script>'
    html += '''
</head>
<body>
<div id="body1">
  <div id="content-area" class="area">
    <div id="content-header">
      <div id="meta-info" class="meta-info">
        <span>CREATED: <span id="content-created-date"></span> <span id="content-created-by"></span></span><span>&nbsp;&nbsp;UPDATED: <span id="content-updated-date"></span> <span id="content-updated-by"></span></span>
        <span id="status" style="margin-left:32px;"></span>
        <span style="position:absolute;right:0;">
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
    <div style="height:calc(100% - 80px);">
      <div id="content-wrp1">
        <div id="content-wrp">
          <pre id="content-body"><span class="progdot">Please wait</span></pre>
          </div>
        </div>
        <div style="position:absolute;bottom:8px;height:25px;width:calc(100% - 8px);">
          <input type="range" value="0" min="6" max="64" step="1" id="font-range" style="position:relative;top:6px;" oninput="kb.onFontRangeChanged(this);" onchange="kb.onFontRangeChanged(this);"><span id="fontsize"></span>
          <button onclick="kb.resetFontSize();">RESET</button>
          <span style="margin-left:16px;">Font: </sapn><input type="text" id="font" oninput="kb.onFontChanged(this);" onchange="kb.onFontChanged(this);">
          <span class="pseudo-link subfunc" onclick="kb.changeFont('monospace');">[monospace]</span>
          <button onclick="kb.changeFont('');">RESET</button>
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
    html += style.build_css(mode='main')
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
def build_auth_redirection_screen(root_path):
    html = '<!DOCTYPE html>'
    html += '<html>'
    html += '<head>'
    html += '<meta charset="utf-8">'
    html += '<script src="' + root_path + 'libs/util.js"></script>'
    html += '<script src="' + root_path + 'websys/websys.js"></script>'
    html += '<script>'
    html += 'websys.init(\'' + root_path + '\');'
    html += '$onLoad = function() {websys.authRedirection(location.href);};'
    html += '</script>'
    html += '</head>'
    html += '<body></body>'
    html += '</html>'
    return html

#------------------------------------------------------------------------------
def main():
    context = websys.on_access()

    scm = util.get_request_param('scm', '')
    if scm == '':
        scm = kb.get_default_scm_id()

    res = util.get_request_param('res')
    if res == 'js':
        res = util.get_request_param('res')
        js.main(scm)
        return

    id = util.get_request_param('id')

    if kb.is_authorized(context):
        if kb.has_privilege(context, 'sysadmin') or kb.has_privilege(context, 'kb'):
            html = build_main_screen(context, scm)
        else:
            token = util.get_request_param('token', '')
            if token != '':
                if kb.is_valid_token(token, scm, id):
                    html = build_view_screen(context)
                else:
                    html = build_forbidden_screen(context)
            else:
                # public-mode
                html = build_main_screen(context, scm)
    elif kb.is_anonymous_allowed(scm):
        html = build_main_screen(context, scm)
    elif id is not None:
        token = util.get_request_param('token')
        if token is None:
            html = build_auth_redirection_screen(ROOT_PATH)
        else:
            html = build_view_screen(context)
    else:
        html = build_auth_redirection_screen(ROOT_PATH)

    util.send_html(html)
