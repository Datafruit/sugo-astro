import { Component } from 'react'
import { Form, Modal, Input, Button } from 'antd'

@Form.create()
export class CreateProject extends Component {
  state = {
    loading: false
  }
  onOk = () => {
    const { form, create, closeCreateProjectModal } = this.props

    form.validateFieldsAndScroll(async (err, values) => {
      if (!err) {
        this.setState({ loading: true })
        let result = await create(values.name)
        this.setState({ loading: false })
        if (result && result.success) closeCreateProjectModal()
      }
    })
  }

  onSubmit = (e) => {
    e.preventDefault()
    this.onOk()
  }

  render () {
    const { visible, closeCreateProjectModal, form: { getFieldDecorator } } = this.props
    const { loading } = this.state
    return (
      <Modal
        visible={visible} onOk={this.onOk}
        onCancel={closeCreateProjectModal}
        footer={[
          <Button
            type="ghost"
            key="back"
            icon="close-circle-o"
            className="mg1r iblock"
            onClick={closeCreateProjectModal}
          >
            取消
          </Button>,
          <Button
            key="submit"
            type="success"
            className="mg1r iblock"
            icon="check"
            loading={loading}
            onClick={this.onOk}
          >
            {loading ? '提交中...' : '提交'}
          </Button>
        ]}
      >
        <Form onSubmit={this.onSubmit}>
          <Form.Item label="项目名称" hasFeedback>
            {getFieldDecorator('name', {
              rules: [{
                required: true, message: '请输入项目名称!'
              }]
            })(
              <Input type="text"/>
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
