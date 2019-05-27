/**
 * 接入步骤显示组件
 */
import { Steps, Icon } from 'antd'
import _ from 'lodash'
const {Step} = Steps
const defaultSteps = [
  {
    title: '选择导入方式'
  },
  {
    title: '上传数据文件'
  },
  {
    title: '设置导入规则'
  },
  {
    title: '完成数据导入'
  }
]
export default function AccessStep(props) {
  let {
    steps = defaultSteps,
    current = 0,
    className = 'mg-auto mw-70 relative bg-white pd2 mg2b borderb',
    ...rest
  } = props
  if (_.isFunction(steps)) {
    steps = steps(defaultSteps)
  }
  return (
    <div
      className={className}
      {...rest}
    >
      <Steps current={current}>
      {
        steps.map((step, i) => {
          let {icon, title} = step
          if (icon) {
            step.icon = (
              <Icon type={icon} />
            )
          }
          return (
            <Step
              {...step}
              key={i + '#' + title}
            />
          )
        })
      }
      </Steps>
    </div>
  )
}
