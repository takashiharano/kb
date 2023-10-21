root_path = '../../'
workspace_path = root_path + '../private/kb/'
home_path = root_path

# auth / auth|read|write|delete|export / full
access_control = 'auth'

title = 'KB'
system_name = 'Knowledge Base System'
system_name_color = '#ddd'

list_max = 100
list_height = 240

border_color = '#404389'
fg_color = '#fff'
fg_dim_color = '#c0c6c8'
background1 = '#000'
background_upper = 'linear-gradient(130deg, rgba(48,40,99,0.4),rgba(0,0,0,0))'
background_lower = 'linear-gradient(150deg, rgba(0,0,0,0.8),rgba(48,40,99,0.5))'

title_color = '#def'
list_border = '1px solid #565866'
list_hover_background = '#1e203d'
list_row_selected_bg = '#282a4c'
title_disabled_color = '#aaa'

text_red = '#faa'
text_disabled = '#888'
text_error = '#f66'

input_border_color = '#404389'

button_border = '#688EF2'
button_fgcolor = '#688EF2'
button_background = '#000'
button_focus_fgcolor = '#fff'
button_focus_background = '#0275d8'
button_hover_fgcolor = '#fff'
button_hover_background = '#109DDB'
button_disabled_border = '#888'
button_disabled_fgcolor = '#888'
button_disabled_background = '#000'

button_red_border = '#d9534f'
button_red_fgcolor = '#d9534f'
button_red_background = '#000'
button_red_focus_background = '#d9534f'
button_red_focus_fgcolor = '#fff'
button_red_hover_fgcolor = '#fff'
button_red_hover_background = '#f64'

label_fgcolor = '#ddd'
label_background = '#666'
label_hover_background = '#888'

status_label_ok_fgcolor = '#d4dfe8'
status_label_ok_background = '#081f39'
status_label_err_fgcolor = '#faf4ef'
status_label_err_background = '#300406'
status_label_encrypted_fgcolor = '#ecf4eb'
status_label_encrypted_background = '#081c0d'

dialog_border = '#4670f8'
dialog_fgcolor = '#fff'
dialog_background = '#000'

clock_color = '#88E895'
link_color = '#b8d8ff'
comment_color = '#00bfff'

subfunc_color = '#cde'

state_list = [
    {'name': 'LOCK', 'fgcolor': '#fff', 'bgcolor': '#f00'},
    {'name': 'IN-PROGRESS', 'fgcolor': '#fff', 'bgcolor': '#0052cc'},
    {'name': 'FIXME', 'fgcolor': '#fff', 'bgcolor': '#c84643'},
    {'name': 'TODO', 'fgcolor': '#fff', 'bgcolor': '#c06020'},
    {'name': '???', 'fgcolor': '#fff', 'bgcolor': '#238'},
    {'name': 'NEED-REVIEW', 'fgcolor': '#fff', 'bgcolor': '#064'},
    {'name': 'ON-HOLD', 'fgcolor': '#220', 'bgcolor': '#e1ab39'},
    {'name': 'INCOMPLETE', 'fgcolor': '#fff', 'bgcolor': '#424'},
    {'name': 'UNRESOLVED', 'fgcolor': '#fff', 'bgcolor': '#400'},
    {'name': 'OBSOLETE', 'fgcolor': '#a0a0a0', 'bgcolor': '#444'}
]

default_data_encryption = True
data_encryption_key = 'xyz'
default_encryption_key = 'xyz'

token_valid_sec = 259200
token_keys = ['1']
api_tokens = ['']
