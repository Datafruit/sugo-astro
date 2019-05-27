/**
 * Created by heganjie on 2017/4/7.
 * 解析 url，后端请使用 new URL(url)
 * http://stackoverflow.com/a/15979390/1745885
 */
import _ from 'lodash'


const parser = document.createElement('a')
const props = ['protocol', 'host', 'hostname', 'port', 'pathname', 'hash', 'search', 'origin']

export default function parseUrl(urlStr) {
  parser.href = urlStr
  let res = _.pick(parser, props)

  // 修正 IE11 的 pathname 没有开头的斜杠：app/project/xxx
  if (!res.pathname || res.pathname[0] !== '/') {
    return {...res, pathname: `/${res.pathname || ''}`}
  }
  return res
}
