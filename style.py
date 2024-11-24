#==============================================================================
# Knowledge Base System - Stylesheet
# Copyright (c) 2024 Takashi Harano
#==============================================================================
import appconfig

#------------------------------------------------------------------------------
def build_css(mode):
    css = ''
    css += 'body {'
    css += '  width: 100%;'
    css += '  height: calc(100vh - 32px);'
    css += '  margin: 0;'
    css += '  background: ' + appconfig.background1 + ';'
    css += '  color: ' + appconfig.fg_color + ';'
    css += '  font-size: 14px;'
    css += '  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;'
    css += '}'
    css += 'input {'
    css += '  font-size: 14px;'
    css += '  border: none;'
    css += '  border-bottom: solid 1px ' + appconfig.input_border_color + ';'
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
    css += '  font-size: 14px;'
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
    css += '  padding: 4px;'
    css += '  background: transparent;'
    css += '  border: solid 1px ' + appconfig.input_border_color + ';'
    css += '  border-radius: 4px;'
    css += '  white-space: pre;'
    css += '  color: ' + appconfig.fg_color + ';'
    css += '  font-size: 14px;'
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
    css += '  border-radius: 6px;'
    css += '  padding: 4px 8px;'
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
    css += '.text-muted {'
    css += '  color: ' + appconfig.fg_color_muted + ';'
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
    css += '  font-size: 10px;'
    css += '}'

    css += '''
#q {
  width: 500px;
}
#body1 {
  display: none;
  width: calc(100% - 21px);
  min-width: 1500px;
  min-height: calc(100% - 4px);
}
.selected {
  background: #2f3a42;
}
'''
    content_height_adj = appconfig.list_height + 32
    css += '.item {'
    css += '  width: 100%;'
    css += '  background: ' + appconfig.background_upper + ';'
    css += '}'
    css += '#list-area {'
    css += '  width: 100%;'
    css += '  height: ' + str(appconfig.list_height) + 'px;'
    css += '  margin: 4px 2px 2px 2px;'
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
    css += '.colum-header {'
    css += '  color: ' + appconfig.colum_header_fg_color + ';'
    css += '  cursor: pointer;'
    css += '}'
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
    css += '  background: ' + appconfig.background_lower + ';'
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
  width: 420px;
}
#content-labels-area {
  display: inline-block;
  margin-left: 32px;
  margin-right: 32px;
}
#content-labels-edt {
  width: 150px;
}
#content-assignee-edt {
  width: 150px;
}
#chk-encryption {
  margin-left: 8px;
}
#content-header {
  margin-bottom: 10px;
}
#content-wrp1 {
  width: calc(100% - 6px);
  min-width: 70%;
  height: 100%;
  float: left;
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
  height: calc(100% - 18px);
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
    css += '  font-size: 12px;'
    css += '}'

    if mode != 'view':
        css += '.label:hover {'
        css += '  background: ' + appconfig.label_hover_background + ';'
        css += '  cursor: pointer;'
        css += '}'

    css += '.dialog {'
    css += '  font-size: 16px;'
    css += '  border-radius: 6px !important;'
    css += '  border: 1px solid ' + appconfig.dialog_border + ';'
    css += '  background: ' + appconfig.dialog_background + '!important;'
    css += '  color: ' + appconfig.dialog_fgcolor + ' !important;'
    css += '}'
    css += '.status-label-ok {'
    css += '  color: ' + appconfig.status_label_ok_fgcolor + ';'
    css += '  background: ' + appconfig.status_label_ok_background + ';'
    css += '}'

    css += '.color-border-danger {'
    css += '  border: 1px solid ' + appconfig.color_border_danger + ';'
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
  font-size: 12px;
}
'''

    if mode != 'view':
        css += '.status:hover {'
        css += '  cursor: pointer;'
        css += '}'


    css += 'table.item-list,td.item-list,th.item-list {'
    css += '  border: ' + appconfig.list_border + ';'

    css += '''
  border-top: none;
  border-right: none;
  border-left: none;
  border-collapse: collapse;
  white-space: nowrap;
  font-family: Consolas, Monaco, Menlo, monospace, sans-serif;
}

.category {
  border-radius: 2em;
  padding: 0 7px;
  font-size: 12px;
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

    css += '.row-odd {'
    css += '  background: ' + appconfig.list_bg_odd + ';'
    css += '}'
    css += '.row-even {'
    css += '  background: ' + appconfig.list_bg_even + ';'
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

.text-left {
  text-align: left;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.cat-img {
  max-width: 50px;
  max-height: 14px;
}

.code-s {
  border-radius: 3px;
  padding: 1px 2px;
  background: #555;
}
.code {
  display: inline-block;
  min-width: 420px;
  padding: 8px;
  margin: 1px 0;
  border-radius: 3px;
'''
    css += '  border: ' + appconfig.code_border + ';'
    css += '  background: ' + appconfig.code_background + ';'
    css += '}'

    css += '''
.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #888;
  transition: .1s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  top: 2px;
  left: 3px;
  background-color: #fff;
  transition: .1s;
}

input:checked + .slider {
  background-color: #2196f3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
  transform: translateX(16px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
'''

    return css
