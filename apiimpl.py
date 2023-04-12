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
# Returns None if the value not found
def get_request_param(key):
    return web.get_request_param(key)

def send_result_json(status, body):
    web.send_result_json(status, body)

#------------------------------------------------------------------------------
def has_access_privilege(context, id):
    if not kb.is_access_allowed(context):
        token = get_request_param('token')
        try:
            if not kb.is_valid_token(token, id):
                return False
        except:
            return False
    return True

#------------------------------------------------------------------------------
def has_valid_apitoken():
    apitoken = get_request_param('apitoken')
    for i in range(len(appconfig.api_tokens)):
        token = appconfig.api_tokens[i]
        if apitoken == token:
            return True
    return False

#------------------------------------------------------------------------------
def get_user_name(context):
    if 'user_info' in context:
        user_info = context['user_info']
        if user_info is not None and 'name' in user_info:
            return user_info['name']
    return ''

#------------------------------------------------------------------------------
def get_data(context):
    id = get_request_param('id')
    if has_access_privilege(context, id):
        status = 'OK'
        result_data = kb.get_data(context, id, True)
    else:
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)

#------------------------------------------------------------------------------
def download_b64content(context):
    id = get_request_param('id')
    if has_access_privilege(context, id):
        status = 'OK'
        p_idx = get_request_param('idx')
        try:
            idx = int(p_idx)
        except:
            idx = 0
        kb.download_b64content(context, id, idx)
    else:
        kb.send_error_file('NO_ACCESS_RIGHTS')

#------------------------------------------------------------------------------
def proc_list(context):
    id = get_request_param('id')
    detail = kb.get_list(context, id, True)
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_search(context):
    id = get_request_param('id')
    if id is None:
        q = get_request_param('q')
        q = util.decode_base64(q)
        detail = kb.search_data(context, q, True)
    else:
        detail = kb.get_data(context, id, True)
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_save(context):
    id = get_request_param('id')
    data_json = get_request_param('data')
    new_data = util.from_json(data_json)

    content = None
    if id != '':
        data = kb.get_data(context, id)
        content = data['content']

    if id == '' or content is not None and content['U_DATE'] == new_data['org_u_date']:
        status = 'OK'
        user = get_user_name(context)
        saved_obj = kb.save_data(id, new_data, user)
        saved_data = saved_obj['data']
        saved_content = saved_data['content']
        saved_id = saved_obj['id']
        saved_date = str(saved_content['U_DATE'])
        saved_user = saved_content['U_USER']
    else:
        status = 'CONFLICT'
        saved_id = None
        saved_date = content['U_DATE']
        saved_user = content['U_USER']

    detail = {
        'saved_id': saved_id,
        'U_DATE': saved_date,
        'U_USER': saved_user
    }

    result = create_result_object(status, detail)
    return result

#------------------------------------------------------------------------------
def proc_touch(context):
    p_ids = get_request_param('ids')
    ids = p_ids.split(',')
    user = get_user_name(context)
    for i in range(len(ids)):
        id = ids[i]
        data = kb.get_data(context, id)
        if data['status'] != 'OK':
            continue
        now = util.get_unixtime_millis()
        content = data['content']
        content['U_DATE'] = now
        content['U_USER'] = user
        secure = data['encrypted']
        kb.write_data(id, content, secure)

    result = create_result_object('OK')
    return result

#------------------------------------------------------------------------------
def proc_mod_props(context):
    if not web.is_admin(context):
        result = create_result_object('FORBIDDEN')
        return result

    id = get_request_param('id')
    org_u_date = get_request_param('org_u_date')
    p_props = get_request_param('props')
    p_props = util.decode_base64(p_props)
    p_props = util.replace(p_props, ' {2,}', ' ')

    data = kb.load_data(id)
    if data['status'] != 'OK':
        result = create_result_object('ERROR:' + data['status'])
        return result

    content = data['content']
    if content['U_DATE'] != org_u_date:
        detail = {
            'U_DATE': content['U_DATE'],
            'U_USER': content['U_USER']
        }
        result = create_result_object('CONFLICT', detail)
        return result

    new_content = kb.parse_content(p_props, True)
    new_content['BODY'] = content['BODY']

    secure = data['encrypted']
    kb.write_data(id, new_content, secure)

    result = create_result_object('OK')
    return result

#------------------------------------------------------------------------------
def proc_delete(context):
    id = get_request_param('id')
    status = kb.delete_data(id)
    result = create_result_object(status)
    return result

#------------------------------------------------------------------------------
def proc_check_exists(context):
    id = get_request_param('id')
    detail = kb.check_exists(id)
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_change_data_id(context):
    if not web.is_admin(context):
        result = create_result_object('FORBIDDEN')
        return result

    id_fm = get_request_param('id_fm')
    id_to = get_request_param('id_to')
    status = kb.change_data_id(id_fm, id_to)
    detail = {
        'id_fm': id_fm,
        'id_to': id_to
    }

    result = create_result_object(status, detail)
    return result

#------------------------------------------------------------------------------
def proc_check_id(context):
    next_id = kb.get_next_id()
    empty_ids = kb.get_empty_ids()

    detail = {
        'next_id': next_id,
        'empty_ids': empty_ids
    }

    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_on_forbidden(act):
    if act == 'export':
        util.send_result_json('FORBIDDEN', None)
    else:
        send_result_json('FORBIDDEN', None)

#------------------------------------------------------------------------------
def create_result_object(status, detail=None):
    obj = {
        'status': status,
        'detail': detail
    }
    return obj

#------------------------------------------------------------------------------
def proc_api(context, act):
    status = 'NO_SUCH_ACTION'
    result = None
    funcname_list = ['list', 'search', 'save', 'touch', 'mod_props', 'delete', 'check_exists', 'change_data_id', 'check_id']

    if act in funcname_list:
        func_name = 'proc_' + act
        g = globals()
        result = g[func_name](context)
    else:
        # from url query string w/o encryption
        act = web.get_raw_request_param('act')
        if act == 'export':
            p_asis = web.get_raw_request_param('asis')
            asis = p_asis == 'true'
            b = kb.export_data(asis)
            util.send_binary(b, filename='kbdata.zip')
            return

    if result is not None:
        status = result['status']
        result_data = result['detail']

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
        if kb.is_access_allowed(context) or has_valid_apitoken():
            proc_api(context, act)
        else:
            proc_on_forbidden(act)
