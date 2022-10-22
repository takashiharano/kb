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

def get_current_user_name():
    return web.get_current_user_name()

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
        result_data = kb.get_data(id)
    else:
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)

#------------------------------------------------------------------------------
def proc_api(context, act):
    status = 'OK'
    if act == 'list':
        data_list = kb.get_list()
        result_data = {'data_list': data_list}
    elif act == 'search':
        q = get_request_param('q')
        q = util.decode_base64(q)
        result_data = kb.search_data(q)
    elif act == 'save':
        id = get_request_param('id')
        data_json = get_request_param('data')
        data = util.from_json(data_json)
        user = context['user']
        saved_id = kb.save_data(id, data, user)
        result_data = saved_id
    elif act == 'delete':
        id = get_request_param('id')
        status = kb.delete_data(id)
        result_data = None
    elif act == 'check_exists':
        id = get_request_param('id')
        result_data = kb.check_exists(id)
    elif act == 'get_init_info':
        result_data = {
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
def web_process():
    web.on_access()
    authorized = web.auth(False)
    user = get_current_user_name()

    context = {
        'user': user,
        'authorized': authorized
    }

    act = get_request_param('act')
    if act == 'get':
        get_data(context)
    else:
        if context['authorized']:
            proc_api(context, act)
        else:
            send_result_json('FORBIDDEN', None)
