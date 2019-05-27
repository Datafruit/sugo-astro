import { namespace } from '../../../constants'

function creator (mark) {
  return `${namespace.access}-${mark}`
}

export default {
  setFile: creator('set-file'),
  queryDataAnalysis: creator('query-data-analysis'),
  change: creator('change')
}
