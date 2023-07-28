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
def get_request_param(key, default=None):
    return web.get_request_param(key, default=default)

#------------------------------------------------------------------------------
def get_req_param_scm():
    scm = get_request_param('scm', '')
    if scm == '':
        scm = kb.get_default_scm()
    return scm

#------------------------------------------------------------------------------
def send_result_json(status, body=None):
    web.send_result_json(status, body)

#------------------------------------------------------------------------------
def has_access_privilege(context, scm, id):
    if not kb.is_access_allowed(context):
        token = get_request_param('token')
        try:
            if not kb.is_valid_token(token, scm, id):
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
    user_info = context.get_user_info()
    if user_info is not None and 'name' in user_info:
        return user_info['name']
    return ''

#------------------------------------------------------------------------------
def proc_get_schema_list(context):
    scm_list = kb.get_schema_list(context)
    send_result_json('OK', scm_list)
    return None

#------------------------------------------------------------------------------
def proc_get_schema_props(context):
    scm = get_req_param_scm()
    props = kb.read_scm_props_as_text(scm)
    if props is None:
        props = ''
    b64props = util.encode_base64(props)
    result_data = {
        'scm': scm,
        'props': b64props
    }
    send_result_json('OK', result_data)
    return None

#------------------------------------------------------------------------------
def proc_save_schema_props(context):
    if not context.is_admin():
        send_result_json('FORBIDDEN')
        return None

    scm = get_req_param_scm()
    b64props = get_request_param('props')
    props = util.decode_base64(b64props)
    kb.save_scm_props(scm, props)
    result_data = {
        'scm': scm
    }
    send_result_json('OK', result_data)
    return None

#------------------------------------------------------------------------------
def proc_create_schema(context):
    if not context.is_admin():
        send_result_json('FORBIDDEN')
        return None

    scm = get_req_param_scm()
    b64props = get_request_param('props')
    props = util.decode_base64(b64props)
    status = kb.create_schema(scm, props)
    result_data = {
        'scm': scm
    }
    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_delete_schema(context):
    if not context.is_admin():
        send_result_json('FORBIDDEN')
        return None

    scm = get_req_param_scm()
    status = kb.delete_schema(scm)
    result_data = {
        'scm': scm
    }
    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_get_data(context):
    id = get_request_param('id')
    scm = get_req_param_scm()
    if has_access_privilege(context, scm, id):
        status = 'OK'
        result_data = kb.get_data(context, scm, id, True)
    else:
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_download_b64content(context):
    scm = get_req_param_scm()
    id = get_request_param('id')
    if has_access_privilege(context, scm, id):
        status = 'OK'
        p_idx = get_request_param('idx')
        try:
            idx = int(p_idx)
        except:
            idx = 0
        kb.download_b64content(context, scm, id, idx)
    else:
        kb.send_error_file('NO_ACCESS_RIGHTS')
    return None

#------------------------------------------------------------------------------
def create_result_object(status, detail=None, type='json'):
    obj = {
        'type': type,
        'status': status,
        'detail': detail
    }
    return obj

#------------------------------------------------------------------------------
def proc_on_forbidden(act):
    if act == 'export':
        util.send_result_json('FORBIDDEN', None)
    else:
        send_result_json('FORBIDDEN', None)
    return None

#------------------------------------------------------------------------------
def proc_list(context):
    id = get_request_param('id')
    scm = get_req_param_scm()

    if not kb.schema_exists(scm):
        return create_result_object('SCHEMA_NOT_FOUND')

    if kb.has_privilege_for_scm(context, scm):
        detail = kb.get_list(context, scm, id, True)
        result = create_result_object('OK', detail)
    else:
        result = create_result_object('NO_ACCESS_RIGHTS')

    return result

#------------------------------------------------------------------------------
def proc_search(context):
    scm = get_req_param_scm()
    id = get_request_param('id')

    if not kb.schema_exists(scm):
        return create_result_object('SCHEMA_NOT_FOUND')

    if not kb.has_privilege_for_scm(context, scm):
        return create_result_object('NO_ACCESS_RIGHTS')

    if id is None:
        q = get_request_param('q')
        q = util.decode_base64(q)
        detail = kb.search_data(context, scm, q, True)
    else:
        detail = kb.get_data(context, scm, id, True)
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_save(context):
    scm = get_req_param_scm()

    if not kb.schema_exists(scm):
        return create_result_object('SCHEMA_NOT_FOUND')

    if not kb.has_privilege_for_scm(context, scm):
        return create_result_object('NO_ACCESS_RIGHTS')

    id = get_request_param('id')
    data_json = get_request_param('data')
    new_data = util.from_json(data_json)

    content = None
    if id != '':
        data = kb.get_data(context, scm, id)
        content = data['content']

    if id == '' or content is not None and content['U_DATE'] == new_data['org_u_date']:
        status = 'OK'
        user = get_user_name(context)
        saved_obj = kb.save_data(scm, id, new_data, user)
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
    scm = get_req_param_scm()

    if not kb.has_privilege_for_scm(context, scm):
        return create_result_object('NO_ACCESS_RIGHTS')

    p_ids = get_request_param('ids')
    p_keep_updated_by = get_request_param('keep_updated_by', '0')
    keep_updated_by = True if p_keep_updated_by == '1' else False
    ids = p_ids.split(',')
    user = get_user_name(context)
    for i in range(len(ids)):
        id = ids[i]
        data = kb.get_data(context, scm, id)
        if data['status'] != 'OK':
            continue
        now = util.get_unixtime_millis()
        content = data['content']
        content['U_DATE'] = now
        if not keep_updated_by:
            content['U_USER'] = user
        secure = data['encrypted']
        kb.write_data(scm, id, content, secure)

    result = create_result_object('OK')
    return result

#------------------------------------------------------------------------------
def proc_mod_props(context):
    if not context.is_admin():
        result = create_result_object('FORBIDDEN')
        return result

    scm = get_req_param_scm()
    id = get_request_param('id')
    org_u_date = get_request_param('org_u_date')
    p_props = get_request_param('props')
    p_props = util.decode_base64(p_props)
    p_props = util.replace(p_props, ' {2,}', ' ')

    data = kb.load_data(scm, id)
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
    kb.write_data(scm, id, new_content, secure)

    result = create_result_object('OK')
    return result

#------------------------------------------------------------------------------
def proc_delete(context):
    scm = get_req_param_scm()
    if not kb.has_privilege_for_scm(context, scm):
        return create_result_object('NO_ACCESS_RIGHTS')

    id = get_request_param('id')
    status = kb.delete_data(scm, id)
    result = create_result_object(status)
    return result

#------------------------------------------------------------------------------
def proc_check_exists(context):
    scm = get_req_param_scm()
    if not kb.has_privilege_for_scm(context, scm):
        return create_result_object('NO_ACCESS_RIGHTS')

    id = get_request_param('id')
    detail = kb.check_exists(scm, id)
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_change_data_id(context):
    if not context.is_admin():
        result = create_result_object('FORBIDDEN')
        return result

    scm = get_req_param_scm()
    id_fm = get_request_param('id_fm')
    id_to = get_request_param('id_to')
    status = kb.change_data_id(scm, id_fm, id_to)
    detail = {
        'id_fm': id_fm,
        'id_to': id_to
    }

    result = create_result_object(status, detail)
    return result

#------------------------------------------------------------------------------
def proc_check_id(context):
    if not context.is_admin():
        result = create_result_object('FORBIDDEN')
        return result

    scm = get_req_param_scm()
    next_id = kb.get_next_id(scm)
    empty_ids_res = kb.get_empty_ids(scm)

    detail = {
        'next_id': next_id,
        'empty_id_info': empty_ids_res
    }

    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_export_html(context):
    scm = get_req_param_scm()
    if not kb.has_privilege_for_scm(context, scm):
        send_error_text('NO_ACCESS_RIGHTS:scm=' + scm)
        result = create_result_object('OK', None, 'octet-stream')
        return result

    id = get_request_param('id')
    body = get_request_param('body')
    body = util.decode_base64(body)
    fontsize = get_request_param('fontsize')
    fontfamily = get_request_param('fontfamily')
    p_with_color = get_request_param('with_color', '0')
    with_color = True if p_with_color == '1' else False

    html = '''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="robots" content="none">
<meta name="referrer" content="no-referrer">
<meta name="referrer" content="never">
'''
    html += '<title>' + appconfig.title + '</title>\n'
    html += '<style>\n'
    html += _build_css(fontsize, fontfamily, with_color)
    html += '</style>'
    html += '''
</head>
<body>
<pre id="content-body">
'''
    html += body
    html += '''</pre>
</body>
</html>
'''
    b = html.encode()
    filename = 'kb-' + id + '.html'
    util.send_binary(b, filename=filename)
    result = create_result_object('OK', None, 'octet-stream')
    return result

#------------------------------------------------------------------------------
def proc_export_data(context):
    scm = get_req_param_scm()
    if not kb.has_privilege_for_scm(context, scm):
        send_error_text('NO_ACCESS_RIGHTS:scm=' + scm)
        return None

    p_decrypt = web.get_raw_request_param('decrypt')
    decrypt = p_decrypt == '1'
    b = kb.export_data(scm, decrypt)

    filename = 'kbdata'
    if scm != kb.get_default_scm():
        filename += '_' + scm
    filename += '.zip'

    util.send_binary(b, filename=filename)
    return None

def proc_export_data_all(context):
    if not context.is_admin() and not has_valid_apitoken():
        send_error_text('NO_ACCESS_RIGHTS')
        return None
    p_decrypt = web.get_raw_request_param('decrypt')
    decrypt = p_decrypt == '1'
    b = kb.export_all_data(context, decrypt)
    util.send_binary(b, filename='kbdata_all.zip')
    return None

#------------------------------------------------------------------------------
def _build_css(fontsize='12', fontfamily='', with_color=False):
    if fontfamily == '':
        fontfamily = 'Consolas, Monaco, Menlo, monospace, sans-serif'
    css = ''
    css += 'body{\n'
    css += '  calc(width: 100% - 20px);\n'
    css += '  height: calc(100vh - 30px);\n'
    css += '  margin: 0;\n'
    css += '  padding: 10px;\n'

    if with_color:
        css += '  background: ' + appconfig.background3 + ';\n'
        css += '  color: ' + appconfig.fg_color + ';\n'

    css += '  font-size: ' + fontsize + 'px;\n'
    css += '  font-family: ' + fontfamily + ';\n'
    css += '}\n'
    css += 'pre {\n'
    css += '  margin: 0;\n'
    css += '  font-family: ' + fontfamily + ';\n'
    css += '}\n'
    css += 'a {\n'
    css += '  color: ' + appconfig.link_color + ';\n'
    css += '}\n'
    return css

#------------------------------------------------------------------------------
def send_error_text(msg):
    b = msg.encode()
    util.send_binary(b, filename='error.txt')

#------------------------------------------------------------------------------
def proc_api(context, act):
    status = 'OK'
    result = None
    funcname_list = [
        'list',
        'search',
        'save',
        'touch',
        'mod_props',
        'delete',
        'check_exists',
        'change_data_id',
        'check_id',
        'export_html',
        'get_schema_list',
        'get_schema_props',
        'save_schema_props',
        'create_schema',
        'delete_schema'
    ]

    if act in funcname_list:
        func_name = 'proc_' + act
        g = globals()
        result = g[func_name](context)
    else:
        # from url query string w/o encryption
        act = web.get_raw_request_param('act')
        if act == 'export':
            all = web.get_raw_request_param('all', '')
            if all == '1':
                # api.cgi?act=export&all=1&decrypt=1
                proc_export_data_all(context)
            else:
                # api.cgi?act=export&scm=xyz&decrypt=1
                proc_export_data(context)
            return
        else:
            result = create_result_object('NO_SUCH_ACTION')

    if result is not None:
        if result['type'] == 'octet-stream':
            return
        status = result['status']
        result_data = result['detail']
        send_result_json(status, result_data)

#------------------------------------------------------------------------------
def main():
    context = web.on_access()

    act = get_request_param('act')
    if act is None:
        util.send_response(appconfig.system_name)
    elif act == 'get':
        proc_get_data(context)
    elif act == 'dlb64content':
        proc_download_b64content(context)
    else:
        if kb.is_access_allowed(context) or has_valid_apitoken():
            proc_api(context, act)
        else:
            proc_on_forbidden(act)
