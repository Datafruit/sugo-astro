
/**
 * 下载原始数据分页条数/批量下载原始数据选择条数
 * @export [100, 500, 1000,...]
 * @param {String} [key='downloadLimit'] - 查看原始数据源限制
 * @return {Array<Number>}
 */
export function getDownloadLimit(key) {
  let res, defaultVal = [100, 500, 1000]
  try {
    res = window.sugo[key || 'downloadLimit'].split(/\s*\,\s*/g).map(v => Number(v)) || defaultVal
  } catch (e) {
    res = defaultVal
  }
  return res
}
