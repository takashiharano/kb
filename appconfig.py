root_path = '../../'
workspace_path = root_path + '../private/kb/'
home_path = root_path
user_name_lang = 'en'

# auth / auth|read|write|delete|export / full
access_control = 'auth'

title = 'KB'
system_name = 'Knowledge Base System'
system_name_color = '#ddd'

list_max = 100
list_height = 256

border_color = '#888'
fg_color = '#fff'
fg_color_muted = '#c0c6c8'
background1 = '#282828'
background_upper = '#282828'
background_lower = '#282828'

title_color = '#fff'
colum_header_fg_color = '#e6edf3'
list_border = '1px solid #888'
list_bg_odd = '#282828'
list_bg_even = '#323232'
list_hover_background = '#4c4c4c'
list_row_selected_bg = '#424242'
title_disabled_color = '#aaa'

text_red = '#faa'
text_disabled = '#888'
text_error = '#f66'

input_border_color = '#aaa'

button_border = '#1f6feb'
button_background = '#1f6feb'
button_fgcolor = '#fff'

button_focus_background = '#0275d8'
button_focus_fgcolor = '#fff'

button_hover_background = '#109ddb'
button_hover_fgcolor = '#fff'

button_disabled_border = '#505050'
button_disabled_background = '#505050'
button_disabled_fgcolor = '#9aa0af'

button_red_border = '#8a251e'
button_red_background = '#8a251e'
button_red_fgcolor = '#fff'
button_red_focus_background = '#d9534f'
button_red_focus_fgcolor = '#fff'
button_red_hover_background = '#f64'
button_red_hover_fgcolor = '#fff'

label_fgcolor = '#ddd'
label_background = '#666'
label_hover_background = '#888'

status_label_ok_fgcolor = '#d4dfe8'
status_label_ok_background = '#081f39'
status_label_err_fgcolor = '#faf4ef'
status_label_err_background = '#300406'
status_label_encrypted_fgcolor = '#ecf4eb'
status_label_encrypted_background = '#081c0d'

dialog_border = '#888'
dialog_fgcolor = '#fff'
dialog_background = '#101010'

color_border_danger = '#a84040'

clock_color = '#bbff67'
link_color = '#66a0ff'
comment_color = '#00bfff'

code_border = '1px solid #707070'
code_background = '#2e2e2e'

subfunc_color = '#a8caf0'

state_list = [
    {'name': 'LOCKED', 'color': '#f44'},
    {'name': 'IN-PROGRESS', 'color': '#0c8'},
    {'name': 'FIXME', 'color': '#d85050'},
    {'name': 'TODO', 'color': '#e08020'},
    {'name': '???', 'color': '#67d'},
    {'name': 'ON-HOLD', 'color': '#cdbc38'},
    {'name': 'INCOMPLETE', 'color': '#a8a'},
    {'name': 'UNRESOLVED', 'color': '#a88'},
    {'name': 'OBSOLETE', 'color': '#888'}
]

default_data_encryption = True
data_encryption_key = 'xyz'
default_encryption_key = 'xyz'

token_valid_sec = 259200
token_keys = ['1']
api_tokens = ['']
