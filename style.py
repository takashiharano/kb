#==============================================================================
# Knowledge Base System - Style Sheet
# Copyright 2024 Takashi Harano
# Released under the MIT License
#==============================================================================
import appconfig

#------------------------------------------------------------------------------
def build_css():
    content_height_adj = appconfig.list_height + 32

    css = ''
    css += '#list-area {'
    css += '  height: ' + str(appconfig.list_height) + 'px;'
    css += '}'
    css += '#content-area {'
    css += '  height: calc(100vh - ' + str(content_height_adj) + 'px);'
    css += '}'

    return css
