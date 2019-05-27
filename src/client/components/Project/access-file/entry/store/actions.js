/**
 * 文件接入Action
 */

import { AccessFileExtName } from '../../../constants'

export default {
  /**
   * 接入文件
   * @param {File} file
   * @return {Object}
   */
  setFile(file){
    const arr = /\.(.+)$/.exec(file.name)
    const extname = (arr ? arr[1] : '').toLowerCase()

    if (!extname) {
      // TODO 文件类型错误
    }

    switch (extname) {
      // TODO 将所有的reader拆成统一返回结果函数，本函数内分别调用并处理结果
      case AccessFileExtName.Csv:
        return {
          file,
          type: AccessFileExtName.Csv
        }
      default:
        // TODO 不支持的文件类型
        return {}
    }
  }
}
