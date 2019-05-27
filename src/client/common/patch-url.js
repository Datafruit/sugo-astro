/**
 * Created by heganjie on 2017/6/23.
 * 避免 browserHistory.push 覆盖掉原 url 的参数(?a=1&b=2...)，可以使用 patchPush 方法
 */
import parseUrl from './url-parser'
import {browserHistory} from 'react-router'
import {immutateUpdates} from '../../common/sugo-utils'

// TODO 支持 patch 参数
export function patchPush(partialUrl) {
  let urlObj = parseUrl(partialUrl)
  let nextLoc = immutateUpdates(browserHistory.getCurrentLocation(),
    'pathname', prevPathname => urlObj.pathname || prevPathname,
    'hash', prevHash => urlObj.hash || prevHash
  )
  browserHistory.push(nextLoc)
}

export function patchReplace(partialUrl) {
  let urlObj = parseUrl(partialUrl)
  let nextLoc = immutateUpdates(browserHistory.getCurrentLocation(),
    'pathname', prevPathname => urlObj.pathname || prevPathname,
    'hash', prevHash => urlObj.hash || prevHash
  )
  browserHistory.replace(nextLoc)
}
