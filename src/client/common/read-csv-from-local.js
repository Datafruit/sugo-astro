import { ReadCsvWithLines } from 'next-reader'

export function readLines(file, {lines}) {
  return new Promise((resolve, reject) => {
    const reader = new ReadCsvWithLines(file, lines)
    let cache = []
    let onRecord = ({lines, size}) => {
      cache = [...cache, ...lines]
    }
    let onError = reject
    let onComplete = () => resolve(cache.map(l => l.fields))
    reader.subscribe(onRecord, onError, onComplete)
    reader.read()
  })
}

import Papa from 'papaparse'
export function readLinesWithPapa(file, option) {
  let {skip = 0, limit = 100} = option || {}
  return new Promise((resolve, reject) => {
    let skipped = 0
    let header = null
    let cache = []
    Papa.parse(file, {
      preview: 1 + skip + limit,
      step: function(row) {
        if (!header) {
          header = row.data[0]
        } else if (skipped < skip) {
          skipped += 1
        } else {
          cache.push(row.data[0])
          if (cache.length === limit) {
            resolve([header, ...cache])
          }
        }
      },
      complete: function() {
        resolve([header, ...cache])
      },
      error: err => reject(err)
    })
  })
}
