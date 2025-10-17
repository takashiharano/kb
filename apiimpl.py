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
import websys

import appconfig
import kb
import kblog

DATA_ENCRYPTION_KEY = appconfig.data_encryption_key

#------------------------------------------------------------------------------
# Returns None if the value not found
def get_request_param(key, default=None):
    return websys.get_request_param(key, default=default)

def get_request_param_as_int(key, default=None):
    return websys.get_request_param_as_int(key, default=default)

def get_request_param_as_bool(key, default=None):
    return websys.get_request_param_as_bool(key, as_true='1')

#------------------------------------------------------------------------------
def get_req_param_repo():
    repo = get_request_param('repo', '')
    if repo == '':
        repo = kb.get_default_repo_id()
    return repo

#------------------------------------------------------------------------------
def send_result_json(status, body=None):
    websys.send_result_json(status, body, encryption=True)

#------------------------------------------------------------------------------
def has_data_permission(context, repo, id):
    if has_valid_token(repo, id):
        return True
    if kb.has_privilege_for_repo(context, repo):
        return True
    return False

#------------------------------------------------------------------------------
def has_valid_token(repo, id):
    token = get_request_param('token')
    try:
        if kb.is_valid_token(token, repo, id):
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
    repo = get_req_param_repo()
    if has_data_permission(context, repo, id):
        status = 'OK'
        result_data = kb.get_data(context, repo, id, need_encode_b64=True)
        kblog.write_operation_log(context, 'GET_DATA', repo, id, data=result_data)
    else:
        kblog.write_operation_log(context, 'GET_DATA:FORBIDDEN', repo, id)
        status = 'NO_ACCESS_RIGHTS'
        result_data = None

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_download_b64content(context):
    repo = get_req_param_repo()
    id = get_request_param('id')
    if has_data_permission(context, repo, id):
        status = 'OK'
        p_idx = get_request_param('idx')
        try:
            idx = int(p_idx)
        except:
            idx = 0
        kblog.write_operation_log(context, 'DOWNLOAD_B64CONTENT', repo, id, info='idx=' + str(idx))
        kb.download_b64content(context, repo, id, idx)
    else:
        kblog.write_operation_log(context, 'DOWNLOAD_B64CONTENT:FORBIDDEN', repo, id)
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
    repo = get_req_param_repo()

    if not kb.repo_exists(repo):
        kblog.write_operation_log(context, 'LIST:SCHEMA_NOT_FOUND', repo, id)
        return create_result_object('SCHEMA_NOT_FOUND')

    if kb.has_privilege_for_repo(context, repo):
        limit = get_request_param_as_int('limit')
        include_hidden = get_request_param_as_bool('include_hidden')
        detail = kb.get_data_list(context, repo, id, list_max=limit, include_hidden=include_hidden)
        result = create_result_object('OK', detail)

        info = ''
        if detail['total_count'] == 0:
            info = 'cnt=0'
        kblog.write_operation_log(context, 'LIST', repo, id, info=info)

    else:
        kblog.write_operation_log(context, 'LIST:FORBIDDEN', repo, id)
        result = create_result_object('NO_ACCESS_RIGHTS')

    return result

#------------------------------------------------------------------------------
def proc_search(context):
    repo = get_req_param_repo()
    id = get_request_param('id')

    if not kb.repo_exists(repo):
        kblog.write_operation_log(context, 'SEARCH:SCHEMA_NOT_FOUND', repo, id)
        return create_result_object('SCHEMA_NOT_FOUND')

    if not kb.has_privilege_for_repo(context, repo):
        kblog.write_operation_log(context, 'SEARCH:FORBIDDEN', repo, id)
        return create_result_object('NO_ACCESS_RIGHTS')

    if id is None:
        q = get_request_param('q')
        q = util.decode_base64(q)
        limit = get_request_param_as_int('limit')
        detail = kb.search_data(context, repo, q, list_max=limit)
    else:
        kblog.write_operation_log(context, 'SEARCH', repo, id)
        detail = kb.get_data(context, repo, id, need_encode_b64=True)

    info = 'q=' + q + ' : ' + 'cnt=' + str(detail['total_count'])
    kblog.write_operation_log(context, 'SEARCH', repo, id, info=info)

    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_save_data(context):
    repo = get_req_param_repo()
    id = get_request_param('id')

    if not kb.repo_exists(repo):
        kblog.write_operation_log(context, 'SAVE_DATA:SCHEMA_NOT_FOUND', repo, id)
        return create_result_object('SCHEMA_NOT_FOUND')

    if not kb.has_privilege_for_repo(context, repo):
        kblog.write_operation_log(context, 'SAVE_DATA:FORBIDDEN', repo, id)
        return create_result_object('NO_ACCESS_RIGHTS')

    data_json = get_request_param('data')
    new_data = util.from_json(data_json)

    content = None
    if id != '':
        data = kb.get_data(context, repo, id)
        content = data['content']

    if id == '' or content is not None and content['U_DATE'] == new_data['org_u_date']:
        status = 'OK'
        user = kb.get_user_name(context)

        p_as_anonymous = get_request_param('as_anonymous', '0')
        as_anonymous = True if p_as_anonymous == '1' else False

        saved_obj = kb.save_data(repo, id, new_data, user, as_anonymous)
        saved_data = saved_obj['data']
        saved_content = saved_data['content']
        saved_id = saved_obj['id']
        saved_date = str(saved_content['U_DATE'])
        saved_user = saved_content['U_USER']

        kblog.write_save_log(context, repo, id, new_data, saved_obj)
    else:
        status = 'CONFLICT'
        saved_id = None
        saved_date = content['U_DATE']
        saved_user = content['U_USER']
        kblog.write_operation_log(context, 'SAVE_DATA:CONFLICT', repo, id, data=data)

    detail = {
        'saved_id': saved_id,
        'U_DATE': saved_date,
        'U_USER': saved_user
    }

    result = create_result_object(status, detail)
    return result

#------------------------------------------------------------------------------
def proc_touch(context):
    repo = get_req_param_repo()
    p_ids = get_request_param('ids')
    p_keep_updated_by = get_request_param('keep_updated_by', '0')
    keep_updated_by = True if p_keep_updated_by == '1' else False
    info = 'keep_updated_by=1' if keep_updated_by else ''

    if not kb.has_privilege_for_repo(context, repo):
        kblog.write_operation_log(context, 'TOUCH:FORBIDDEN', repo, p_ids, info=info)
        return create_result_object('NO_ACCESS_RIGHTS')

    ids = p_ids.split(',')
    user = kb.get_user_name(context)
    kblog.write_operation_log(context, 'TOUCH', repo, p_ids, info=info)
    for i in range(len(ids)):
        id = ids[i]
        data = kb.get_data(context, repo, id)
        if data['status'] != 'OK':
            continue
        now = util.get_unixtime_millis()
        content = data['content']
        content['U_DATE'] = now
        if not keep_updated_by:
            content['U_USER'] = user
        secure = data['encrypted']
        encryption_key = DATA_ENCRYPTION_KEY if secure else None
        kb.write_data(repo, id, content, encryption_key)

    result = create_result_object('OK')
    return result

#------------------------------------------------------------------------------
def proc_mod_props(context):
    repo = get_req_param_repo()
    id = get_request_param('id')

    org_u_date = get_request_param('org_u_date')
    p_props = get_request_param('props')
    p_props = util.decode_base64(p_props)
    p_props = util.replace(p_props, ' {2,}', ' ')

    data = kb.load_data(repo, id)
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
    kb.write_data(repo, id, new_content, encryption_key)

    kblog.write_operation_log(context, 'MOD_PROPS', repo, id, data=data)

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
    repo = get_req_param_repo()
    id = get_request_param('id')
    org_u_date = get_request_param('org_u_date')
    p_b64logic = get_request_param('logic')
    p_silent = get_request_param('silent')

    data = kb.load_data(repo, id)
    if data['status'] != 'OK':
        result = create_result_object('ERROR:' + data['status'])
        return result

    content = data['content']
    if content['U_DATE'] != org_u_date:
        detail = {
            'U_DATE': content['U_DATE'],
            'U_USER': content['U_USER']
        }
        kblog.write_operation_log(context, 'SAVE_LOGIC:CONFLICT', repo, id, data=data)
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
    kb.write_data(repo, id, new_content, encryption_key)

    kblog.write_operation_log(context, 'SAVE_LOGIC', repo, id, data=data)

    detail = {
        'saved_id': id,
        'U_DATE': str(new_content['U_DATE']),
        'U_USER': new_content['U_USER']
    }
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_delete(context):
    repo = get_req_param_repo()
    id = get_request_param('id')

    if not kb.has_privilege_for_repo(context, repo):
        kblog.write_operation_log(context, 'DELETE:FORBIDDEN', repo, id)
        return create_result_object('NO_ACCESS_RIGHTS')

    status = kb.delete_data(repo, id)
    kblog.write_operation_log(context, 'DELETE', repo, id, info=status)

    result = create_result_object(status)
    return result

#------------------------------------------------------------------------------
def proc_check_exists(context):
    repo = get_req_param_repo()
    if not kb.has_privilege_for_repo(context, repo):
        return create_result_object('NO_ACCESS_RIGHTS')

    id = get_request_param('id')
    detail = kb.check_exists(repo, id)
    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_change_data_id(context):
    repo = get_req_param_repo()
    id_fm = get_request_param('id_fm')
    id_to = get_request_param('id_to')

    if not context.is_admin() and not context.has_permission('sysadmin'):
        kblog.write_operation_log(context, 'CHG_DATA_ID:FORBIDDEN', repo, id_fm, 'to:' + id_to)
        result = create_result_object('FORBIDDEN')
        return result

    status = kb.change_data_id(repo, id_fm, id_to)
    detail = {
        'id_fm': id_fm,
        'id_to': id_to
    }

    kblog.write_operation_log(context, 'CHG_DATA_ID', repo, id_fm, 'to:' + id_to)

    result = create_result_object(status, detail)
    return result

#------------------------------------------------------------------------------
def proc_check_id(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        result = create_result_object('FORBIDDEN')
        return result

    repo = get_req_param_repo()
    next_id = kb.get_next_id(repo)
    vacant_ids_res = kb.get_vacant_ids(repo)

    detail = {
        'next_id': next_id,
        'vacant_id_info': vacant_ids_res
    }

    result = create_result_object('OK', detail)
    return result

#------------------------------------------------------------------------------
def proc_get_repo_list(context):
    repo_list = kb.get_repo_list(context)
    send_result_json('OK', repo_list)
    return None

#------------------------------------------------------------------------------
def proc_get_repo_props(context):
    repo = get_req_param_repo()
    props = kb.read_repo_props_as_text(repo)
    if props is None:
        props = ''
    b64props = util.encode_base64(props)
    result_data = {
        'repo': repo,
        'props': b64props
    }
    send_result_json('OK', result_data)
    return None

#------------------------------------------------------------------------------
def proc_save_repo_props(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        send_result_json('FORBIDDEN')
        return None

    repo = get_req_param_repo()
    b64props = get_request_param('props')
    props = util.decode_base64(b64props)
    kb.save_repo_props(repo, props)
    result_data = {
        'repo': repo
    }

    kblog.write_operation_log(context, 'MOD_REPO_PROPS', repo)

    send_result_json('OK', result_data)
    return None

#------------------------------------------------------------------------------
def proc_create_repo(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        send_result_json('FORBIDDEN')
        return None

    repo = get_req_param_repo()
    b64props = get_request_param('props')
    props = util.decode_base64(b64props)
    status = kb.create_repo(repo, props)
    result_data = {
        'repo': repo
    }

    kblog.write_operation_log(context, 'CREATE_REPO', repo)

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_delete_repo(context):
    if not context.is_admin() and not context.has_permission('sysadmin'):
        send_result_json('FORBIDDEN')
        return None

    repo = get_req_param_repo()
    status = kb.delete_repo(repo)
    result_data = {
        'repo': repo
    }

    kblog.write_operation_log(context, 'DELETE_REPO', repo)

    send_result_json(status, result_data)
    return None

#------------------------------------------------------------------------------
def proc_export_html(context):
    repo = get_req_param_repo()
    id = get_request_param('id')

    if not kb.has_privilege_for_repo(context, repo):
        kblog.write_operation_log(context, 'EXPORT_HTML:FORBIDDEN', repo, id)
        send_error_text('NO_ACCESS_RIGHTS:repo=' + repo)
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

    kblog.write_operation_log(context, 'EXPORT_HTML', repo, id)

    util.send_as_file(b, filename=filename)
    result = create_result_object('OK', None, 'octet-stream')
    return result

#------------------------------------------------------------------------------
def proc_export_data(context):
    repo = get_req_param_repo()
    if not kb.has_privilege_for_repo(context, repo):
        kblog.write_operation_log(context, 'EXPORT_DATA:FORBIDDEN', repo, dataid='')
        send_error_text('NO_ACCESS_RIGHTS:repo=' + repo)
        return None

    p_decrypt = websys.get_raw_request_param('decrypt')
    decrypt = p_decrypt == '1'
    b = kb.export_data(repo, decrypt)

    filename = 'kbdata'
    if repo != kb.get_default_repo_id():
        filename += '_' + repo
    filename += '.zip'

    kblog.write_operation_log(context, 'EXPORT_DATA', repo, dataid='')

    util.send_as_file(b, filename=filename)
    return None

def proc_export_data_all(context):
    if not context.is_admin() and not has_valid_apitoken():
        kblog.write_operation_log(context, 'EXPORT_ALL_DATA:FORBIDDEN', repo='', dataid='')
        send_error_text('NO_ACCESS_RIGHTS')
        return None
    p_decrypt = websys.get_raw_request_param('decrypt')
    decrypt = p_decrypt == '1'

    kblog.write_operation_log(context, 'EXPORT_ALL_DATA', repo='', dataid='')

    timestamp = util.get_datetime_str(fmt='%Y%m%dT%H%M%S')
    fllename = 'kbdata-all-' + timestamp + '.zip'

    b = kb.export_all_data(context, decrypt)
    util.send_as_file(b, filename=fllename)
    return None

#------------------------------------------------------------------------------
def proc_get_kb_log(context):
    status = 'OK'
    if context.is_admin():
        p_n = get_request_param('n')
        n = 50
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
    #    'get_repo_list',
    #    'get_repo_props',
    #    'save_repo_props',
    #    'create_repo',
    #    'delete_repo'
    #]

    #if act in funcname_list:
    func_name = 'proc_' + act
    g = globals()
    if func_name in g:
        result = g[func_name](context)
    else:
        # from url query string w/o encryption
        act = websys.get_raw_request_param('act')
        if act == 'export':
            all = websys.get_raw_request_param('all', '')
            if all == '1':
                # api.cgi?act=export&all=1&decrypt=1
                proc_export_data_all(context)
            else:
                # api.cgi?act=export&repo=xyz&decrypt=1
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
    context = websys.on_access()

    act = get_request_param('act')
    if act is None:
        util.send_response(appconfig.system_name)
    elif act == 'get':
        proc_get_data(context)
    elif act == 'dlb64content':
        proc_download_b64content(context)
    elif act == 'get_repo_list':
        proc_api(context, act)
    else:
        repo = get_request_param('repo')
        if kb.is_authorized(context) or has_valid_apitoken() or kb.is_anonymous_allowed(repo):
            proc_api(context, act)
        else:
            proc_on_forbidden(act)
