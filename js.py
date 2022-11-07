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
    js += 'kb.default_data_encryption = '
    js += 'true' if appconfig.default_data_encryption else 'false'
    js += ';\n'
    js += 'websys.init(\'' + ROOT_PATH + '\');'
    return js

#------------------------------------------------------------------------------
def main():
    context = web.on_access()
    js = build_js(context)
    util.send_response('text/javascript', js)

