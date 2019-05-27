import Papa from 'papaparse'

/**
 * 从 url 加载 csv，支持分页
 * 返回的数组中，带有 columns 属性，记录了表头的数据
 * @example loadLinesOfCSVFromURL(url, {skip: 1000, limit: 100})
 * @param url
 * @param option skip: 跳过多少行数据，limit: 读取多少行数据
 * @returns {Promise}
 */
export function loadLinesOfCSVFromURL(url, option) {
  let {skip = 0, limit = 100} = option || {}
  return new Promise((resolve, reject) => {
    let skipped = 0
    let header = null
    let cache = []
    Papa.parse(url, {
      download: true,
      preview: 1 + skip + limit,
      step: function(row) {
        if (!header) {
          header = row.data[0]
        } else if (skipped < skip) {
          skipped += 1
        } else {
          cache.push(row.data[0])
          if (cache.length === limit) {
            cache.columns = header
            resolve(cache)
          }
        }
      },
      complete: function() {
        cache.columns = header
        resolve(cache)
      },
      error: err => reject(err)
    })
  })
}
