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
import appconfig
import web
import kb

#------------------------------------------------------------------------------
def get_request_param(key):
    return web.get_request_param(key)

def send_result_json(status, body):
    web.send_result_json(status, body)

#------------------------------------------------------------------------------
def is_valid_token(token):
    for v in appconfig.tokens:
        if v == token:
            return True
    return False

def has_privilege(context):
    if not context['authorized']:
        token = get_request_param('token')
        if not is_valid_token(token):
            return False
    return True

#------------------------------------------------------------------------------
def get_data(context):
    if has_privilege(context):
        status = 'OK'
        id = get_request_param('id')
        result_data = kb.get_data(id, True)
    else:
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)

#------------------------------------------------------------------------------
def download_b64content(context):
    if has_privilege(context):
        status = 'OK'
        id = get_request_param('id')
        kb.download_b64content(id)
    else:
        kb.send_error_file('NO_ACCESS_RIGHTS')

#------------------------------------------------------------------------------
def proc_save(context):
    id = get_request_param('id')
    data_json = get_request_param('data')
    new_data = util.from_json(data_json)
    data = kb.get_data(id)

    if id == '' or data['U_DATE'] == new_data['org_u_date']:
        user = get_user_name(context)
        saved_id = kb.save_data(id, new_data, user)
        result = {
            'status': 'OK',
            'saved_id': saved_id,
            'U_DATE': None,
            'U_USER': None
        }
    else:
        result = {
            'status': 'CONFLICT',
            'saved_id': None,
            'U_DATE': data['U_DATE'],
            'U_USER': data['U_USER']
        }

    return result

def get_user_name(context):
    if 'user_info' in context:
        user_info = context['user_info']
        if 'name' in user_info:
            return user_info['name']
    return ''

#------------------------------------------------------------------------------
def proc_api(context, act):
    status = 'OK'
    if act == 'list':
        id = get_request_param('id')
        result_data = kb.get_list(id, True)
    elif act == 'search':
        id = get_request_param('id')
        if id is None:
            q = get_request_param('q')
            q = util.decode_base64(q)
            result_data = kb.search_data(q, True)
        else:
            result_data = kb.get_data(id, True)
    elif act == 'save':
        result = proc_save(context)
        status = result['status']
        result_data = {
            'saved_id': result['saved_id'],
            'U_DATE': result['U_DATE'],
            'U_USER': result['U_USER']
        }
    elif act == 'delete':
        id = get_request_param('id')
        status = kb.delete_data(id)
        result_data = None
    elif act == 'check_exists':
        id = get_request_param('id')
        result_data = kb.check_exists(id)
    elif act == 'get_init_info':
        result_data = {
            'state_list': appconfig.state_list,
            'tokens': appconfig.tokens
        }
    else:
        act = web.get_raw_request_param('act')
        if act == 'export':
            b = kb.export_data()
            util.send_binary(b, filename='kbdata.zip')
            return
        else:
            status = 'NO_SUCH_ACTION'
            result_data = None

    send_result_json(status, result_data)

#------------------------------------------------------------------------------
def main():
    context = web.on_access()

    act = get_request_param('act')
    if act == 'get':
        get_data(context)
    elif act == 'dlb64content':
        download_b64content(context)
    else:
        if context['authorized']:
            proc_api(context, act)
        else:
            send_result_json('FORBIDDEN', None)
