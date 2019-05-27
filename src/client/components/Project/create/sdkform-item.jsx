import React, { Component } from 'react'
import { Form, Input, Checkbox } from 'antd'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

const FormItem = Form.Item

class SdkformItem extends Component {
  state = {
    checked: false
  }


  render() {
    const { title, getFieldDecorator, setFieldsValue, itemKey, rules, tips = '系统自动生成' } = this.props
    const { checked } = this.state
    return (
      <FormItem
        {...formItemLayout}
        label={
          <Checkbox
            onChange={() => {
              this.setState({
                checked: !checked
              })
              setFieldsValue({ [itemKey]: ''})
            }}
            checked={checked}
          >
            <div className="width40" style={{ display: 'inline-block', textAlign: 'center' }}>{title}</div>
          </Checkbox>
        }
        hasFeedback
      >
        {getFieldDecorator(itemKey, {
          initialValue: '',
          rules
        })(
          <Input
            placeholder={tips}
            disabled={!checked}
          />
        )}
      </FormItem>
    )
  }
}

export default SdkformItem
