#==============================================================================
# Knowledge Base System
# Copyright (c) 2022 Takashi Harano
#==============================================================================
import os
import sys

import appconfig

ROOT_PATH = appconfig.root_path

sys.path.append(os.path.join(os.path.dirname(__file__), ROOT_PATH + 'libs'))
import util
import bsb64

util.append_system_path(__file__, ROOT_PATH)
util.append_system_path(__file__, ROOT_PATH + 'websys/bin')
import web
import kb

#------------------------------------------------------------------------------
def build_js(context):
    content_height_adj = appconfig.list_height + 32
    default_encryption_key = bsb64.encode_string(kb.DEFAULT_ENCRYPTION_KEY, 1)

    js = ''
    js += 'var kb = kb || {};\n'

    js += 'kb.ALLOWED_PROPS_FOR_ALL = [\n'
    for i in range(len(kb.ALLOWED_PROPS_FOR_ALL)):
        if i > 0:
            js += ',\n'
        js += '\'' + kb.ALLOWED_PROPS_FOR_ALL[i] + '\''
    js += '\n];'

    js += 'kb.defaultScm = \'' + kb.get_default_scm_id() + '\';\n'
    js += 'kb.config = {\n'
    js += '  list_max: ' + str(appconfig.list_max) + ',\n';
    js += '  default_data_encryption: ' + ('true' if appconfig.default_data_encryption else 'false') + ',\n'
    js += '  default_encryption_key: \'' + default_encryption_key + '\'\n'
    js += '};\n'

    js += 'kb.bsb64 = {n: 1};\n'

    js += 'kb.configInfo = {\n'
    js += '  user_name_lang: \'' + appconfig.user_name_lang + '\',\n'
    js += '  state_list: [\n'
    for i in range(len(appconfig.state_list)):
        obj = appconfig.state_list[i]
        if i > 0:
            js += ','
        js += '{'
        for key in obj:
            js += '  ' + key + ': \'' + obj[key] + '\', '
        js += '}'

    js += '],\n'

    js += 'token_keys: [\n'
    for i in range(len(appconfig.token_keys)):
        key = appconfig.token_keys[i]
        if i > 0:
            js += ','
        js += '\'' + key + '\''

    js += '],\n'

    js += 'token_valid_sec: ' + str(appconfig.token_valid_sec) + ','

    js += '};\n'

    js += 'kb.isAdmin = ' + ('true' if context.is_admin() else 'false') + ';\n'
    js += 'kb.isSysAdmin = ' + ('true' if context.has_permission('sysadmin') else 'false') + ';\n'
    js += 'kb.contentHeightAdj = ' + str(content_height_adj) + ';\n';
    js += 'websys.init(\'' + ROOT_PATH + '\');'
    return js

#------------------------------------------------------------------------------
def main():
    context = web.on_access()
    js = build_js(context)
    util.send_response(js, 'text/javascript')

