/**
 * 通用功能的装饰器
 * @param {Class} Component
 */
import { message } from 'antd'

export default function (Component) {

  Component.prototype.beforeUpload = function(file) {
    let {csvUploadLimit} = window.sugo
    let m = Math.floor(csvUploadLimit / 1024 / 1024)
    if (file.size > csvUploadLimit) {
      message.info(`csv文件最大不可超过${m}M`, 10)
      return false
    }
    this.store.setFile(file)
    return false
  }

}
