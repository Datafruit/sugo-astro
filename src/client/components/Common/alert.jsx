import {Icon} from 'antd'

export default function Alert (props) {

  return (
    <div
      className="common-alert"
      style={props.style}
    >
      <Icon type="notification" className="mg1r"/>
      {props.msg}
    </div>
  )

}
