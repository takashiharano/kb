root_path = '../'
workspace_path = root_path + '../private/kb/'
home_path = root_path
user_name_lang = 'en'

# auth / auth|read|write|delete|export / full
access_control = 'auth'

title = 'KB'
system_name = 'Knowledge Base System'

list_max = 100
list_height = 256

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
