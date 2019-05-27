/**
 * Created by asd on 17-7-8.
 */

import { namespace } from '../../../constants'

function creator (mark) {
  return `${namespace.access}-file-csv-${mark}`
}

export default {
  queryDimensions: creator('query-dimensions'),
  selectDimensions: creator('select-dimensions'),
  parseFile: creator('parse-file'),
  postDimensions: creator('post-dimensions'),
  postData: creator('post-data'),
  setParserConfig: creator('set-parser-config'),
  setDimensionType: creator('set-dimension-type'),
  timeRange: creator('time-range'),
  change: creator('change')
}

