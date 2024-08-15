#==============================================================================
# Logger
# Copyright (c) 2023 Takashi Harano
#==============================================================================
import os
import sys

import appconfig
ROOT_PATH = appconfig.root_path

sys.path.append(os.path.join(os.path.dirname(__file__), ROOT_PATH + 'libs'))
import util

util.append_system_path(__file__, ROOT_PATH + 'websys')
import websys

LOG_FILE_PATH = appconfig.workspace_path + 'kb.log'
LOCK_FILE_PATH = appconfig.workspace_path + 'lock'

#----------------------------------------------------------
# Read log
def get_log():
    return util.read_text_file_as_list(LOG_FILE_PATH)

#----------------------------------------------------------
# Write Log
def write_log(data):
    if synchronize_start():
        util.append_line_to_text_file(LOG_FILE_PATH, data, max=1000)
        synchronize_end()

#----------------------------------------------------------
def write_app_log(user, op_type, scm, dataid, info=''):
    now = util.get_timestamp()
    date_time = util.get_datetime_str(now, fmt='%Y-%m-%dT%H:%M:%S.%f')

    if scm is None:
        scm = ''
    elif scm == '0':
        scm = 'main'

    if dataid is None:
        dataid = ''

    data = date_time
    data += '\t'
    data += user
    data += '\t'
    data += op_type
    data += '\t'
    data += scm
    data += '\t'
    data += dataid
    data += '\t'
    data += info
    write_log(data)

#----------------------------------------------------------
def write_operation_log(context, op_type, scm, dataid=None, info='', data=None):
    p_reload = websys.get_request_param('reload')
    if p_reload == '1':
        return

    user = context.get_user_fullname()

    if data is not None:
        if 'status' in data and data['status'] != 'OK':
            info = append_info(info, data['status'])

        if 'content' in data:
            content = data['content']
            if content is not None:
                if 'PASSWORD' in content and content['PASSWORD'] != '':
                    info = append_info(info, '[PW]')

                if 'TITLE' in content:
                    info = append_info(info, 'Title:' +  content['TITLE'])

    write_app_log(user, op_type, scm, dataid, info)

#----------------------------------------------------------
def write_save_log(context, scm, dataid, new_data, saved_obj):
    user = context.get_user_fullname()

    op_type = 'SAVE_DATA'
    info = ''
    if new_data['only_labels']:
        op_type = 'MOD_LABELS'
    else:
        if dataid == '':
            op_type += ':NEW'

        if new_data['silent'] == '1':
            op_type += ':SILENT'

    saved_id = saved_obj['id']
    saved_data = saved_obj['data']

    if 'content' in saved_data:
        content = saved_data['content']

        if 'PASSWORD' in content and content['PASSWORD'] != '':
            info = append_info(info, '[PW]')

        if 'TITLE' in content:
            info = append_info(info, 'Title:' +  content['TITLE'])

    write_app_log(user, op_type, scm, saved_id, info)

def append_info(info, s):
    if info != '':
        info += ' '
    info += s
    return info

#----------------------------------------------------------
def synchronize_start():
    if util.file_lock(LOCK_FILE_PATH, 15, 0.2):
        return True
    return False

def synchronize_end():
    util.file_unlock(LOCK_FILE_PATH)
