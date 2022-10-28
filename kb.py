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

WORKSPACE_PATH = appconfig.workspace_path
DATA_DIR_PATH = WORKSPACE_PATH + 'data/'
WK_PATH = WORKSPACE_PATH + 'wk/'

ENCRYPTED_HEAD = '#DATA'
BSB64_N = appconfig.encryption_key

def get_datafile_path(id):
    return DATA_DIR_PATH + id + '.txt'

#------------------------------------------------------------------------------
def get_data_id_list():
    files = util.list_files(DATA_DIR_PATH, '.txt')
    data_id_list = []
    for i in range(len(files)):
        filename = files[i]
        id = util.replace(filename, '.txt', '')
        data_id_list.append(id)
    return data_id_list

#------------------------------------------------------------------------------
def get_list(target_id=None):
    data_id_list = get_data_id_list()
    data_list = []
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        if target_id is not None and target_id != id:
            continue
        try:
            data = load_data(id, True)

            if 'TITLE' in data:
                data['TITLE'] = util.encode_base64(data['TITLE'])

            if 'LABELS' in data:
                data['LABELS'] = util.encode_base64(data['LABELS'])
        except:
            data = {
                'id': id,
                'data_status': 'LOAD_ERROR'
            }

        data_list.append(data)

    return data_list

#------------------------------------------------------------------------------
def search_data(q):
    q = util.replace(q, '\\s{2,}', ' ')
    q = util.replace(q, '\u3000', ' ')
    keywords = q.split(' ')

    id_list = get_data_id_list()

    wk_data_list = []
    for i in range(len(id_list)):
        id = id_list[i]
        try:
            data = load_data(id)
            data['score'] = 0
            wk_data_list.append(data)
        except:
            continue

    for i in range(len(keywords)):
        keyword = keywords[i]

        macthed_data_list = []
        for j in range(len(wk_data_list)):
            data = wk_data_list[j]
            score = calc_data_macthed_score(data, keyword)
            if score > 0:
                data['score'] += score
                macthed_data_list.append(data)

        wk_data_list = macthed_data_list

    data_list = []
    for i in range(len(wk_data_list)):
        data = wk_data_list[i]
        del data['BODY']
        data['TITLE'] = util.encode_base64(data['TITLE'])
        data['LABELS'] = util.encode_base64(data['LABELS'])
        data_list.append(data)

    data_list_obj = {'data_list': data_list}

    return data_list_obj

def calc_data_macthed_score(data, keyword):
    score = 0

    keyword_lc = keyword.lower()
    if keyword_lc.startswith('title:'):
        keyword = util.replace(keyword, 'title:', '', flags=re.IGNORECASE)
        score = is_matches_title(data['TITLE'], keyword)

    elif keyword_lc.startswith('label:'):
        keyword = util.replace(keyword, 'label:', '', flags=re.IGNORECASE)
        if is_matches_labels(data['LABELS'], keyword):
            score = 10

    elif keyword_lc.startswith('status:'):
        keyword = util.replace(keyword, 'status:', '', flags=re.IGNORECASE)
        if 'STATUS' in data and data['STATUS'] == keyword:
            score = 10

    elif keyword_lc.startswith('body:'):
        keyword = util.replace(keyword, 'body:', '', flags=re.IGNORECASE)
        score = count_matched_key(data['BODY'], keyword)

    elif keyword_lc.startswith('createdat:'):
        keyword = util.replace(keyword, 'createdat:', '', flags=re.IGNORECASE)
        if is_date_matches(data['C_DATE'], keyword):
            score = 10

    elif keyword_lc.startswith('updatedat:'):
        keyword = util.replace(keyword, 'updatedat:', '', flags=re.IGNORECASE)
        if is_date_matches(data['U_DATE'], keyword):
            score = 10

    elif keyword_lc.startswith('createdby:'):
        keyword = util.replace(keyword, 'createdby:', '', flags=re.IGNORECASE)
        score = is_target_matches(data['C_USER'], keyword)

    elif keyword_lc.startswith('updatedby:'):
        keyword = util.replace(keyword, 'updatedby:', '', flags=re.IGNORECASE)
        score = is_target_matches(data['U_USER'], keyword)

    else:
        score += count_matched_key(data['TITLE'], keyword) * 100
        score += count_matched_key(data['LABELS'], keyword) * 10
        score += count_matched_key(data['BODY'], keyword)

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
        return False

    millis = util.get_timestamp_in_millis(str_datetime)

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
    elif search_val.startswith('='):
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
        score += 100
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
def get_data(id):
    try:
        data = load_data(id)
    except Exception as e:
        data = {
            'data_status': str(e)
        }
        return data

    if 'TITLE' in data:
        data['TITLE'] = util.encode_base64(data['TITLE'])

    if 'LABELS' in data:
        data['LABELS'] = util.encode_base64(data['LABELS'])

    if 'BODY' in data:
        data['BODY'] = util.encode_base64(data['BODY'])

    return data

def load_data_as_text(id):
    text_path = get_datafile_path(id)
    if not util.path_exists(text_path):
        raise Exception('DATA_NOT_FOUND')
    text = util.read_text_file(text_path)
    return text

def load_data(id, head_only=False):
    data = {
        'id': id,
        'data_status': 'OK',
        'encrypted': False
    }

    text = load_data_as_text(id)

    if text.startswith(ENCRYPTED_HEAD):
        text = bsb64.decode_string(text[len(ENCRYPTED_HEAD):], BSB64_N)
        data['encrypted'] = True

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
        data[field_name] = fielf_value

    if head_only:
      return data

    body = ''
    for i in range(idx, len(lines)):
        body += lines[i] + '\n'

    data['BODY'] = body
    return data

#------------------------------------------------------------------------------
def save_data(id, new_data, user=''):
    if id == '':
        next_id = get_max_id() + 1
        id = str(next_id)

    now = util.get_timestamp_in_millis()

    try:
        data = load_data(id, True)
    except:
        data = {
            'C_DATE': str(now),
            'C_USER': user
        }

    if not 'C_DATE' in data:
        data['C_DATE'] = ''
    if not 'C_USER' in data:
        data['C_USER'] = ''

    data['U_DATE'] = str(now)
    data['U_USER'] = user
    data['TITLE'] = util.decode_base64(new_data['TITLE'])
    data['LABELS'] = util.decode_base64(new_data['LABELS'])
    data['BODY'] = util.decode_base64(new_data['BODY'])
    data['STATUS'] = new_data['STATUS']
    secure = True if new_data['encryption'] == '1' else False

    write_data(id, data, user, secure)
    return id

#------------------------------------------------------------------------------
def write_data(id, data, user='', secure=False, path=None):
    text = ''
    text += 'TITLE: ' + data['TITLE'] + '\n'
    text += 'C_DATE: ' + data['C_DATE'] + '\n'
    text += 'C_USER: ' + data['C_USER'] + '\n'
    text += 'U_DATE: ' + data['U_DATE'] + '\n'
    text += 'U_USER: ' + data['U_USER'] + '\n'
    text += 'LABELS: ' + data['LABELS'] + '\n'
    text += 'STATUS: ' + data['STATUS'] + '\n'
    text += '\n'
    text += data['BODY']

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
    data_id_list = get_data_id_list()
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        try:
            n = int(id)
        except:
            continue

        if n > max_id:
            max_id = n
    return max_id

def export_data():
    wk_data_path = WK_PATH + 'data/'
    util.mkdir(wk_data_path)
    decrypt_data(wk_data_path)
    b = util.zip(None, wk_data_path)
    util.delete(WK_PATH, True)
    return b

def decrypt_data(dst_base_dir):
    encdec_data(dst_base_dir, False)

def encrypt_data(dst_base_dir):
    encdec_data(dst_base_dir, True)

def encdec_data(dst_base_dir, secure):
    data_id_list = get_data_id_list()
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        dst_path = dst_base_dir + id + '.txt'
        try:
            data = load_data(id)
            write_data(id, data, secure=secure, path=dst_path)
        except:
            text = load_data_as_text(id)
            util.write_text_file(dst_path, text)

#------------------------------------------------------------------------------
def cmd_export(dest_path):
    if (dest_path == ''):
        print('dest pathis required')
        return

    data_bytes = export_data()
    util.write_binary_file(dest_path, data_bytes)

#------------------------------------------------------------------------------
def main():
    cmd = util.get_arg(1)
    arg1 = util.get_arg(2)

    if cmd == 'export':
        cmd_export(arg1)
    else:
        print('Usage: python kb.py <COMMAND> [<ARG>]')

if __name__ == '__main__':
    main()
