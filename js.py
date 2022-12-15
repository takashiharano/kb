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

util.append_system_path(__file__, ROOT_PATH)
util.append_system_path(__file__, ROOT_PATH + 'websys/bin')
import web

#------------------------------------------------------------------------------
def build_js(context):
    js = ''
    js += 'var kb = kb || {};\n'
    js += 'kb.config = {\n'
    js += '  default_data_encryption: '
    js += 'true' if appconfig.default_data_encryption else 'false'
    js += ',\n'
    js += '  list_max: ' + str(appconfig.list_max) + '\n';
    js += '};\n'

    js += 'kb.configInfo = {\n'
    js += '  stateList: [\n';
    for i in range(len(appconfig.state_list)):
        obj = appconfig.state_list[i]
        if i > 0:
            js += ','
        js += '{'
        js += '  name: \'' + obj['name'] + '\', '
        js += '  fgcolor: \'' + obj['fgcolor'] + '\', '
        js += '  bgcolor: \'' + obj['bgcolor'] + '\', '
        js += '}'

    js += '],\n'

    js += 'tokenKeys: [\n'
    for i in range(len(appconfig.token_keys)):
        key = appconfig.token_keys[i]
        if i > 0:
            js += ','
        js += '\'' + key + '\''

    js += ']\n'
    js += '};\n'

    js += 'websys.init(\'' + ROOT_PATH + '\');'
    return js

#------------------------------------------------------------------------------
def main():
    context = web.on_access()
    js = build_js(context)
    util.send_response('text/javascript', js)

