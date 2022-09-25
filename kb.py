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

WORKSPACE_PATH = appconfig.workspace_path
DATA_DIR_PATH = WORKSPACE_PATH + 'data/'
WK_PATH = WORKSPACE_PATH + 'wk/'

ENCRYPTED_HEAD = '#DATA'
BSB64_N = 3

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
def send_list():
    data_id_list = get_data_id_list()
    data_list = []
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        try:
            data = load_data(id, True)

            if 'TITLE' in data:
                data['TITLE'] = util.encode_base64(data['TITLE'])

            if 'LABELS' in data:
                data['LABELS'] = util.encode_base64(data['LABELS'])
        except:
            data = {
                'id': id,
                'status': 'LOAD_ERROR'
            }

        data_list.append(data)

    list_data = {
        'data_list': data_list
    }
    return list_data

#------------------------------------------------------------------------------
def search_data(q):
    q = util.replace(q, '\\s{2,}', ' ')
    keywords = q.split(' ')

    data_id_list = get_data_id_list()
    data_list = []
    for i in range(len(data_id_list)):
        id = data_id_list[i]
        score = 0

        score += count_matched_key(id, keywords)
        if is_matched_key(id, keywords):
            score += 100

        try:
            data = load_data(id)
        except:
            continue

        if match_for_id(data, keywords):
            score += 100

        if 'TITLE' in data:
            title = data['TITLE']
            if exists_in_keywords(title, keywords):
                score += 1

        if 'LABELS' in data:
            labels = data['LABELS']
            score += count_matched_labels(labels, keywords)

        body = data['BODY']
        score += count_matched_body(body, keywords)

        if score > 0:
            del data['BODY']
            data['TITLE'] = util.encode_base64(data['TITLE'])
            data['LABELS'] = util.encode_base64(data['LABELS'])
            data['score'] = score
            data_list.append(data)

    list_data = {
        'data_list': data_list
    }
    return list_data

def count_matched_labels(labels, keywords):
    if labels == '':
        return 0
    count = 0
    label_list = labels.split(' ')
    for i in range(len(label_list)):
        label = label_list[i]
        for j in range(len(keywords)):
            keyword = keywords[j]
            keyword = util.replace(keyword, 'label:', '')
            if label == keyword:
                count += 1
    return count

def is_matched_key(target, keywords):
    if target == '':
        return False

    for i in range(len(keywords)):
        keyword = keywords[i]
        keyword = util.replace(keyword, 'id:', '')
        if keyword.startswith('label:') or keyword.startswith('body:'):
            continue
        if target == keyword:
            return True
    return False

def count_matched_key(target, keywords):
    if target == '':
        return 0
    count = 0
    for i in range(len(keywords)):
        keyword = keywords[i]
        if keyword.startswith('id:') or keyword.startswith('label:') or keyword.startswith('body:'):
            continue
        count += target.count(keyword)
    return count

def count_matched_body(target, keywords, and_search=True):
    if target == '':
        return 0
    count = 0
    for i in range(len(keywords)):
        keyword = keywords[i]
        keyword = util.replace(keyword, 'body:', '')
        keyword = keyword.lower()
        if keyword.startswith('id:') or keyword.startswith('label:'):
            continue
        target = target.lower()
        cnt = target.count(keyword)
        if and_search and cnt == 0:
            return 0
        count += cnt
    return count

def match_for_id(data, keywords):
    id = data['id']
    for i in range(len(keywords)):
        keyword = keywords[i]
        if keyword.startswith('id:'):
            keyword = util.replace(keyword, 'id:', '')
            if keyword == id:
                return True
    return False

def exists_in_keywords(data, keywords):
    for i in range(len(keywords)):
        keyword = keywords[i]
        if not keyword.startswith('id:') and not keyword.startswith('label:'):
            if util.match(data, keyword):
                return True
    return False

#------------------------------------------------------------------------------
def get_data(id):
    try:
        data = load_data(id)
    except Exception as e:
        data = {
            'status': str(e)
        }
        return data

    if 'TITLE' in data:
        data['TITLE'] = util.encode_base64(data['TITLE'])

    if 'LABELS' in data:
        data['LABELS'] = util.encode_base64(data['LABELS'])

    if 'BODY' in data:
        data['BODY'] = util.encode_base64(data['BODY'])

    return data

def load_data(id, head_only=False):
    data = {
        'id': id,
        'status': 'OK',
        'encrypted': 'false'
    }

    text_path = get_datafile_path(id)
    if not util.path_exists(text_path):
        raise Exception('DATA_NOT_FOUND')

    text = util.read_file(text_path, 't')

    if text.startswith(ENCRYPTED_HEAD):
        text = bsb64.decode_string(text[len(ENCRYPTED_HEAD):], BSB64_N)
        data['encrypted'] = 'true'

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
def save_data(id, new_data, user='', secure=False):
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
    if not 'TITLE' in data:
        data['TITLE'] = ''
    if not 'LABELS' in data:
        data['LABELS'] = ''

    data['U_DATE'] = str(now)
    data['U_USER'] = user
    data['TITLE'] = util.decode_base64(new_data['TITLE'])
    data['LABELS'] = util.decode_base64(new_data['LABELS'])
    data['BODY'] = util.decode_base64(new_data['BODY'])

    write_data(id, data, user, secure)
    return id

#------------------------------------------------------------------------------
def write_data(id, data, user='', secure=False, path=None):
    text = ''
    text += 'TITLE: ' + data['TITLE'] + '\n'
    text += 'LABELS: ' + data['LABELS'] + '\n'
    text += 'C_DATE: ' + data['C_DATE'] + '\n'
    text += 'C_USER: ' + data['C_USER'] + '\n'
    text += 'U_DATE: ' + data['U_DATE'] + '\n'
    text += 'U_USER: ' + data['U_USER'] + '\n'
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
        data = load_data(id)
        dst_path = dst_base_dir + id + '.txt'
        write_data(id, data, secure=secure, path=dst_path)

#if __name__ == '__main__':
#    decrypt_data(WK_PATH + 'data/')
