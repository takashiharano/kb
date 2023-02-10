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
import bsb64

util.append_system_path(__file__, ROOT_PATH)
util.append_system_path(__file__, ROOT_PATH + 'websys/bin')
import appconfig
import web
import kb

#------------------------------------------------------------------------------
# Returns None if the value not found
def get_request_param(key):
    return web.get_request_param(key)

def send_result_json(status, body):
    web.send_result_json(status, body)

#------------------------------------------------------------------------------
def has_privilege(context, id):
    if not kb.is_access_allowed(context):
        token = get_request_param('token')
        try:
            if not is_valid_token(token, id):
                return False
        except:
            return False
    return True

def is_valid_token(token_enc, target_id):
    token = bsb64.decode_string(token_enc, 0)
    fields = token.split(':')
    id = fields[0]
    key = fields[1]
    issued_time = int(fields[2])

    if id != target_id:
        return False

    if not is_token_key_exists_in_list(key):
        return False

    if is_token_expired(issued_time):
        return False

    return True

def is_token_key_exists_in_list(key):
    for v in appconfig.token_keys:
        if v == key:
            return True
    return False

def is_token_expired(issued_time):
    valid_millis = appconfig.token_valid_sec * 1000
    now = util.get_unixtime_millis()
    valid_until = issued_time + valid_millis
    if valid_until < now:
        return True
    return False

#------------------------------------------------------------------------------
def get_data(context):
    id = get_request_param('id')
    if has_privilege(context, id):
        status = 'OK'
        result_data = kb.get_data(id, True)
    else:
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)

#------------------------------------------------------------------------------
def download_b64content(context):
    id = get_request_param('id')
    if has_privilege(context, id):
        status = 'OK'
        p_idx = get_request_param('idx')
        try:
            idx = int(p_idx)
        except:
            idx = 0
        kb.download_b64content(id, idx)
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
        if user_info is not None and 'name' in user_info:
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
        if kb.is_access_allowed(context):
            proc_api(context, act)
        else:
            send_result_json('FORBIDDEN', None)
