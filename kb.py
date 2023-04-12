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
DATA_DIR_PATH = WORKSPACE_PATH + 'data/'
WK_PATH = WORKSPACE_PATH + 'wk/'

ENCRYPTED_HEAD = '#DATA'
BSB64_N = appconfig.encryption_key

DEFAULT_CONTENT = {
    'TITLE': '',
    'C_DATE': '',
    'C_USER': '',
    'U_DATE': '',
    'U_USER': '',
    'LABELS': '',
    'STATUS': '',
    'FLAGS': '',
    'DATA_TYPE': '',
    'DATA_PRIVS': ''
}

#------------------------------------------------------------------------------
def get_workspace_path():
    return WORKSPACE_PATH

def get_datafile_path(id):
    return DATA_DIR_PATH + id + '.txt'

#------------------------------------------------------------------------------
def get_all_data_id_list():
    files = util.list_files(DATA_DIR_PATH, '.txt')
    data_id_list = []
    for i in range(len(files)):
        filename = files[i]
        id = util.replace(filename, '.txt', '')
        data_id_list.append(id)
    return data_id_list

#------------------------------------------------------------------------------
def get_list(context, target_id=None, need_encode_b64=False):
    data_id_list = get_all_data_id_list()
    data_list = []
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        if target_id is not None and target_id != id or target_id is None and should_omit_listing(context, id):
            continue
        try:
            data = load_data(id, True)
            content = data['content']
            if not has_data_privilege(context, content):
                continue

            if need_encode_b64:
                if 'TITLE' in content:
                    content['TITLE'] = util.encode_base64(content['TITLE'])

                if 'LABELS' in content:
                    content['LABELS'] = util.encode_base64(content['LABELS'])
        except:
            data = {
                'id': id,
                'status': 'LOAD_ERROR',
                'content': DEFAULT_CONTENT.copy()
            }

        if target_id is None and should_omit_listing(context, id, content):
            continue

        data_list.append(data)

    total_count = len(data_list)
    if appconfig.list_max > 0 and total_count > appconfig.list_max:
        data_list2 = sorted(data_list, key=lambda x: x['content']['U_DATE'], reverse=True)
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

def should_omit_listing(context, id, content=None):
    if is_special_id(id):
        return True
    if content is not None:
        if not has_data_privilege(context, content):
            return True
        if 'FLAGS' in content and has_flag(content['FLAGS'], 'HIDDEN'):
            return True
    return False

def is_special_id(id):
    if util.match(id, '^[^0-9]'):
        return True
    return False

def has_flag(flags_text, target_flag):
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
def search_data(context, q, need_encode_b64=False):
    q = util.to_half_width(q)
    q = util.replace(q, '\\s{2,}', ' ')
    q = util.replace(q, '\u3000', ' ')
    keywords = q.split(' ')

    id_list = get_all_data_id_list()
    filtered = filter_by_id(id_list, keywords)
    id_filtering = False
    if len(filtered['id_list']) > 0:
        id_filtering = True
        id_list = filtered['id_list']
        keywords = filtered['keywords']

    all_data = []
    for i in range(len(id_list)):
        id = id_list[i]
        if should_omit_listing(context, id):
            continue
        try:
            data = load_data(id)
            content = data['content']
            if should_omit_listing(context, id, content):
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
            content = data['content']
            score = calc_data_macthed_score(content, keyword)
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

        if need_encode_b64:
            content['TITLE'] = util.encode_base64(content['TITLE'])
            content['LABELS'] = util.encode_base64(content['LABELS'])

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

def calc_data_macthed_score(content, keyword):
    score = 0

    keyword_lc = keyword.lower()
    if keyword_lc.startswith('title:'):
        keyword = util.replace(keyword, 'title:', '', flags=re.IGNORECASE)
        score = is_matches_title(content['TITLE'], keyword)

    elif keyword_lc.startswith('label:'):
        keyword = util.replace(keyword, 'label:', '', flags=re.IGNORECASE)
        if is_matches_labels(content['LABELS'], keyword):
            score = 10

    elif keyword_lc.startswith('status:'):
        keyword_lc = util.replace(keyword_lc, 'status:', '', flags=re.IGNORECASE)
        if 'STATUS' in content and content['STATUS']:
            status_lc = content['STATUS'].lower()
            if status_lc == keyword_lc:
                score = 10

    elif keyword_lc.startswith('body:'):
        keyword = util.replace(keyword, 'body:', '', flags=re.IGNORECASE)
        score = count_matched_key(content['BODY'], keyword)

    elif keyword_lc.startswith('createdat:'):
        keyword = util.replace(keyword, 'createdat:', '', flags=re.IGNORECASE)
        if is_date_matches(content['C_DATE'], keyword):
            score = 10

    elif keyword_lc.startswith('updatedat:'):
        keyword = util.replace(keyword, 'updatedat:', '', flags=re.IGNORECASE)
        if is_date_matches(content['U_DATE'], keyword):
            score = 10

    elif keyword_lc.startswith('createdby:'):
        keyword = util.replace(keyword, 'createdby:', '', flags=re.IGNORECASE)
        score = is_target_matches(content['C_USER'], keyword)

    elif keyword_lc.startswith('updatedby:'):
        keyword = util.replace(keyword, 'updatedby:', '', flags=re.IGNORECASE)
        score = is_target_matches(content['U_USER'], keyword)

    else:
        score += is_matches_title(content['TITLE'], keyword) * 2
        score += count_matched_key(content['TITLE'], keyword) * 300
        score += count_matched_key(content['LABELS'], keyword) * 100

        if not 'DATA_TYPE' in content or content['DATA_TYPE'] != 'dataurl':
            score += count_matched_key(content['BODY'], keyword)

    return score

def is_target_matches(target, keyword):
    if target == '':
        return 0
    score = 0
    target = target.lower()
    keyword = keyword.lower()
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

def is_matches_labels(labels, keyword):
    if labels == '':
        return False
    labels = labels.lower()
    keyword = keyword.lower()
    label_list = labels.split(' ')
    for i in range(len(label_list)):
        label = label_list[i]
        if label == keyword:
            return True
    return False

def count_matched_key(target, keyword):
    if target == '':
        return 0
    target = target.lower()
    keyword = keyword.lower()
    count = target.count(keyword)
    return count

#------------------------------------------------------------------------------
def get_data(context, id, need_encode_b64=False):
    try:
        data = load_data(id)
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
            'status': 'DATA_NOT_FOUND'
        }
        return data

    if need_encode_b64:
        if 'TITLE' in content:
            content['TITLE'] = util.encode_base64(content['TITLE'])

        if 'LABELS' in content:
            content['LABELS'] = util.encode_base64(content['LABELS'])

        if 'BODY' in content:
            content['BODY'] = util.encode_base64(content['BODY'])
        data['content'] = content

    return data

def load_data_as_text(id):
    text_path = get_datafile_path(id)
    if not util.path_exists(text_path):
        raise Exception('DATA_NOT_FOUND')
    text = util.read_text_file(text_path)
    return text

def get_datafile_info(id):
    path = get_datafile_path(id)
    if not util.path_exists(path):
        return None
    return util.get_file_info(path)

def load_data(id, head_only=False):
    fileinfo = get_datafile_info(id)
    text = load_data_as_text(id)

    data = {
        'id': id,
        'status': 'OK',
        'size': 0,
        'encrypted': False,
        'content': None
    }

    if fileinfo is not None:
        data['size'] = fileinfo['size']

    if text.startswith(ENCRYPTED_HEAD):
        text = bsb64.decode_string(text[len(ENCRYPTED_HEAD):], BSB64_N)
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

    if not head_only:
        body = ''
        for i in range(idx, len(lines)):
            body += lines[i] + '\n'
        content['BODY'] = body

    return content

#------------------------------------------------------------------------------
def save_data(id, new_data, user=''):
    if id == '':
        id = get_next_id()

    now = util.get_unixtime_millis()

    silent = True if new_data['silent'] == '1' else False
    new_content = new_data['content']

    try:
        data = load_data(id)
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

    labels = util.decode_base64(new_content['LABELS'])
    labels = to_set(labels)

    if new_data['only_labels']:
        content['LABELS'] = labels
        secure = data['encrypted']
    else:
        title = util.decode_base64(new_content['TITLE'])
        body = util.decode_base64(new_content['BODY'])
        isdataurl = is_dataurl(body)
        secure = True if new_data['encryption'] == '1' else False

        content['TITLE'] = title
        content['LABELS'] = labels
        content['STATUS'] = new_content['STATUS']
        content['DATA_TYPE'] = 'dataurl' if isdataurl else ''
        content['BODY'] = body

    if not silent:
        content['U_DATE'] = now
        content['U_USER'] = user

    data['content'] = content

    write_data(id, content, secure)

    saved_data = {
        'id': id,
        'data': data
    }
    return saved_data

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
def write_data(id, content, secure=False, path=None):
    text = ''

    for key in content:
        if key != 'BODY':
            value = str(content[key])
            text += key + ': ' + value + '\n'

    text += '\n'
    text += content['BODY']

    if secure:
        text = ENCRYPTED_HEAD + bsb64.encode_string(text, BSB64_N)

    if path is None:
        path = get_datafile_path(id)

    util.write_text_file(path, text)

def delete_data(id):
    if id == '':
        return 'ERR_ROOT_PATH'
    if util.match(id, '\.\.'):
        return 'ERR_PARENT_PATH'
    path = get_datafile_path(id)
    if not util.path_exists(path):
        return 'NOT_FOUND'
    util.delete(path)
    return 'OK'

def check_exists(id):
    if id == '':
        raise Exception('EMPTY_ID')
    path = get_datafile_path(id)
    if util.path_exists(path):
        return True
    else:
        return False

def get_max_id():
    max_id = 0
    data_id_list = get_all_data_id_list()
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        try:
            n = int(id)
        except:
            continue

        if n > max_id:
            max_id = n
    return max_id

def get_next_id():
    id = get_max_id() + 1
    return str(id)

def get_empty_ids():
    all_ids = get_all_data_id_list()
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
                if empty_cnt < 10:
                    empty_ids.append(str(j))
                    empty_cnt += 1
        prev_n = n

    return empty_ids

def change_data_id(id_fm, id_to):
    if not check_exists(id_fm):
        return 'SRC_NOT_FOUND'
    if check_exists(id_to):
        return 'DEST_ALREADY_EXISTS'
    path_fm = get_datafile_path(id_fm)
    path_to = get_datafile_path(id_to)
    ret = util.move(path_fm, path_to)
    if ret:
        return 'OK'
    return 'FAILED:NEED_TO_FILE_CHECK_ON_THE_SERVER'

def export_data(asis=False):
    wk_data_path = WK_PATH + 'data/'
    if asis:
        target_path = DATA_DIR_PATH
    else:
        util.mkdir(wk_data_path)
        decrypt_data(wk_data_path)
        target_path = wk_data_path

    b = util.zip(None, target_path)
    util.delete(WK_PATH, True)
    return b

def decrypt_data(dst_base_dir):
    encdec_data(dst_base_dir, False)

def encrypt_data(dst_base_dir):
    encdec_data(dst_base_dir, True)

def encdec_data(dst_base_dir, secure):
    data_id_list = get_all_data_id_list()
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        dst_path = dst_base_dir + id + '.txt'
        try:
            data = load_data(id)
            content = data['content']
            write_data(id, content, secure=secure, path=dst_path)
        except Exception as e:
            text = '!ERROR! ' + str(e) + '\n---\n'
            text += load_data_as_text(id)
            util.write_text_file(dst_path, text)

#------------------------------------------------------------------------------
def download_b64content(context, id, idx=None):
    if idx is None:
        idx = 0

    data = get_data(context, id)
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
def cmd_export():
    arg1 = util.get_arg(2)
    arg2 = util.get_arg(3)

    dest_path = arg1
    asis = False
    if arg2 == '-asis':
        asis = True

    if dest_path == '' or dest_path.startswith('-'):
        print('Dest file path is required. (e.g., /tmp/data.zip)')
        print('Usage: python kb.py export <DEST_FILE_PATH> [-asis]')
        return

    data_bytes = export_data(asis)
    util.write_binary_file(dest_path, data_bytes)

#------------------------------------------------------------------------------
def is_access_allowed(context):
    if appconfig.access_control != 'auth' or context['authorized']:
        return True
    return False

def has_privilege(context, target_priv):
    access_control = appconfig.access_control

    if access_control == 'auth':
        # target_priv = kb.xxx
        return web.has_privilege(context, target_priv)

    if util.has_item_value(access_control, 'auth', separator='|'):
        if web.has_privilege(context, target_priv):
            return True

    if access_control == 'full':
        return True

    if target_priv == 'kb':
        # public-mode
        return True

    target_priv = util.replace(target_priv, 'kb\.', '')
    return util.has_item_value(access_control, target_priv, separator='|')

def has_data_privilege(context, content):
    if web.is_admin(context):
        return True
    dataprivs = content['DATA_PRIVS'] if 'DATA_PRIVS' in content else ''
    dataprivs = dataprivs.lower()
    if dataprivs == '':
        return True
    privs = dataprivs.split(' ')
    for i in range(len(privs)):
        priv = privs[i]
        if priv.startswith('-'):
            priv = priv[1:]
            if web.has_privilege(context, priv):
                return False
        elif not web.has_privilege(context, priv):
            return False
    return True

def is_valid_token(token_enc, target_id):
    try:
        return _is_valid_token(token_enc, target_id)
    except:
        return False

def _is_valid_token(token_enc, target_id):
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
def main():
    cmd = util.get_arg(1)
    if cmd == 'export':
        cmd_export()
    else:
        print('Usage: python kb.py <COMMAND> [<ARG>]')

if __name__ == '__main__':
    main()
