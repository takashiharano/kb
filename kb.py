#==============================================================================
# Knowledge Base System
# Copyright (c) 2021 Takashi Harano
#==============================================================================
import os
import sys
import re

import appconfig

ROOT_PATH = appconfig.root_path

sys.path.append(os.path.join(os.path.dirname(__file__), ROOT_PATH + 'libs'))
import util
import bsb64

util.append_system_path(__file__, ROOT_PATH)
util.append_system_path(__file__, ROOT_PATH + 'websys/bin')
import web

WORKSPACE_PATH = appconfig.workspace_path
DATA_BASE_DIR_PATH = WORKSPACE_PATH + 'scm/'
WK_PATH = WORKSPACE_PATH + 'wk/'
PROPS_FILENAME = 'properties.txt'

DATA_ENCRYPTION_HEAD = '#DATA'
DATA_ENCRYPTION_KEY = appconfig.data_encryption_key
DEFAULT_ENCRYPTION_KEY = appconfig.default_encryption_key

DEFAULT_CONTENT = {
    'TITLE': '',
    'C_DATE': '',
    'C_USER': '',
    'U_DATE': '',
    'U_USER': '',
    'ASSIGNEE': '',
    'LABELS': '',
    'STATUS': '',
    'FLAGS': '',
    'DATA_PRIVS': ''
}

SP_KEYWORD_NANIDS = '*nanids'
DEFAULT_SCM_ID = '0'

#------------------------------------------------------------------------------
def get_workspace_path():
    return WORKSPACE_PATH

def get_scm_dir_path(scm):
    return DATA_BASE_DIR_PATH + scm + '/'

def get_data_dir_path(scm):
    return DATA_BASE_DIR_PATH + scm + '/data/'

def get_datafile_path(scm, id):
    datadir = get_data_dir_path(scm)
    return datadir + id + '.txt'

def get_props_file_path(scm):
    dir_path = get_scm_dir_path(scm)
    path = dir_path + PROPS_FILENAME
    return path

def get_default_scm_id():
    return DEFAULT_SCM_ID

#------------------------------------------------------------------------------
def get_schema_list(context):
    dirs = util.list_dirs(DATA_BASE_DIR_PATH)
    scm_list = []
    for i in range(len(dirs)):
        scm = dirs[i]
        if has_privilege_for_scm(context, scm):
            props = load_scm_props(scm)
            scm_data = {
                'id': scm,
                'props': props
            }
            scm_list.append(scm_data)
    return scm_list

#------------------------------------------------------------------------------
def has_privilege_for_scm(context, scm):
    props = load_scm_props(scm)
    if is_authorized(context):
        if not 'privs' in props:
            return True
        if satisfy_privs(context, props['privs']):
            return True
    if is_anonymous_allowed(scm):
        return True
    return False

#------------------------------------------------------------------------------
def read_scm_props_as_text(scm):
    path = get_props_file_path(scm)
    text = util.read_text_file(path)
    return text

#------------------------------------------------------------------------------
def load_scm_props(scm):
    text = read_scm_props_as_text(scm)
    try:
        props = util.from_json(text)
    except:
        props = {}

    if props is None:
        props = {}

    if scm == get_default_scm_id():
        if not 'name' in props:
            props['name'] = 'Main'

    return props

#------------------------------------------------------------------------------
def schema_exists(scm):
    path = DATA_BASE_DIR_PATH + scm
    return util.path_exists(path)

#------------------------------------------------------------------------------
def create_schema(scm, props):
    if schema_exists(scm):
        return 'SCM_ALREADY_EXISTS'
    if not util.match(scm, '^[a-z0-9_\\-]+$'):
        return 'ILLEGAL_SCM_ID'

    path = DATA_BASE_DIR_PATH + scm
    util.mkdir(path)
    save_scm_props(scm, props)
    return 'OK'

def delete_schema(scm):
    if not schema_exists(scm):
        return 'SCM_NOT_FOUND'
    path = DATA_BASE_DIR_PATH + scm
    try:
        util.rmdir(path, True)
        status = 'OK'
    except Exception as e:
        status = 'DELETE_SCHEMA_ERR:' + str(e)
    return status

#------------------------------------------------------------------------------
def save_scm_props(scm, json_text):
    path = get_props_file_path(scm)
    util.write_text_file(path, json_text)

#------------------------------------------------------------------------------
def get_all_data_id_list(scm):
    datadir = get_data_dir_path(scm)
    files = util.list_files(datadir, '.txt')
    data_id_list = []
    for i in range(len(files)):
        filename = files[i]
        id = util.replace(filename, '.txt', '')
        data_id_list.append(id)
    return data_id_list

#------------------------------------------------------------------------------
def get_list(context, scm, target_id=None):
    data_id_list = get_all_data_id_list(scm)
    data_list = []
    fixed_data_list = []
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        if target_id is not None and target_id != id or target_id is None and is_nan_id(id):
            continue
        try:
            data = load_data(scm, id, head_only=True)
            content = data['content']
            if not has_data_privilege(context, content):
                continue
        except:
            content = DEFAULT_CONTENT.copy()
            data = {
                'id': id,
                'status': 'LOAD_ERROR',
                'content': content
            }

        if target_id is None and should_omit_listing(context, id, content):
            continue

        if is_fixed_data(content):
            fixed_data_list.append(data)
        else:
            data_list.append(data)

    total_count = len(fixed_data_list) + len(data_list)
    if appconfig.list_max > 0 and total_count > appconfig.list_max:
        sorted_data_list = sorted(data_list, key=lambda x: x['content']['U_DATE'], reverse=True)
        data_list = []
        cnt = 0
        for i in range(len(sorted_data_list)):
            if appconfig.list_max == 0 or cnt < appconfig.list_max:
                data = sorted_data_list[i]
                data_list.append(data)
                cnt += 1
            else:
                break

    all_data_size = util.get_path_size(DATA_BASE_DIR_PATH, recursive=True)

    data_list_obj = {
        'all_data_size': all_data_size,
        'total_count': total_count,
        'fixed_data_list': fixed_data_list,
        'data_list': data_list
    }

    return data_list_obj

def should_omit_listing(context, id, content=None):
    if is_nan_id(id):
        return True
    return should_omit_content(context, content)

def should_omit_content(context, content=None):
    if content is not None:
        if not has_data_privilege(context, content):
            return True
        if has_flag(content, 'HIDDEN'):
            return True
    return False

def is_fixed_data(content):
    return has_flag(content, 'FIXED')

def is_nan_id(id):
    if util.match(id, '[^0-9]'):
        return True
    return False

def has_flag(content, flag_name):
    if 'FLAGS' in content and _has_flag(content['FLAGS'], flag_name):
        return True
    return False

def _has_flag(flags_text, target_flag):
    flags_text = flags_text.lower()
    target_flag = target_flag.lower()
    return util.has_item_value(flags_text, target_flag)

def filter_by_id(all_id_list, keywords):
    filtered_id_list = []
    new_keywords = []
    for i in range(len(keywords)):
        keyword = keywords[i]
        if not keyword.startswith('id:'):
            new_keywords.append(keyword)
            continue

        keyword = util.replace(keyword, 'id:', '', flags=re.IGNORECASE)
        if util.match(keyword, '-'):
            filtered_id_list = filter_by_id_range(all_id_list, keyword, filtered_id_list)
        elif util.match(keyword, ','):
            filtered_id_list = filter_by_ids(all_id_list, keyword, filtered_id_list)
        else:
            id = keyword
            if id in all_id_list:
                filtered_id_list.append(id)

    return {'id_list': filtered_id_list, 'keywords': new_keywords}

def filter_by_ids(all_id_list, keyword, filtered_id_list):
    ids = keyword.split(',')
    for i in range(len(ids)):
        id = ids[i]
        if id in all_id_list:
            filtered_id_list.append(id)
    return filtered_id_list

def filter_by_id_range(all_id_list, keyword, filtered_id_list):
    ids = keyword.split('-')
    st_id =  util.to_int(ids[0])
    if len(ids) == 1:
        ed_id = util.to_int(ids[0])
    else:
        ed_id = util.to_int(ids[1])

    if st_id > ed_id:
        tmp = ed_id
        ed_id = st_id
        st_id = tmp

    ed_id += 1

    for i in range(st_id, ed_id):
        id = str(i)
        if id in all_id_list:
            filtered_id_list.append(id)

    return filtered_id_list

#------------------------------------------------------------------------------
def search_data(context, scm, q):
    q = q.strip()
    q = util.to_half_width(q)
    q = util.replace(q, '\\s{2,}', ' ')
    keywords = util.split_keywords(q)

    id_list = get_all_data_id_list(scm)

    filtered = filter_by_id(id_list, keywords)

    id_filtering = False
    if len(filtered['id_list']) > 0:
        id_filtering = True
        id_list = filtered['id_list']
        keywords = filtered['keywords']

    incl_nan_id = False
    for i in range(len(keywords)):
        keyword = keywords[i]
        if keyword == SP_KEYWORD_NANIDS:
            incl_nan_id = True

    all_data = []
    for i in range(len(id_list)):
        id = id_list[i]
        if not incl_nan_id and is_nan_id(id):
            continue
        try:
            data = load_data(scm, id)
            content = data['content']
            if should_omit_content(context, content):
                dontinue
            data['content'] = convert_data_to_half_width(content)
            data['score'] = 0
            all_data.append(data)
        except:
            continue

    wk_data_list = all_data
    keyword_matched = False
    for i in range(len(keywords)):
        keyword = keywords[i]
        macthed_data_list = []
        for j in range(len(wk_data_list)):
            data = wk_data_list[j]
            score = calc_data_macthed_score(data, keyword)
            if score > 0:
                data['score'] += score
                macthed_data_list.append(data)
                keyword_matched = True

        wk_data_list = macthed_data_list

    if id_filtering and not keyword_matched:
        wk_data_list = all_data

    data_list = []
    for i in range(len(wk_data_list)):
        data = wk_data_list[i]
        content = data['content']
        del content['BODY']

        data['content'] = content
        data_list.append(data)

    total_count = len(data_list)
    if appconfig.list_max > 0 and total_count > appconfig.list_max:
        data_list2 = sorted(data_list, key=lambda x: x['score'], reverse=True)
        data_list = []
        cnt = 0
        for i in range(len(data_list2)):
            if appconfig.list_max == 0 or cnt < appconfig.list_max:
                data = data_list2[i]
                data_list.append(data)
                cnt += 1
            else:
                break

    data_list_obj = {
        'total_count': total_count,
        'data_list': data_list
    }

    return data_list_obj

def convert_data_to_half_width(content):
    if 'TITLE' in content:
        content['TITLE'] = util.to_half_width(content['TITLE'])
    if 'LABELS' in content:
        content['LABELS'] = util.to_half_width(content['LABELS'])
    if 'BODY' in content:
        content['BODY'] = util.to_half_width(content['BODY'])
    return content

def calc_data_macthed_score(data, keyword):
    id = data['id']
    content = data['content']
    score = 0

    keyword_lc = keyword.lower()
    if keyword_lc == SP_KEYWORD_NANIDS and is_nan_id(id):
        score = 1

    elif keyword_lc.startswith('title:'):
        keyword = extract_sraech_keyword(keyword, 'title')
        score = is_matches_title(content['TITLE'], keyword)

    elif keyword_lc.startswith('label:'):
        keyword = extract_sraech_keyword(keyword, 'label')
        if is_matches_items(content, 'LABELS', keyword):
            score = 10

    elif keyword_lc.startswith('status:'):
        keyword_lc = extract_sraech_keyword(keyword_lc, 'status')
        if 'STATUS' in content and content['STATUS']:
            status_lc = content['STATUS'].lower()
            if status_lc == keyword_lc:
                score = 10

    elif keyword_lc.startswith('created_at:'):
        keyword = extract_sraech_keyword(keyword, 'created_at')
        if is_date_matches(content['C_DATE'], keyword):
            score = 10

    elif keyword_lc.startswith('updated_at:'):
        keyword = extract_sraech_keyword(keyword, 'updated_at')
        if is_date_matches(content['U_DATE'], keyword):
            score = 10

    elif keyword_lc.startswith('created_by:'):
        keyword = extract_sraech_keyword(keyword, 'created_by')
        score = is_target_matches(content['C_USER'], keyword, True)

    elif keyword_lc.startswith('updated_by:'):
        keyword = extract_sraech_keyword(keyword, 'updated_by')
        score = is_target_matches(content['U_USER'], keyword, True)

    elif keyword_lc.startswith('assignee:'):
        keyword = extract_sraech_keyword(keyword, 'assignee')
        score = is_target_matches(content['ASSIGNEE'], keyword, True)

    elif keyword_lc.startswith('priv:'):
        keyword = extract_sraech_keyword(keyword, 'priv')
        if is_matches_items(content, 'DATA_PRIVS', keyword):
            score = 10

    elif keyword_lc.startswith('body:'):
        keyword = extract_sraech_keyword(keyword, 'body')
        score = count_matched_key(content['BODY'], keyword)

    else:
        score += is_matches_title(content['TITLE'], keyword) * 2
        score += count_matched_key(content['TITLE'], keyword) * 300
        score += count_matched_key(content['LABELS'], keyword) * 100

        if not 'DATA_TYPE' in content or content['DATA_TYPE'] != 'dataurl':
            score += count_matched_key(content['BODY'], keyword)
            score -= count_matched_key_in_dataurl(content['BODY'], keyword)

    return score

def extract_sraech_keyword(s, name):
    keyword = util.replace(s, name + ':', '', flags=re.IGNORECASE)
    keyword = util.extract_quoted_string(keyword)
    return keyword

def is_target_matches(target, keyword, partial_match):
    if target == '':
        return 0
    score = 0
    target = target.lower()
    keyword = keyword.lower()
    if partial_match and util.match(target, keyword):
        score += 100
    if target == keyword:
        score += 100
    return score

def is_date_matches(target, search_val):
    try:
        return _is_date_matches(target, search_val)
    except:
        return False

def _is_date_matches(target, search_val):
    try:
        target = int(target)
    except:
        return False

    search_val = util.replace(search_val, '-', '')
    search_val = util.replace(search_val, '/', '')
    search_val = util.replace(search_val, ':', '')
    search_val = util.replace(search_val, '\\.', '')

    if search_val.startswith('>='):
        str_datetime = search_val[2:]
    elif search_val.startswith('<='):
        str_datetime = search_val[2:]
        str_datetime = fill2359(str_datetime)
    elif search_val.startswith('>'):
        str_datetime = search_val[1:]
        str_datetime = fill2359(str_datetime)
    elif search_val.startswith('<'):
       str_datetime = search_val[1:]
    elif search_val.startswith('='):
       str_datetime = search_val[1:]
    else:
       str_datetime = search_val

    millis = util.get_unixtime_millis(str_datetime)

    if search_val.startswith('>='):
        if target >= millis:
            return True
    elif search_val.startswith('<='):
        if target <= millis:
            return True
    elif search_val.startswith('>'):
        if target > millis:
            return True
    elif search_val.startswith('<'):
        if target <  millis:
            return True
    else:
        target = floor_target_datetime(target, str_datetime)
        if target == millis:
            return True

    return False

def floor_target_datetime(target, val):
    if len(val) == 4:
        scale = 'Y'
    elif len(val) == 6:
        scale = 'M'
    elif len(val) == 8:
        scale = 'D'
    elif len(val) == 11:
        scale = 'H'
    elif len(val) == 13:
        scale = 'm'
    elif len(val) == 15:
        scale = 'S'
    else:
        return target

    s = target / 1000
    unixtime = util.floor_unixtime(s, scale)
    unixmillis = int(unixtime * 1000)
    return unixmillis

def fill2359(src):
    if len(src) == 8:
        # YYYYMMDD
        return src + 'T' + '235959999'
    elif len(src) == 11:
        # YYYYMMDDTHH
        return src + '5959999'
    elif len(src) == 13:
        # YYYYMMDDTHHMI
        return src + '59999'
    elif len(src) == 15:
        # YYYYMMDDTHHMISS
        return src + '999'
    return src

def is_matches_title(title, keyword):
    if title == '':
        return 0
    score = 0
    title = title.lower()
    keyword = keyword.lower()
    if title == keyword:
        score += 300
    score += title.count(keyword) * 10
    return score

def is_matches_items(content, item_key, keyword):
    if not item_key in content:
        return False
    items = content[item_key]
    if items == '':
        return False
    items = items.lower()
    keyword = keyword.lower()
    item_list = items.split(' ')
    for i in range(len(item_list)):
        item = item_list[i]
        if item == keyword:
            return True
    return False

def count_matched_key(target, keyword):
    if target == '':
        return 0
    target = target.lower()
    keyword = keyword.lower()
    count = target.count(keyword)
    return count

def count_matched_key_in_dataurl(target, keyword):
    target = target.lower()
    count = 0
    idx = 0
    while True:
        s = get_dataurl_content(target, idx)
        if s is None:
            break
        count += s.count(keyword)
        idx += 1
    return count

#------------------------------------------------------------------------------
def get_data(context, scm, id, need_encode_b64=False):
    try:
        data = load_data(scm, id)
    except Exception as e:
        data = {
            'id': id,
            'status': str(e)
        }
        return data

    content = data['content']
    if not has_data_privilege(context, content):
        data = {
            'id': id,
            'status': 'FORBIDDEN'
        }
        return data

    if need_encode_b64:
        if 'BODY' in content:
            content['BODY'] = util.encode_base64(content['BODY'])
        data['content'] = content

    return data

def load_data_as_text(scm, id):
    text_path = get_datafile_path(scm, id)
    if not util.path_exists(text_path):
        raise Exception('DATA_NOT_FOUND')
    text = util.read_text_file(text_path)
    return text

def get_datafile_info(scm, id):
    path = get_datafile_path(scm, id)
    if not util.path_exists(path):
        return None
    return util.get_file_info(path)

def load_data(scm, id, head_only=False):
    fileinfo = get_datafile_info(scm, id)
    text = load_data_as_text(scm, id)

    data = {
        'id': id,
        'status': 'OK',
        'size': 0,
        'encrypted': False,
        'content': None
    }

    if fileinfo is not None:
        data['size'] = fileinfo['size']

    if text.startswith(DATA_ENCRYPTION_HEAD):
        text = util.decode_base64s(text[len(DATA_ENCRYPTION_HEAD):], DATA_ENCRYPTION_KEY)
        data['encrypted'] = True

    data['content'] = parse_content(text, head_only)
    return data

def parse_content(text, head_only=False):
    content = DEFAULT_CONTENT.copy()
    lines = util.text2list(text)
    idx = 0
    for i in range(len(lines)):
        line = lines[i]
        if line == '':
            idx = i + 1
            break
        line = str.strip(line)

        p = line.find(':')
        if p == -1:
            continue

        field_name = line[0:p]
        fielf_value = str.strip(line[p + 1:])
        content[field_name] = fielf_value

    if head_only:
        if 'LOGIC' in content and content['LOGIC'] != '':
            content['LOGIC'] = 'Y'
    else:
        body = ''
        for i in range(idx, len(lines)):
            body += lines[i] + '\n'
        content['BODY'] = body

    return content

#------------------------------------------------------------------------------
def save_data(scm, id, new_data, user=''):
    if id == '':
        id = get_next_id(scm)

    now = util.get_unixtime_millis()

    silent = True if new_data['silent'] == '1' else False
    new_content = new_data['content']

    if user == '':
        user = 'Anonymous'

    try:
        data = load_data(scm, id)
    except:
        data = {
            'content': {
                'C_DATE': now,
                'C_USER': user
            }
        }
        silent = False

    content = data['content']

    if not 'C_DATE' in content:
        content['C_DATE'] = ''
    if not 'C_USER' in content:
        content['C_USER'] = ''
    if not 'FLAGS' in content:
        content['FLAGS'] = ''

    labels = new_content['LABELS']
    labels = to_set(labels)

    if new_data['only_labels']:
        content['LABELS'] = labels
        secure = data['encrypted']
    else:
        title = new_content['TITLE']
        body = util.decode_base64(new_content['BODY'])
        isdataurl = is_dataurl(body)
        secure = True if new_data['encryption'] == '1' else False

        content['TITLE'] = title
        content['LABELS'] = labels
        content['STATUS'] = new_content['STATUS']
        content['ASSIGNEE'] = new_content['ASSIGNEE']
        content['FLAGS'] = new_content['FLAGS']

        if 'DATA_PRIVS' in new_content:
            content['DATA_PRIVS'] = new_content['DATA_PRIVS']

        if isdataurl:
            content['DATA_TYPE'] = 'dataurl'
        else:
            content['DATA_TYPE'] = ''

        if 'PASSWORD' in new_content and new_content['PASSWORD'] != '':
            content['PASSWORD'] = new_content['PASSWORD']
        else:
            content['PASSWORD'] = ''

        content['LOGIC'] = new_content['LOGIC']

        content = del_if_filed_is_empty(content, 'LOGIC')
        content = del_if_filed_is_empty(content, 'PASSWORD')
        content = del_if_filed_is_empty(content, 'DATA_TYPE')

        content['BODY'] = body

    if not silent:
        content['U_DATE'] = now
        content['U_USER'] = user

    data['content'] = content
    encryption_key = DATA_ENCRYPTION_KEY if secure else None

    write_data(scm, id, content, encryption_key)

    saved_data = {
        'id': id,
        'data': data
    }
    return saved_data

def del_if_filed_is_empty(obj, key):
    if key in obj and obj[key] == '':
        del obj[key]
    return obj

#------------------------------------------------------------------------------
def to_set(s):
    s = util.to_half_width(s)
    s = s.lower()
    data_list = s.split(' ')
    data_set = util.to_set(data_list)
    s = ''
    i = 0
    for v in data_set:
        if i > 0:
            s += ' '
        s += v
        i += 1
    return s

#------------------------------------------------------------------------------
def is_dataurl(s):
  s = s.strip()
  return util.match(s, '^data:.+;base64,[A-Za-z0-9+/=\n]+$')

#------------------------------------------------------------------------------
def write_data(scm, id, content, encryption_key=None, path=None):
    text = ''

    for key in content:
        if key != 'BODY':
            value = str(content[key])
            text += key + ': ' + value + '\n'

    text += '\n'
    text += content['BODY']

    if encryption_key is not None:
        text = DATA_ENCRYPTION_HEAD + util.encode_base64s(text, encryption_key)

    if path is None:
        path = get_datafile_path(scm, id)

    util.write_text_file(path, text)

def delete_data(scm, id):
    if id == '':
        return 'ERR_ROOT_PATH'
    if util.match(id, '\\.\\.'):
        return 'ERR_PARENT_PATH'
    path = get_datafile_path(scm, id)
    if not util.path_exists(path):
        return 'NOT_FOUND'
    util.delete(path)
    return 'OK'

def check_exists(scm, id):
    if id == '':
        raise Exception('EMPTY_ID')
    path = get_datafile_path(scm, id)
    if util.path_exists(path):
        return True
    else:
        return False

def get_max_id(scm):
    max_id = 0
    data_id_list = get_all_data_id_list(scm)
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        try:
            n = int(id)
        except:
            continue

        if n > max_id:
            max_id = n
    return max_id

def get_next_id(scm):
    id = get_max_id(scm) + 1
    return str(id)

def get_empty_ids(scm):
    all_ids = get_all_data_id_list(scm)
    n_list = []
    for i in range(len(all_ids)):
        id = all_ids[i]
        try:
            n = int(id)
        except:
            continue
        n_list.append(n)
    n_list.sort()

    empty_ids = []
    empty_cnt = 0
    prev_n = -1
    for i in range(len(n_list)):
        n = n_list[i]
        df = n - prev_n
        if prev_n >= 0 and df >= 2:
            st = prev_n + 1
            ed = st + df - 1
            for j in range(st, ed):
                empty_ids.append(str(j))
                empty_cnt += 1
        prev_n = n

    omit_count = 0
    MAX = 10
    empty_ids_len = len(empty_ids)
    if empty_ids_len > MAX:
        omit_count = empty_ids_len - MAX
        wk_list = []
        mx = MAX - 1
        for i in range(mx):
            wk_list.append(empty_ids[i])
        wk_list.append(empty_ids[-1])
        empty_ids = wk_list

    result = {
        'empty_ids': empty_ids,
        'omit_count': omit_count
    }
    return result

def change_data_id(scm, id_fm, id_to):
    if not check_exists(scm, id_fm):
        return 'SRC_NOT_FOUND'
    if check_exists(scm, id_to):
        return 'DEST_ALREADY_EXISTS'
    path_fm = get_datafile_path(scm, id_fm)
    path_to = get_datafile_path(scm, id_to)
    ret = util.move(path_fm, path_to)
    if ret:
        return 'OK'
    return 'FAILED:NEED_TO_FILE_CHECK_ON_THE_SERVER'

def export_data(scm, decrypt=False):
    if decrypt:
        wk_data_path = WK_PATH + scm + '/data/'
        util.mkdir(wk_data_path)
        decrypt_data(scm, wk_data_path)
        target_path = wk_data_path
    else:
        target_path = get_data_dir_path(scm)

    b = util.zip(None, target_path)
    util.delete(WK_PATH, True)
    return b

def export_all_data(context, decrypt=False):
    util.delete(WK_PATH, True)
    if decrypt:
        target_path = WK_PATH + 'kbdata/'
        scm_list = get_schema_list(context)

        for i in range(len(scm_list)):
            scm_data = scm_list[i]
            scm = scm_data['id']
            src_scm_props_path = get_props_file_path(scm)
            wk_scm_path = target_path + scm + '/'
            wk_data_path = wk_scm_path + 'data/'
            util.mkdir(wk_data_path)
            decrypt_data(scm, wk_data_path)
            if util.path_exists(src_scm_props_path):
                util.copy(src_scm_props_path, wk_scm_path)
    else:
        target_path = DATA_BASE_DIR_PATH

    b = util.zip(None, target_path)
    util.delete(WK_PATH, True)
    return b

def decrypt_data(scm, dst_base_dir):
    encdec_data(scm, dst_base_dir, encryption_key=None)

def encrypt_data(scm, dst_base_dir, encryption_key=DATA_ENCRYPTION_KEY):
    encdec_data(scm, dst_base_dir, encryption_key)

def encdec_data(scm, dst_base_dir, encryption_key):
    data_id_list = get_all_data_id_list(scm)
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        dst_path = dst_base_dir + id + '.txt'
        try:
            data = load_data(scm, id)
            content = data['content']
            write_data(scm, id, content, encryption_key=encryption_key, path=dst_path)
        except Exception as e:
            text = '!ERROR! ' + str(e) + '\n---\n'
            text += load_data_as_text(scm, id)
            dst_path = dst_base_dir + '_error_' + id + '.txt'
            util.write_text_file(dst_path, text)

#------------------------------------------------------------------------------
def download_b64content(context, scm, id, idx=None):
    if idx is None:
        idx = 0

    data = get_data(context, scm, id)
    content = data['content']
    s = get_dataurl_content(content['BODY'], idx)
    if s is None:
        send_error_file('NO_BASE64_CONTENT')
        return

    s = util.remove_space_newline(s)
    p = s.find(',')
    p += 1
    prefix = s[0:p]
    b64content = s[p:]
    ext = get_ext_from_mimetype(prefix)
    send_b64content_as_binary(b64content, ext)

def send_b64content_as_binary(s, ext=None):
    if ext is None:
        ext = get_ext_from_base64(s)
    if ext is None:
        ext = 'txt'

    filename = 'data.' + ext

    try:
        b = util.decode_base64(s, bin=True)
    except:
        send_error_file('DECODE_ERROR')
        return

    util.send_binary(b, filename=filename)

def send_error_file(s):
    b = s.encode()
    util.send_binary(b, filename='error.txt')

#------------------------------------------------------------------------------
def get_dataurl_content(s, idx):
    # prevent to fetch '\n\ndata:' pattern
    s = util.replace(s, '\n{2,}', '#')

    pattern = 'data:.+;base64,[A-Za-z0-9+/=\n]+'
    match_itrs = re.finditer(pattern, s)
    cnt = 0
    for itr in match_itrs:
        dataurl = itr.group()
        if cnt == idx:
            return dataurl

        cnt += 1

    return None

#------------------------------------------------------------------------------
# s: data:text/plain;base64,
def get_ext_from_mimetype(s):
    filetypes = {
        'bmp': 'image/bmp',
        'css': 'text/css',
        'csv': 'text/csv',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'exe': 'application/x-msdownload',
        'gif': 'image/gif',
        'html': 'text/html',
        'jpg': 'image/jpeg',
        'js': 'text/javascript',
        'json': 'application/json',
        'mp3': 'audio/mpeg',
        'mp4': 'video/mp4',
        'pdf': 'application/pdf',
        'png': 'image/png',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'py': 'text/x-python',
        'txt': 'text/plain',
        'wav': 'audio/wav',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xml': 'text/xml',
        'zip': 'application/x-zip-compressed'
    }
    type = util.replace(s, 'data:', '')
    type = util.replace(type, ';base64,', '')
    ext = None
    for k in filetypes:
        if type == filetypes[k]:
            ext = k
            break
    return ext

def get_ext_from_base64(s):
    filetypes = {
        'bmp': 'Qk0',
        'gif': 'R0lGO',
        'jpg': '/9',
        'png': 'iVBORw0KGgo',
        'xml': 'PD94bWw',
        'zip': 'UEsDB'
    }
    ext = None
    for k in filetypes:
        if s.startswith(filetypes[k]):
            ext = k
            break
    return ext

#------------------------------------------------------------------------------
def is_authorized(context):
    if appconfig.access_control != 'auth' or context.is_authorized():
        return True
    return False

def has_privilege(context, target_priv):
    access_control = appconfig.access_control

    if access_control == 'auth':
        # target_priv = kb.xxx
        return context.has_permission(target_priv)

    if util.has_item_value(access_control, 'auth', separator='|'):
        if context.has_permission(target_priv):
            return True

    if access_control == 'full':
        return True

    if target_priv == 'kb':
        # public-mode
        return True

    target_priv = util.replace(target_priv, 'kb\\.', '')
    return util.has_item_value(access_control, target_priv, separator='|')

def has_data_privilege(context, content):
    if context.is_admin():
        return True
    dataprivs = content['DATA_PRIVS'] if 'DATA_PRIVS' in content else ''
    return satisfy_privs(context, dataprivs)

def satisfy_privs(context, required_privs):
    if context.is_admin():
        return True
    if required_privs == '':
        return True
    required_privs = required_privs.lower()
    privs = required_privs.split(' ')
    for i in range(len(privs)):
        priv = privs[i]
        if priv.startswith('-'):
            priv = priv[1:]
            if context.has_permission(priv):
                return False
        elif not context.has_permission(priv):
            return False
    return True

def can_operate(context, scm, operation_name):
    scm_kb_admin_priv = scm + '.kb.admin'
    kb_op_priv = 'kb.' + operation_name
    scm_kb_op_priv = scm + '.' + kb_op_priv
    privs = ['sysadmin', 'kb.admin', scm_kb_admin_priv, kb_op_priv, scm_kb_op_priv]
    for priv in privs:
        if has_privilege(context, priv):
            return True

    if is_anonymous_op_allowed(scm, operation_name):
        return True

    return False

def is_anonymous_allowed(scm):
    return is_anonymous_op_allowed(scm, '*')

def is_anonymous_op_allowed(scm, operation_name):
    if scm is None:
        return False

    props = load_scm_props(scm)
    if not 'privs' in props:
        return False

    scm_privs = props['privs']
    if scm_privs == 'anonymous':
        return True

    scm_privs = scm_privs.lower()
    privs = scm_privs.split(' ')
    for i in range(len(privs)):
        priv = privs[i]
        w = priv.split('.')
        if len(w) == 2:
            if w[0] == 'anonymous':
                if operation_name == '*' or w[1] == operation_name:
                    return True
    return False

def is_valid_token(token_enc, scm, target_id):
    try:
        return _is_valid_token(token_enc, scm, target_id)
    except:
        return False

def _is_valid_token(token_enc, target_scm, target_id):
    token = bsb64.decode_string(token_enc, 0)
    fields = token.split(':')
    scm = fields[0]
    id = fields[1]
    key = fields[2]
    issued_time = int(fields[3])
    dflt_scm = get_default_scm_id()

    if scm != target_scm:
        if not scm == '' and target_scm == dflt_scm:
            return False

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
def cmd_export():
    arg1 = util.get_arg(2)
    arg2 = util.get_arg(3)
    arg3 = util.get_arg(4)

    scm = arg1
    dest_path = arg2
    decrypt = False
    if arg3 == '-decrypt':
        decrypt = True

    if dest_path == '' or dest_path.startswith('-'):
        print('Dest file path is required. (e.g., /tmp/data.zip)')
        print('Usage: python kb.py export <SCM> <DEST_FILE_PATH> [-decrypt]')
        return

    if scm == '-all':
        data_bytes = export_all_data(scm, decrypt)
    else:
        data_bytes = export_data(scm, decrypt)

    util.write_binary_file(dest_path, data_bytes)

#------------------------------------------------------------------------------
def cmd_encrypt():
    arg1 = util.get_arg(2)
    arg2 = util.get_arg(3)

    scm = arg1
    key = arg2
    print('scm=' + scm)
    print('key=' + key)

    if util.get_args_len() < 3:
        print('Usage: python kb.py cmd_encrypt <SCM> <KEY>')
        return

    # Decrypt
    target_path = get_data_dir_path(scm)
    decrypt_data(scm, target_path)
    encrypt_data(scm, target_path, key)

#------------------------------------------------------------------------------
def main():
    cmd = util.get_arg(1)
    func_name = 'cmd_' + cmd
    g = globals()
    if func_name in g:
        g[func_name]()
    else:
        print('Usage: python kb.py <COMMAND> [<ARG>]')

if __name__ == '__main__':
    main()
