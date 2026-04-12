root_path = '../../'
workspace_path = root_path + '../private/kb/'
home_path = root_path
user_name_lang = 'en'

# auth / auth|read|write|delete|export / full
access_control = 'auth'

title = 'KB'
system_name = 'Knowledge Base System'
system_name_color = '#bfc6d6'

list_max = 100
list_height = 256

border_color = '#888'
fg_color = '#e8e8e8'
fg_color_muted = '#bfc6d6'
fg_color_muted2 = '#a9b0c2'
background1 = '#1e222a'
background_upper = '#1e222a'
background_lower = '#1e222a'

title_color = '#E8E8E8'
colum_header_fg_color = '#ddd'
list_border = '1px solid #888'
list_bg_odd = '#1e222a'
list_bg_even = '#262b35'
list_hover_background = '#2c3845'
list_row_selected_bg = '#313b4d'
title_disabled_color = '#aaa'

text_red = '#faa'
text_disabled = '#888'
text_error = '#f66'

input_border_color = '#aaa'

button_border = '#295AA2'
button_background = '#26518b'
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
link_color = '#9fcced'
comment_color = '#8e9caa'

code_border = '1px solid #4A5060'
code_background = '#2a2e38'

subfunc_color = '#a8caf0'

state_list = [
    {'name': 'LOCKED', 'color': '#d4aeb6', 'border': 'solid 1px #7c4e58'},
    {'name': 'IN-PROGRESS', 'color': '#c8e7ff', 'background': '#263e5a', 'border': 'none'},
    {'name': 'FIXME', 'color': '#f9c6c6', 'background': '#752020', 'border': 'none'},
    {'name': 'TODO', 'color': '#dfcbaa', 'background': '#884c14', 'border': 'none'},
    {'name': '???', 'color': '#d0d6e0', 'background': '#38465a', 'border': 'none'},
    {'name': 'ON-HOLD', 'color': '#d8d0b8', 'background': '#5a471a', 'border': 'none'},
    {'name': 'INCOMPLETE', 'color': '#d5cfe0', 'background': '#392f55', 'border': 'none'},
    {'name': 'UNRESOLVED', 'color': '#c8bebe', 'background': '#5b1e1e', 'border': 'none'},
    {'name': 'OBSOLETE', 'color': '#a29f9b', 'background': '#474645', 'border': 'none'}
]

default_data_encryption = True
data_encryption_key = 'xyz'
default_encryption_key = 'xyz'

token_valid_sec = 259200
token_keys = ['1']
api_tokens = ['']
