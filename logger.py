#==============================================================================
# Logger
# Copyright (c) 2023 Takashi Harano
#==============================================================================
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import websysconf

sys.path.append(websysconf.UTIL_PATH)
import util
import web
import appconfig

LOG_FILE_PATH = appconfig.workspace_path + 'kb.log'

#----------------------------------------------------------
# Read log
def get_log():
    return util.read_text_file_as_list(LOG_FILE_PATH)

#----------------------------------------------------------
# Write Log
def write_log(data):
    util.append_line_to_text_file(LOG_FILE_PATH, data, max=1000)

#----------------------------------------------------------
def write_app_log(uid, op_type, scm, dataid, info=''):
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
    data += uid
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
    user_info = context.get_user_info()
    uid = user_info['uid']

    if data is not None:
        if 'content' in data:
            content = data['content']
            if 'TITLE' in content:
                if info != '':
                    info += ' '
                info += 'Title:' +  content['TITLE']

    write_app_log(uid, op_type, scm, dataid, info)

#----------------------------------------------------------
def write_save_log(context, scm, dataid, new_data, saved_obj):
    user_info = context.get_user_info()
    uid = user_info['uid']

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
        if 'TITLE' in content:
            if info != '':
                info += ' '
            info += 'Title:' +  content['TITLE']

    write_app_log(uid, op_type, scm, saved_id, info)
