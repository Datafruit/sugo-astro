import React from 'react'
import {Modal, Button, Upload, Icon, message} from 'antd'
import {withUploadedFiles} from '../Fetcher/uploaded-files-fetcher'
import DomSelector from '../Common/dom-selector'
import _ from 'lodash'
import Fetch, {handleErr} from '../../common/fetch-final'
import {UploadedFileType} from '../../../common/constants'

if (!window.sugo.file_server_token) {
  handleErr('无法使用上传图片功能：没有配置文件上传服务的 token')
}

class ImagePicker extends React.Component {
  state = {
    fileList: [],
    selectedImageId: null
  }

  componentWillMount() {
    this.setState({selectedImageId: this.props.value})
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props.files, nextProps.files)) {
      let fileList = nextProps.files.map(f => {
        return {
          uid: f.id,
          name: f.name,
          status: 'done',
          url: f.path
        }
      })
      this.setState({fileList, selectedImageId: null})
    }
    if (this.props.value !== nextProps.value && nextProps.visible) {
      this.setState({selectedImageId: nextProps.value})
    }
  }

  handleRemoveFile = (file) => {
    let { reloadFiles}  = this.props
    Modal.confirm({
      title: '提示',
      content: `确定删除图片 ${file.name} ？`,
      onOk: () => {
        Fetch.delete(`/app/uploaded-files/delete/${file.uid}`, null, {
          handleResponse: () => {
            message.success('文件删除成功')
            reloadFiles()
          },
          handleErr: (resp) => {
            message.error('文件删除失败: ' + resp.message)
          }
        })
      }
    })
    return false
  }

  handleChangeFile = ({file, fileList}) => {
    let { reloadFiles}  = this.props
    this.setState({fileList}, () => {
      if (file.status === 'done') {
        let { filename, originalFilename } = _.get(file, 'response.result') || {}
        if (!filename) {
          message.error('文件上传失败，请重试')
          return
        }
        let newFileRecord = {
          name: originalFilename,
          type: UploadedFileType.Image,
          path: `/f/${filename}`
        }
        Fetch.post('/app/uploaded-files/create', newFileRecord, {
          handleResponse: () => {
            message.success('文件上传成功')
            reloadFiles()
          },
          handleErr: (resp) => {
            message.error('文件上传失败: ' + resp.message)
          }
        })
      }
    })
  }

  render() {
    let {visible, onImageSelected, onVisibleChange, isFetchingFiles} = this.props
    let {selectedImageId, fileList} = this.state

    let modalFooter = [
      <Button
        key="back"
        type="ghost"
        size="large"
        onClick={() => onVisibleChange(false)}
      >取消</Button>,
      <Button
        key="submit"
        type="primary"
        size="large"
        loading={isFetchingFiles}
        onClick={() => {
          onImageSelected(selectedImageId)
          onVisibleChange(false)
        }}
      >确认</Button>
    ]

    return (
      <Modal
        title="图片选择框"
        visible={visible}
        footer={modalFooter}
        onCancel={() => onVisibleChange(false)}
        width="60%"
      >
        <DomSelector
          idIndexList={fileList.map(f => f.uid)}
          onSelect={fileId => this.setState({selectedImageId: fileId === selectedImageId ? null : fileId})}
          selectableDomSelector={'.ant-upload-list-picture-card .ant-upload-list-item'}
          currentSelectedId={selectedImageId}
          inactiveStyle={{border: '', cursor: 'pointer'}}
          activeStyle={{border: '2px solid #40a5ed'}}
        >
          <Upload
            action="/app/uploaded-files/upload"
            accept="image/png, image/jpeg, image/gif"
            listType="picture-card"
            headers={{
              'Access-Control-Allow-Origin': '*',
              token: window.sugo.file_server_token
            }}
            fileList={fileList}
            onRemove={this.handleRemoveFile}
            onChange={this.handleChangeFile}
          >
            <div>
              <Icon type="plus"/>
              <div className="ant-upload-text">上传</div>
            </div>
          </Upload>
        </DomSelector>
      </Modal>
    )
  }
}

let Wrapped = (() => {
  return withUploadedFiles(ImagePicker, props => ({doFetch: props.visible, type: UploadedFileType.Image}))
})()

export default Wrapped
