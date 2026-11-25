#==============================================================================
# Knowledge Base System
# Copyright 2022 Takashi Harano
# Released under the MIT License
#==============================================================================
import os
import sys

import appconfig

ROOT_PATH = appconfig.root_path

sys.path.append(appconfig.libs_path)
import util

util.append_system_path(__file__, ROOT_PATH + 'websys')
import websys

import kb

#------------------------------------------------------------------------------
def build_js(context, repo):
    content_height_adj = appconfig.list_height + 32
    categories = kb.load_categories(repo)

    js = ''
    js += 'var kb = kb || {};\n'

    js += 'kb.RESTRICTED_PROP_KEYS = ' + util.to_json(kb.RESTRICTED_PROP_KEYS) + ';'
    js += 'kb.categories = ' + util.to_json(categories) + ';'

    js += 'kb.defaultRepo = \'' + kb.get_default_repo_id() + '\';\n'
    js += 'kb.config = {\n'
    js += '  list_max: ' + str(appconfig.list_max) + ',\n';
    js += '  default_data_scramble: ' + ('true' if appconfig.default_data_scramble else 'false') + ',\n'
    js += '  default_scramble_key: \'' + kb.DEFAULT_SCRAMBLE_KEY + '\'\n'
    js += '};\n'

    js += 'kb.configInfo = {\n'
    js += '  user_name_lang: \'' + appconfig.user_name_lang + '\',\n'
    js += '  state_list: ' + util.to_json(appconfig.state_list) + '\n'

    js += '};\n'

    js += 'kb.isAdmin = ' + ('true' if context.is_admin() else 'false') + ';\n'
    js += 'kb.isSysAdmin = ' + ('true' if context.has_permission('sysadmin') else 'false') + ';\n'
    js += 'kb.contentHeightAdj = ' + str(content_height_adj) + ';\n';

    default_http_scramble = 'true' if appconfig.default_http_scramble else 'false'
    js += 'kb.defaultHttpScramble = ' + default_http_scramble + ';\n'

    js += 'websys.init(\'' + appconfig.app_id + '\', \'' + ROOT_PATH + '\');'
    return js

#------------------------------------------------------------------------------
def main(repo):
    context = websys.on_access()
    js = build_js(context, repo)
    util.send_response(js, 'text/javascript')
