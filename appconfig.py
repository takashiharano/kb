root_path = '../'
app_id = 'kb'

import os
libs_dir = 'libs'
libs_path = os.path.join(os.path.dirname(__file__), root_path, libs_dir)
libs_url_path = root_path + libs_dir + '/'

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
    {'value': 'draft', 'label': 'DRAFT', 'color': '#ccc', 'background': '#555', 'border': 'none'},
    {'value': 'fixme', 'label': 'FIXME', 'color': '#e5d7d5', 'border': 'solid 1px #a36372'},
    {'value': 'unresolved', 'label': 'UNRESOLVED', 'color': '#c8bebe', 'background': '#5b1e1e', 'border': 'none'},
    {'value': 'obsolete', 'label': 'OBSOLETE', 'color': '#a29f9b', 'background': '#474645', 'border': 'none'}
]

default_http_scramble = True
default_data_scramble = True
data_scramble_key = 'xyz'
default_scramble_key = 'xyz'

api_tokens = ['']
