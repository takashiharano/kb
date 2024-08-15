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

util.append_system_path(__file__, ROOT_PATH + 'websys')
import web

import appconfig
import kb
import kblog

DATA_ENCRYPTION_KEY = appconfig.data_encryption_key

#------------------------------------------------------------------------------
# Returns None if the value not found
def get_request_param(key, default=None):
    return web.get_request_param(key, default=default)

def get_request_param_as_int(key, default=None):
    return web.get_request_param_as_int(key, default=default)

def get_request_param_as_bool(key, default=None):
    return web.get_request_param_as_bool(key, as_true='1')

#------------------------------------------------------------------------------
def get_req_param_scm():
    scm = get_request_param('scm', '')
    if scm == '':
        scm = kb.get_default_scm_id()
    return scm

#------------------------------------------------------------------------------
def send_result_json(status, body=None):
    web.send_result_json(status, body, encryption=True)

#------------------------------------------------------------------------------
def has_data_permission(context, scm, id):
    if has_valid_token(scm, id):
        return True
    if kb.has_privilege_for_scm(context, scm):
        return True
    return False

#------------------------------------------------------------------------------
def has_valid_token(scm, id):
    token = get_request_param('token')
    try:
        if kb.is_valid_token(token, scm, id):
            return True
    except:
        pass
    return False

#------------------------------------------------------------------------------
def has_valid_apitoken():
    apitoken = get_request_param('apitoken')
    for i in range(len(appconfig.api_tokens)):
        token = appconfig.api_tokens[i]
        if apitoken == token:
            return True
    return False

#------------------------------------------------------------------------------
# api.cgi?act=get_data&id=1
def proc_get_data(context):
    id = get_request_param('id')
    scm = get_req_param_scm()
    if has_data_permission(context, scm, id):
        status = 'OK'
        result_data = kb.get_data(context, scm, id, need_encode_b64=True)
        kblog.write_operation_log(context, 'GET_DATA', scm, id, data=result_data)
    else:
        kblog.write_operation_log(context, 'GET_DATA:FORBIDDEN', scm, id)
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_download_b64content(context):
    scm = get_req_param_scm()
    id = get_request_param('id')
    if has_data_permission(context, scm, id):
        status = 'OK'
        p_idx = get_request_param('idx')
        try:
            idx = int(p_idx)
        except:
            idx = 0
        kblog.write_operation_log(context, 'DOWNLOAD_B64CONTENT', scm, id, info='idx=' + str(idx))
        kb.download_b64content(context, scm, id, idx)
    else:
        kblog.write_operation_log(context, 'DOWNLOAD_B64CONTENT:FORBIDDEN', scm, id)
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
def proc_data_list(context):
    id = get_request_param('id')
    scm = get_req_param_scm()

    if not kb.schema_exists(scm):
        kblog.write_operation_log(context, 'LIST:SCHEMA_NOT_FOUND', scm, id)
        return create_result_object('SCHEMA_NOT_FOUND')

    if kb.has_privilege_for_scm(context, scm):
        limit = get_request_param_as_int('limit')
        include_hidden = get_request_param_as_bool('include_hidden')
        detail = kb.get_data_list(context, scm, id, list_max=limit, include_hidden=include_hidden)
        result = create_result_object('OK', detail)

        info = ''
        if detail['total_count'] == 0:
            info = 'cnt=0'
        kblog.write_operation_log(context, 'LIST', scm, id, info=info)

    else:
        kblog.write_operation_log(context, 'LIST:FORBIDDEN', scm, id)
        result = create_result_object('NO_ACCESS_RIGHTS')

    return result

#------------------------------------------------------------------------------
def proc_search(context):
    scm = get_req_param_scm()
    id = get_request_param('id')

    if not kb.schema_exists(scm):
        kblog.write_operation_log(context, 'SEARCH:SCHEMA_NOT_FOUND', scm, id)
        return create_result_object('SCHEMA_NOT_FOUND')

    if not kb.has_privilege_for_scm(context, scm):
        kblog.write_operation_log(context, 'SEARCH:FORBIDDEN', scm, id)
        return create_result_object('NO_ACCESS_RIGHTS')

    if id is None:
        q = get_request_param('q')
        q = util.decode_base64(q)
        limit = get_request_param_as_int('limit')
        detail = kb.search_data(context, scm, q, list_max=limit)
    else:
        kblog.write_operation_log(context, 'SEARCH', scm, id)
        detail = kb.get_data(context, scm, id, need_encode_b64=True)

    info = 'q=' + q + ' : ' + 'cnt=' + str(detail['total_count'])
    kblog.write_operation_log(context, 'SEARCH', scm, id, info=info)

    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_save_data(context):
    scm = get_req_param_scm()
    id = get_request_param('id')

    if not kb.schema_exists(scm):
        kblog.write_operation_log(context, 'SAVE_DATA:SCHEMA_NOT_FOUND', scm, id)
        return create_result_object('SCHEMA_NOT_FOUND')

    if not kb.has_privilege_for_scm(context, scm):
        kblog.write_operation_log(context, 'SAVE_DATA:FORBIDDEN', scm, id)
        return create_result_object('NO_ACCESS_RIGHTS')

    data_json = get_request_param('data')
    new_data = util.from_json(data_json)

    content = None
    if id != '':
        data = kb.get_data(context, scm, id)
        content = data['content']

    if id == '' or content is not None and content['U_DATE'] == new_data['org_u_date']:
        status = 'OK'
        user = kb.get_user_name(context)

        p_as_anonymous = get_request_param('as_anonymous', '0')
        as_anonymous = True if p_as_anonymous == '1' else False

        saved_obj = kb.save_data(scm, id, new_data, user, as_anonymous)
        saved_data = saved_obj['data']
        saved_content = saved_data['content']
        saved_id = saved_obj['id']
        saved_date = str(saved_content['U_DATE'])
        saved_user = saved_content['U_USER']

        kblog.write_save_log(context, scm, id, new_data, saved_obj)
    else:
        status = 'CONFLICT'
        saved_id = None
        saved_date = content['U_DATE']
        saved_user = content['U_USER']
        kblog.write_operation_log(context, 'SAVE_DATA:CONFLICT', scm, id, data=data)

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
    p_ids = get_request_param('ids')
    p_keep_updated_by = get_request_param('keep_updated_by', '0')
    keep_updated_by = True if p_keep_updated_by == '1' else False
    info = 'keep_updated_by=1' if keep_updated_by else ''

    if not kb.has_privilege_for_scm(context, scm):
        kblog.write_operation_log(context, 'TOUCH:FORBIDDEN', scm, p_ids, info=info)
        return create_result_object('NO_ACCESS_RIGHTS')

    ids = p_ids.split(',')
    user = kb.get_user_name(context)
    kblog.write_operation_log(context, 'TOUCH', scm, p_ids, info=info)
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
        encryption_key = DATA_ENCRYPTION_KEY if secure else None
        kb.write_data(scm, id, content, encryption_key)

    result = create_result_object('OK')
    return result

#------------------------------------------------------------------------------
def proc_mod_props(context):
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

    new_content = kb.parse_content(p_props, head_only=True)

    if not context.is_admin() and not context.has_permission('sysadmin'):
        new_content = filter_update_props(new_content, content)

    if 'LOGIC' in content:
        new_content['LOGIC'] = content['LOGIC']

    new_content['BODY'] = content['BODY']

    secure = data['encrypted']
    encryption_key = DATA_ENCRYPTION_KEY if secure else None
    kb.write_data(scm, id, new_content, encryption_key)

    kblog.write_operation_log(context, 'MOD_PROPS', scm, id, data=data)

    result = create_result_object('OK')
    return result

def filter_update_props(new_content, org_content):
    for key in new_content:
        if key in kb.RESTRICTED_PROP_KEYS:
            if key in org_content:
                new_content[key] = org_content[key]
            else:
                del new_content[key]
    return new_content

#------------------------------------------------------------------------------
def proc_save_logic(context):
    scm = get_req_param_scm()
    id = get_request_param('id')
    org_u_date = get_request_param('org_u_date')
    p_b64logic = get_request_param('logic')
    p_silent = get_request_param('silent')

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
        kblog.write_operation_log(context, 'SAVE_LOGIC:CONFLICT', scm, id, data=data)
        result = create_result_object('CONFLICT', detail)
        return result

    new_content = content
    new_content['LOGIC'] = p_b64logic

    if p_silent != '1':
        now = util.get_unixtime_millis()
        user = kb.get_user_name(context)
        new_content['U_DATE'] = now
        new_content['U_USER'] = user

    secure = data['encrypted']
    encryption_key = DATA_ENCRYPTION_KEY if secure else None
    kb.write_data(scm, id, new_content, encryption_key)

    kblog.write_operation_log(context, 'SAVE_LOGIC', scm, id, data=data)

    detail = {
        'saved_id': id,
        'U_DATE': str(new_content['U_DATE']),
        'U_USER': new_content['U_USER']
    }
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_delete(context):
    scm = get_req_param_scm()
    id = get_request_param('id')

    if not kb.has_privilege_for_scm(context, scm):
        kblog.write_operation_log(context, 'DELETE:FORBIDDEN', scm, id)
        return create_result_object('NO_ACCESS_RIGHTS')

    status = kb.delete_data(scm, id)
    kblog.write_operation_log(context, 'DELETE', scm, id, info=status)

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
    scm = get_req_param_scm()
    id_fm = get_request_param('id_fm')
    id_to = get_request_param('id_to')

    if not context.is_admin() and not context.has_permission('sysadmin'):
        kblog.write_operation_log(context, 'CHG_DATA_ID:FORBIDDEN', scm, id_fm, 'to:' + id_to)
        result = create_result_object('FORBIDDEN')
        return result

    status = kb.change_data_id(scm, id_fm, id_to)
    detail = {
        'id_fm': id_fm,
        'id_to': id_to
    }

    kblog.write_operation_log(context, 'CHG_DATA_ID', scm, id_fm, 'to:' + id_to)

    result = create_result_object(status, detail)
    return result

#------------------------------------------------------------------------------
def proc_check_id(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        result = create_result_object('FORBIDDEN')
        return result

    scm = get_req_param_scm()
    next_id = kb.get_next_id(scm)
    vacant_ids_res = kb.get_vacant_ids(scm)

    detail = {
        'next_id': next_id,
        'vacant_id_info': vacant_ids_res
    }

    result = create_result_object('OK', detail)
    return result

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
    if not context.is_admin() and not context.has_permission('sysadmin'):
        send_result_json('FORBIDDEN')
        return None

    scm = get_req_param_scm()
    b64props = get_request_param('props')
    props = util.decode_base64(b64props)
    kb.save_scm_props(scm, props)
    result_data = {
        'scm': scm
    }

    kblog.write_operation_log(context, 'MOD_SCM_PROPS', scm)

    send_result_json('OK', result_data)
    return None

#------------------------------------------------------------------------------
def proc_create_schema(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        send_result_json('FORBIDDEN')
        return None

    scm = get_req_param_scm()
    b64props = get_request_param('props')
    props = util.decode_base64(b64props)
    status = kb.create_schema(scm, props)
    result_data = {
        'scm': scm
    }

    kblog.write_operation_log(context, 'CREATE_SCM', scm)

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_delete_schema(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        send_result_json('FORBIDDEN')
        return None

    scm = get_req_param_scm()
    status = kb.delete_schema(scm)
    result_data = {
        'scm': scm
    }

    kblog.write_operation_log(context, 'DELETE_SCM', scm)

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_export_html(context):
    scm = get_req_param_scm()
    id = get_request_param('id')

    if not kb.has_privilege_for_scm(context, scm):
        kblog.write_operation_log(context, 'EXPORT_HTML:FORBIDDEN', scm, id)
        send_error_text('NO_ACCESS_RIGHTS:scm=' + scm)
        result = create_result_object('OK', None, 'octet-stream')
        return result

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

    kblog.write_operation_log(context, 'EXPORT_HTML', scm, id)

    util.send_as_file(b, filename=filename)
    result = create_result_object('OK', None, 'octet-stream')
    return result

#------------------------------------------------------------------------------
def proc_export_data(context):
    scm = get_req_param_scm()
    if not kb.has_privilege_for_scm(context, scm):
        kblog.write_operation_log(context, 'EXPORT_DATA:FORBIDDEN', scm, dataid='')
        send_error_text('NO_ACCESS_RIGHTS:scm=' + scm)
        return None

    p_decrypt = web.get_raw_request_param('decrypt')
    decrypt = p_decrypt == '1'
    b = kb.export_data(scm, decrypt)

    filename = 'kbdata'
    if scm != kb.get_default_scm_id():
        filename += '_' + scm
    filename += '.zip'

    kblog.write_operation_log(context, 'EXPORT_DATA', scm, dataid='')

    util.send_as_file(b, filename=filename)
    return None

def proc_export_data_all(context):
    if not context.is_admin() and not has_valid_apitoken():
        kblog.write_operation_log(context, 'EXPORT_ALL_DATA:FORBIDDEN', scm='', dataid='')
        send_error_text('NO_ACCESS_RIGHTS')
        return None
    p_decrypt = web.get_raw_request_param('decrypt')
    decrypt = p_decrypt == '1'

    kblog.write_operation_log(context, 'EXPORT_ALL_DATA', scm='', dataid='')

    b = kb.export_all_data(context, decrypt)
    util.send_as_file(b, filename='kbdata_all.zip')
    return None

#------------------------------------------------------------------------------
def proc_get_kb_log(context):
    status = 'OK'
    if context.is_admin():
        p_n = get_request_param('n')
        n = 30
        if p_n is not None:
            try:
                n = int(p_n)
            except:
                pass
        n = n * (-1)
        logs = kblog.get_log()[n:]
    else:
        status = 'NO_PRIVILEGE'
        logs = None

    send_result_json(status, body=logs)

#------------------------------------------------------------------------------
def _build_css(fontsize='14', fontfamily='', with_color=False):
    if fontfamily == '':
        fontfamily = 'Consolas, Monaco, Menlo, monospace, sans-serif'
    if with_color:
        link_color = appconfig.link_color
    else:
        link_color = '#00f'

    css = ''
    css += 'body{\n'
    css += '  width: calc(100% - 20px);\n'
    css += '  height: calc(100vh - 30px);\n'
    css += '  margin: 0;\n'
    css += '  padding: 10px;\n'

    if with_color:
        css += '  background: ' + appconfig.background1 + ';\n'
        css += '  color: ' + appconfig.fg_color + ';\n'

    css += '  font-size: ' + fontsize + 'px;\n'
    css += '  font-family: ' + fontfamily + ';\n'
    css += '}\n'
    css += 'pre {\n'
    css += '  margin: 0;\n'
    css += '  font-family: ' + fontfamily + ';\n'
    css += '}\n'
    css += 'a {\n'
    css += '  color: ' + link_color + ';\n'
    css += '  text-decoration: none;\n'
    css += '}\n'
    css += 'a:hover {'
    css += '  text-decoration: underline;'
    css += '}\n'
    css += '#content-body {\n'
    css += '  width: 100%;\n'
    css += '  height: 100%;\n'
    if with_color:
        css += '  background: ' + appconfig.background_lower + ';\n'
    css += '}\n'

    return css

#------------------------------------------------------------------------------
def send_error_text(msg):
    b = msg.encode()
    util.send_as_file(b, filename='error.txt')

#------------------------------------------------------------------------------
def proc_api(context, act):
    status = 'OK'
    result = None
    #funcname_list = [
    #    'list',
    #    'search',
    #    'save',
    #    'touch',
    #    'mod_props',
    #    'delete',
    #    'check_exists',
    #    'change_data_id',
    #    'check_id',
    #    'export_html',
    #    'get_schema_list',
    #    'get_schema_props',
    #    'save_schema_props',
    #    'create_schema',
    #    'delete_schema'
    #]

    #if act in funcname_list:
    func_name = 'proc_' + act
    g = globals()
    if func_name in g:
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
    elif act == 'get_schema_list':
        proc_api(context, act)
    else:
        scm = get_request_param('scm')
        if kb.is_authorized(context) or has_valid_apitoken() or kb.is_anonymous_allowed(scm):
            proc_api(context, act)
        else:
            proc_on_forbidden(act)
