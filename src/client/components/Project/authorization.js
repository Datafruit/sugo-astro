/**
 * Created on 08/02/2017.
 */

import _ from 'lodash'
import React, { PropTypes } from 'react'
import { Modal, Button } from 'antd'
import AuthSelect  from '../Datasource/auth-select'

class Authorization extends React.Component {

  static defautProps = {
    dataSources: {},
    roles: [],
    hideModal: _.noop,
    visible: false,
    loading: false,
    editDataSources: _.noop,
    updateStoreDataSources: _.noop
  }

  static propTypes = {
    dataSources: PropTypes.object.isRequired,
    roles: PropTypes.array.isRequired,
    hideModal: PropTypes.func.isRequired,
    visible: PropTypes.bool.isRequired,
    loading: PropTypes.bool.isRequired
  }

  constructor (props, context) {
    super(props, context)
  }

  onSubmit = () => {
    // TODO Create action
    this.props.editDataSources(this.props.dataSources)
    this.props.hideModal()
  }

  onAuthClick = (role) => {
    this.props.updateStoreDataSources(role, this.props.dataSources)
  }

  render () {
    const { dataSources, roles, hideModal, visible, loading } = this.props
    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon="close-circle-o"
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          icon={loading ? 'loading' : 'check'}
          className="mg1r iblock"
          onClick={this.onSubmit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )
    return (
      <Modal
        title="项目授权"
        visible={visible}
        footer={footer}
        onCancel={hideModal}
      >
        <p>将项目访问权限授给下列选择的用户组</p>
        <AuthSelect
          title=""
          roles={roles}
          record={dataSources}
          onClick={this.onAuthClick}
        />
      </Modal>
    )
  }
}

export { Authorization }

