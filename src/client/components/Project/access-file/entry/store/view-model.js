/**
 * Created by asd on 17-7-7.
 */

import Action from './action'
import Actions from './actions'

/**
 * @typedef {Object} ProjectFileAccessorViewModel
 * @property {?File} file - 需要上传的文件
 * @property {Number} type - 上传文件类型
 * @property {Array<DataAnalysisModel>} analysisTables - 分析表列表
 * @property {DataAnalysisModel|null} analysis - 分析表
 */

/** @type {ProjectFileAccessorViewModel} */
const Def = {
  file: null,
  type: -1,
  analysisTables: [],
  analysis: null
}

/**
 * @param {ProjectFileAccessorViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler (state, action, done) {
  switch (action.type) {
    // 选择文件
    case Action.setFile:
      return Actions.setFile(action.payload.file)
    
    case Action.change:
      return { ...action.payload }

    default:
      return state
  }
}

export default {
  name: 'ViewModel',
  scheduler,
  state: { ...Def }
}

export  {
  Action
}




