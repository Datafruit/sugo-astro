/**
 * Created by heganjie on 2017/4/20.
 */


let r = /ie\s+v(\d+)/i
function getInternetExplorerVersion() {
  // document.body.className example: "ie v11.0 os-Windows 10 device-Other obsolete not-ok-browser 11.0.0"
  let m = document.body.className.match(r)
  return m ? +m[1] : -1
}

export const IE_VERSION = getInternetExplorerVersion()


