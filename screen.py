#==============================================================================
# Knowledge Base System
# Copyright 2021 Takashi Harano
# Released under the MIT License
#==============================================================================
import os
import sys

import appconfig
import style

ROOT_PATH = appconfig.root_path

sys.path.append(appconfig.libs_path)
import util

util.append_system_path(__file__, ROOT_PATH + 'websys')
import websys

import kb
import js

#------------------------------------------------------------------------------
def build_main_screen(context, repo):
    default_message = get_default_message(repo)

    repo_props = kb.load_repo_props(repo)
    repo_name = repo
    if 'name' in repo_props and repo_props['name'] != '':
        repo_name = repo_props['name']

    html = '''<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
<meta name="viewport" content="width=device-width,initial-scale=1">
'''
    libs_url = appconfig.libs_url_path

    html += '<title>' + appconfig.title + '</title>'
    html += '<link rel="stylesheet" href="./style.css" />'
    html += '<style>' + style.build_css() + '</style>'
    html += '<script src="' + libs_url + 'sha.js"></script>'
    html += '<script src="' + libs_url + 'debug.js"></script>'
    html += '<script src="' + libs_url + 'util.js"></script>'
    html += '<script src="' + ROOT_PATH + 'websys/websys.js"></script>'
    html += '<script src="kb.js"></script>'
    html += '<script src="./?res=js&repo=' + repo + '"></script>'

    html += '''
</head>
<body>
<div id="body1">
  <div id="list-area" class="area">
    <div style="position:relative;height:20px;">

'''
    html += '      <a href="' + appconfig.home_path + '" style="margin-right:4px;">HOME</a>'
    html += '      <span id="system-name" class="pseudo-link" onclick="kb.openAboutDialog();">' + appconfig.system_name + '</span>'

    html += '      <span id="repo-name">'
    if repo != kb.get_default_repo_id():
        html += ' - ' + repo_name
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

    if kb.can_operate(context, repo, 'write'):
        html += '      <button id="new-button" style="margin-right:32px;" onclick="kb.createNew();">NEW</button>'

    html += '      <span id="id-label">ID:</span> <input type="text" id="id-txt" class="q-txt" spellcheck="false" style="width:46px;">'
    html += '      <span id="keyqord-label" style="margin-left:8px;">KEYWORD:</span> '
    html += '<input type="text" id="q" class="q-txt" spellcheck="false" style="margin-left:4px;">'
    html += '<button id="search-button" style="margin-left:4px;min-width:32px;" onclick="kb.search();">SEARCH</button>'
    html += '<button class="small-button" style="margin-left:4px;" onclick="kb.clearKeywords();">CLEAR</button>'
    html += '<button id="all-button" style="margin-left:16px;min-width:32px;" onclick="kb.getDataListAll();">LIST ALL</button>'

    html += '<span id="limit-label" style="margin-left:16px;"><span style="cursor:pointer;" onclick="kb.toggleLimit();">Limit</span>:</span>'
    html += '<input type="text" id="limit" class="q-txt" style="width:50px;">'

    html += '<button style="margin-left:36px;" onclick="kb.openNewWindow();">NEW WIN</button>'

    html += '      <span style="position:absolute;right:0;">'

    if kb.can_operate(context, repo, 'write'):
        html += '        <button id="touch-button" style="margin-right:16px;" onclick="kb.touch();" disabled>TOUCH</button>'

    if kb.can_operate(context, repo, 'export'):
        html += '        <button id="export-button" style="margin-left:4px;min-width:32px;" onclick="kb.export();">EXPORT</button>'

    html += '        <button id="export-button" style="width:54px;" onclick="kb.openTools();">TOOLS</button>'
    html += '        <button id="schema-button" style="width:54px;" onclick="kb.openRepoDialog();">REPO</button>'
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
    if kb.can_operate(context, repo, 'write'):
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
        html += '<button id="edit-labels-button" class="for-view small-button" style="margin-left:4px;" onclick="kb.editLabels();">LABELS</button>'

    html += '''
          </span>
          <span id="status" style="margin-right:8px;"></span>
          <select id="draw-mode">
            <option value="0">Plain</option>
            <option value="1" selected>MD-Like</option>
            <option value="2">HTML</option>
          </select>'''
    html += '<button id="exec-logic-button" style="margin-left:16px;margin-right:8px;" onclick="kb.confirmExecLogic();" disabled>LOGIC</button>'
    html += '<button id="props-button" style="min-width:32px;margin-left:8px;" onclick="kb.editProps();">PROPS</button>'

    html += '<button id="copy-text-button" style="margin-left:8px;" onclick="kb.copyContent();">COPY</button>'
    html += '<button id="copy-url-button" style="margin-left:4px;" onclick="kb.showUrl();">URL</button>'
    html += '<button id="save-html-button" style="margin-left:4px;" onclick="kb.confirmSaveAsHtml();">SAVE<span style="font-size:10px;"> AS</span></button>'

    if kb.can_operate(context, repo, 'write'):
        html += '<button id="dup-button" style="min-width:16px;margin-left:8px;" onclick="kb.duplicate();">DUP</button>'

    if kb.can_operate(context, repo, 'delete'):
        html += '<button id="delete-button" class="red-button" style="min-width:32px;margin-left:8px;" onclick="kb.delete();">DELETE</button>'

    if kb.can_operate(context, repo, 'write'):
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
          <span style="margin-left:16px;">Font: </sapn><input type="text" id="font" spellcheck="false" oninput="kb.onFontChanged(this);" onchange="kb.onFontChanged(this);">
          <button id="monospace-button-w" class="small-button" onclick="kb.toggleMonospaceFont('');">monospace</button>
          <span style="position:absolute;right:8px;margin-top:10px;">
            <span class="for-view meta-info">
              <span>CREATED: <span id="content-created-date"></span> <span id="content-created-by"></span></span><span>&nbsp;&nbsp;UPDATED: <span id="content-updated-date"></span> <span id="content-updated-by"></span></span>
            </span>
          </span>
        </div>
      </div>
    </div>
  </div>
</div></body></html>'''
    return html

#------------------------------------------------------------------------------
def get_default_message(repo):
    workspace_path = kb.get_workspace_path()
    msg_path = workspace_path + 'info.txt'
    message = util.read_text_file(msg_path, default='')
    if message != '':
        return message

    data = kb.load_data(repo, 'info')
    if data['status'] == 'OK':
        content = data['content']
        message = content['BODY']

    return message

#------------------------------------------------------------------------------
def main():
    context = websys.on_access()

    repo = util.get_request_param('repo', '')
    if repo == '':
        repo = kb.get_default_repo_id()

    res = util.get_request_param('res')
    if res == 'js':
        res = util.get_request_param('res')
        js.main(repo)
        return

    if kb.is_authorized(context) or kb.is_anonymous_allowed(repo):
        html = build_main_screen(context, repo)
    else:
        html = websys.build_auth_redirection_screen(ROOT_PATH)

    util.send_html(html)
