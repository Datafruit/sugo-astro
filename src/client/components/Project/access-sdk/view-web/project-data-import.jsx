import { PureComponent } from 'react'
import { Modal, Button, Form, Upload, Icon, notification } from 'antd'
import setStatePromise from 'client/common/set-state-promise'
import {AccessDataOriginalTypeArr} from '../../../../../common/constants'
import _ from 'lodash'

/**
* @description 项目数据导入
* @export
* @class DataImport
* @extends {PureComponent}
*/
@Form.create()
@setStatePromise
export default class ProjectDataImport extends PureComponent {
  
  handleSubmit = async () => {
    const { store, state } = this.props
    store.setIsImporting(true)
    store.startImporting({
      app_version: store.state.vm.uploadVersion,
      appid: store.state.DataAnalysis.id,
      filename: store.state.vm.uploadedFile.filename,
      datasourceName: state.Project.datasource_name
    })
  }

  onChangeFile = (info) => {
    const { store } = this.props
    // if (status !== 'uploading') {
    // }
    if (!info.file.response) return
    if (info.file.response.success) {
      store.setUploadedFilename({
        isUploaded: true,
        filename: info.file.name
      })
      notification.success({
        message: '提示',
        description: `${info.file.response.result}`
      })
    } else {
      notification.error({
        message: '提示',
        description: `${info.file.response.message}`
      })
    }
  }

  beforeUpload = (file) => {
    const { store } = this.props
    if (!/(\.json)$/.test(file.name)) {
       notification.error({
        message: '提示',
        description: '仅支持上传.json结尾的文件'
      })
      return false
    }
    let reg = new RegExp('_' + AccessDataOriginalTypeArr[store.state.DataAnalysis.access_type])
    if (!reg.test(file.name)) {
      notification.error({
        message: '提示',
        description: '非法app类型文件'
      })
      return false
    }
  }

  render() {
    let { visible, saveing = false, store, state } = this.props
    const { uploadedFile, isImporting } = state.vm
    const { isUploaded } = uploadedFile
    const draggerProps = {
      name: 'file',
      showUploadList: false,
      action: '/app/sdk/sdk-upload-importfile',
      onChange: this.onChangeFile,
      data:{ 
        app_version: store.state.vm.uploadVersion,
        appid: store.state.DataAnalysis.id
      },
      beforeUpload: this.beforeUpload
    }
    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon="close-circle-o"
          className="mg1r iblock"
          onClick={() => store.setCreateAppVersionModal(false)}
        >取消</Button>
        <Button
          type="success"
          disabled={!isUploaded || isImporting}
          loading={saveing}
          className="mg1r iblock"
          onClick={this.handleSubmit}
        >{!isUploaded ? '未上传文件' : (isImporting ? '正在导入' : '开始导入')}</Button>
      </div>
    )
    return (
      <Modal
        title="项目数据导入"
        visible={visible === 'projectDataImport'}
        onOk={this.handleSubmit}
        onCancel={() => store.setCreateAppVersionModal(false)}
        destroyOnClose
        width={700}
        footer={footer}
      >
        {
          isUploaded
          ?
          <p className='color-green mg2r'><span>已上传导入文件:</span>{uploadedFile.filename}</p>
          :
          null
        }
          <Form>
          <Form.Item {...formItemLayout} label="文件上传">
            <p className="mg2b">
              <Icon type="exclamation-circle-o" className="mg1r" />
              <b className="color-green mg2r">请上传项目数据文件(*.json).</b>
            </p>
            <Upload.Dragger {...draggerProps}>
              <p className="ant-upload-drag-icon pd3t">
                <Icon type="inbox" />
              </p>
              <p className="ant-upload-text pd3b pd2t">{isUploaded ? '重新上传请' : null}点击或者拖拽文件到这个区域上传</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}
