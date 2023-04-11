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
        saved_date = saved_content['U_DATE']
        saved_user = saved_content['U_USER']
    else:
        status = 'CONFLICT'
        saved_id = None
        saved_date = content['U_DATE']
        saved_user = content['U_USER']

    result = {
        'status': status,
        'saved_id': saved_id,
        'U_DATE': saved_date,
        'U_USER': saved_user
    }

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

#------------------------------------------------------------------------------
def proc_mod_props(context):
    if not web.is_admin(context):
        return 'FORBIDDEN'

    id = get_request_param('id')
    p_props = get_request_param('props')
    p_props = util.decode_base64(p_props)
    p_props = util.replace(p_props, ' {2,}', ' ')

    data = kb.load_data(id)
    if data['status'] != 'OK':
        return 'ERROR:' + data['status']

    new_content = kb.parse_content(p_props, True)
    content = data['content']
    new_content['BODY'] = content['BODY']

    secure = data['encrypted']
    kb.write_data(id, new_content, secure)
    return 'OK'

#------------------------------------------------------------------------------
def proc_change_data_id(context):
    if not web.is_admin(context):
        result = {
            'status': 'FORBIDDEN',
            'result': None
        }
        return result
    id_fm = get_request_param('id_fm')
    id_to = get_request_param('id_to')
    status = kb.change_data_id(id_fm, id_to)
    result = {
        'status': status,
        'detail': {
            'id_fm': id_fm,
            'id_to': id_to
        }
    }
    return result

#------------------------------------------------------------------------------
def proc_check_id(context):
    next_id = kb.get_next_id()
    empty_ids = kb.get_empty_ids()
    result = {
        'status': 'OK',
        'detail': {
            'next_id': next_id,
            'empty_ids': empty_ids
        }
    }
    return result

#------------------------------------------------------------------------------
def get_user_name(context):
    if 'user_info' in context:
        user_info = context['user_info']
        if user_info is not None and 'name' in user_info:
            return user_info['name']
    return ''

#------------------------------------------------------------------------------
def proc_on_forbidden(act):
    if act == 'export':
        util.send_result_json('FORBIDDEN', None)
    else:
        send_result_json('FORBIDDEN', None)

#------------------------------------------------------------------------------
def proc_api(context, act):
    status = 'OK'
    result_data = None
    if act == 'list':
        id = get_request_param('id')
        result_data = kb.get_list(context, id, True)
    elif act == 'search':
        id = get_request_param('id')
        if id is None:
            q = get_request_param('q')
            q = util.decode_base64(q)
            result_data = kb.search_data(context, q, True)
        else:
            result_data = kb.get_data(context, id, True)
    elif act == 'save':
        result = proc_save(context)
        status = result['status']
        result_data = {
            'saved_id': result['saved_id'],
            'U_DATE': result['U_DATE'],
            'U_USER': result['U_USER']
        }
    elif act == 'touch':
        status = 'OK'
        proc_touch(context)
    elif act == 'mod_props':
        status = proc_mod_props(context)
        result_data = None
    elif act == 'delete':
        id = get_request_param('id')
        status = kb.delete_data(id)
    elif act == 'check_exists':
        id = get_request_param('id')
        result_data = kb.check_exists(id)
    elif act == 'change_data_id':
        result = proc_change_data_id(context)
        status = result['status']
        result_data = result['detail']
    elif act == 'check_id':
        result = proc_check_id(context)
        status = result['status']
        result_data = result['detail']
    else:
        act = web.get_raw_request_param('act')
        if act == 'export':
            p_asis = web.get_raw_request_param('asis')
            asis = False
            if p_asis == 'true':
                asis = True
            b = kb.export_data(asis)
            util.send_binary(b, filename='kbdata.zip')
            return
        else:
            status = 'NO_SUCH_ACTION'

    send_result_json(status, result_data)

#------------------------------------------------------------------------------
def has_valid_apitoken():
    apitoken = get_request_param('apitoken')
    for i in range(len(appconfig.api_tokens)):
        token = appconfig.api_tokens[i]
        if apitoken == token:
            return True
    return False

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
