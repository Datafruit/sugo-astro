/**
 * test case:
 // nginx
 $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"

 192.168.0.112 - - [21/Apr/2017:10:55:46 +0800] "GET / HTTP/1.1" 200 612 "-" "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36"

 // TOMCAT
 %h %l %u %t &quot;%r&quot; %s %b %T %A %a %H %p %S %U %v %D
 192.168.0.125 - - [25/Aug/2017:16:32:17 +0800] "GET /favicon.ico HTTP/1.1" 200 21630 0.001 69.172.201.153 192.168.0.125 HTTP/1.1 8080 - /favicon.ico 192.168.0.202 1

 // httpd
 %h %l %u %t "%r" %>s %b
 127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326

 %h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-agent}i"
 127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08 [en] (Win98; I ;Nav)"
 192.168.0.225 - - [30/Aug/2017:18:07:25 +0800] "GET /yum/SG/centos6/1.0/druid-1.0.0-bin.tar.gz HTTP/1.0" 200 161333748 "-" "Wget/1.12 (linux-gnu)"
 */

import _ from 'lodash'

const nginx = {
  '$connection': {
    'grokPattern': 'BASE16NUM',
    'type': 'int'
  },
  '$connection_requests': {
    'grokPattern': 'NUMBER',
    'type': 'int'
  },
  '$msec': {
    'grokPattern': 'BASE16FLOAT',
    'type': 'float'
  },
  '$pipe': 'NOTSPACE',
  '$request_length': {
    'grokPattern': 'BASE16NUM',
    'type': 'int'
  },
  '$request_time': {
    'grokPattern': 'BASE16FLOAT',
    'type': 'float'
  },
  '$status': 'NOTSPACE',
  '$time_iso8601': {
    'grokPattern': 'CUSTOM_TIMESTAMP_ISO8601',
    'type': 'date',
    'dateParsePattern': 'yyyy-MM-dd\'T\'HH:mm:ssXXX'
  },
  '$time_local': {
    'grokPattern': 'HTTPDATE',
    'type': 'date',
    'dateParsePattern': 'dd/MMM/yyyy:HH:mm:ss Z'
  },
  '$remote_addr': 'IPV4',
  '$remote_user': 'NOTSPACE',
  '$request': {
    'custom': '(?:%{WORD:request_method} %{URIPATH:request_url}(?:%{URIPARAM:request_param})?(?: HTTP/%{NUMBER:http_version})?|(-))'
  },
  '$body_bytes_sent': {
    'grokPattern': 'BASE16NUM',
    'type': 'int'
  },
  '$bytes_sent': {
    'grokPattern': 'BASE16NUM',
    'type': 'int'
  },
  '$http_referer': 'NOTSPACE',
  '$http_user_agent': 'GREEDYDATA',
  '$gzip_ratio': 'NOTSPACE',
  '$upstream_response_time': {
    'custom': '((%{BASE16FLOAT:upstream_response_time:float}[, ]{0,2})+|(-))'
  },
  '$upstream_addr': {
    'custom': '(%{UPSTREAM_ADDR:upstream_addr}|(-))'
  },
  '$http_accept_language': 'NOTSPACE',
  '$uri': 'URIPATH',
  '$request_filename': 'NOTSPACE',
  '$server_protocol': 'NOTSPACE',
  '$scheme': 'NOTSPACE',
  '$geoip_country_code': 'NOTSPACE',
  '$http_x_forwarded_for': 'NOTSPACE'
}

const tomcat = {
  '%a': {
    'grokPattern': 'IPV4',
    'fieldName': 'remote_ip_address',
    'type': 'string'
  },
  '%A': {
    'grokPattern': 'IPV4',
    'fieldName': 'local_ip_address',
    'type': 'string'
  },
  '%b': {
    'custom': '(%{BASE16NUM:bytes_sent_b:int}|(-))'
  },
  '%B': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'bytes_sent',
    'type': 'int'
  },
  '%h': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_host_name',
    'type': 'string'
  },
  '%H': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'request_protocol',
    'type': 'string'
  },
  '%l': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_logical_username',
    'type': 'string'
  },
  '%m': {
    'grokPattern': 'WORD',
    'fieldName': 'request_method',
    'type': 'string'
  },
  '%p': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'local_port',
    'type': 'string'
  },
  '%q': {
    'grokPattern': 'URIPARAM',
    'fieldName': 'query_string',
    'type': 'string'
  },
  '%r': {
    'custom': '(?:%{WORD:request_method} %{URIPATH:request_url}(?:%{URIPARAM:request_param})?(?: HTTP/%{NUMBER:http_version})?|(-))'
  },
  '%s': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'http_status_code',
    'type': 'string'
  },
  '%S': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'user_session_id',
    'type': 'string'
  },
  '%t': {
    'custom': '\\[%{HTTPDATE:log_time:date;dd/MMM/yyyy:HH:mm:ss Z}\\]'
  },
  '%u': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_user',
    'type': 'string'
  },
  '%U': {
    'grokPattern': 'URIPATH',
    'fieldName': 'requested_url_path',
    'type': 'string'
  },
  '%v': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'local_server_name',
    'type': 'string'
  },
  '%D': {
    'grokPattern': 'BASE16FLOAT',
    'fieldName': 'process_time_millis',
    'type': 'float'
  },
  '%T': {
    'grokPattern': 'BASE16FLOAT',
    'fieldName': 'process_time_seconds',
    'type': 'float'
  },
  '%F': {
    'grokPattern': 'BASE16FLOAT',
    'fieldName': 'commit_time',
    'type': 'float'
  },
  '%I': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'request_thread_name',
    'type': 'string'
  },
  '%X': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'connection_status',
    'type': 'string'
  }
}

const apacheHttpd = {
  '%%': {
    'custom': '%'
  },
  '%a': {
    'grokPattern': 'IPV4',
    'fieldName': 'remote_ip_address',
    'type': 'string'
  },
  '%A': {
    'grokPattern': 'IPV4',
    'fieldName': 'local_ip_address',
    'type': 'string'
  },
  '%B': {
    'grokPattern': 'BASE16NUM',
    'fieldName': 'body_bytes_sent',
    'type': 'int'
  },
  '%b': {
    'grokPattern': 'BASE16NUM',
    'fieldName': 'body_bytes_sent_b',
    'type': 'int'
  },
  '%D': {
    'grokPattern': 'BASE16FLOAT',
    'fieldName': 'serve_time',
    'type': 'float'
  },
  '%f': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'filename',
    'type': 'string'
  },
  '%h': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_host_name',
    'type': 'string'
  },
  '%H': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'request_protocol',
    'type': 'string'
  },
  '%k': {
    'grokPattern': 'BASE16NUM',
    'fieldName': 'keep_alive',
    'type': 'int'
  },
  '%l': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_log_name',
    'type': 'string'
  },
  '%L': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_log_id',
    'type': 'string'
  },
  '%m': {
    'grokPattern': 'WORD',
    'fieldName': 'request_method',
    'type': 'string'
  },
  '%p': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'canonical_port',
    'type': 'string'
  },
  '%P': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'process_id',
    'type': 'string'
  },
  '%q': {
    'grokPattern': 'URIPARAM',
    'fieldName': 'query_string',
    'type': 'string'
  },
  '%r': {
    'custom': '(?:%{WORD:request_method} %{URIPATH:request_url}(?:%{URIPARAM:request_param})?(?: HTTP/%{NUMBER:http_version})?|(-))'
  },
  '%R': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'handller',
    'type': 'string'
  },
  '%s': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'http_status_code',
    'type': 'string'
  },
  '%>s': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'http_status_code',
    'type': 'string'
  },
  '%t': {
    'custom': '\\[%{HTTPDATE:log_time:date;dd/MMM/yyyy:HH:mm:ss Z}\\]'
  },
  '%T': {
    'grokPattern': 'BASE16FLOAT',
    'fieldName': 'serve_time',
    'type': 'float'
  },
  '%u': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'remote_user',
    'type': 'string'
  },
  '%U': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'requested_url_path',
    'type': 'string'
  },
  '%v': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'canonical_server_name',
    'type': 'string'
  },
  '%V': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'server_name',
    'type': 'string'
  },
  '%X': {
    'grokPattern': 'NOTSPACE',
    'fieldName': 'connection_status',
    'type': 'string'
  },
  '%I': {
    'grokPattern': 'BASE16NUM',
    'fieldName': 'bytes_received',
    'type': 'int'
  },
  '%O': {
    'grokPattern': 'BASE16NUM',
    'fieldName': 'bytes_sent',
    'type': 'int'
  },
  '%S': {
    'grokPattern': 'BASE16NUM',
    'fieldName': 'bytes_transferred',
    'type': 'int'
  },
  '%i': 'GREEDYDATA',
  '%e': 'GREEDYDATA',
  '%C': 'GREEDYDATA'
}

let domParser = new DOMParser()
function htmlDecode(input) {
  let doc = domParser.parseFromString(input, 'text/html')
  return doc.documentElement.textContent
}

const escapeForRegex0 = str => str.replace(/[.?*+^[\]\\(){}|-]|\$$/g, '\\$&') // only tail $ will be escape

const LogTypeConfig = {
  nginx: {
    logVarRegex: /\$(\w+)/g,
    varToGrokPresetDict: nginx,
    preProcessor: escapeForRegex0
  },
  tomcat: {
    logVarRegex: /%(\w+)/g,
    varToGrokPresetDict: tomcat,
    preProcessor: _.flow(htmlDecode, escapeForRegex0)
  },
  apacheHttpd: {
    // http://httpd.apache.org/docs/current/mod/mod_log_config.html#formats
    logVarRegex: /%(!?(?:\d+,?)*)(?:{(.+?)})?(%|\^?>?\w+)/g, // g1: !200,304,302   g2: Referer   g3: i
    varToGrokPresetDict: apacheHttpd
  }
}

export function logPatternToGrokPattern(logType, logFormat) {
  let {preProcessor = _.identity, varToGrokPresetDict, logVarRegex} = LogTypeConfig[logType]
  let escaped = preProcessor(logFormat || '')
  return escaped.replace(logVarRegex, (m0, m1, m2, m3) => {
    let preset = (logType === 'apacheHttpd' ? varToGrokPresetDict[`%${m3}`] : varToGrokPresetDict[m0]) || 'NOTSPACE'
    let originFieldName = logType === 'apacheHttpd' ? (m2 || m3) : m1

    if (!_.isObject(preset)) {
      preset = {grokPattern: preset, fieldName: originFieldName}
    }
    let {grokPattern, type, dateParsePattern, custom, fieldName = originFieldName} = preset
    if (custom) {
      return custom
    }
    if (!grokPattern) {
      grokPattern = 'NOTSPACE'
    }
    fieldName = fieldName.replace(/[^\w]/g, '')
    if (dateParsePattern) {
      return `%{${grokPattern}:${fieldName}:${type};${dateParsePattern}}`
    }
    if (type) {
      return `%{${grokPattern}:${fieldName}:${type}}`
    }
    return fieldName ? `%{${grokPattern}:${fieldName}}` : `%{${grokPattern}}`
  })
}
