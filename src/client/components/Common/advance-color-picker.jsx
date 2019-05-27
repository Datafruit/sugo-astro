import React, {PropTypes} from 'react-proptypes-proxy'
import { Select } from 'antd'
import ColorPicker from './color-picker'
import deepCopy from '../../../common/deep-copy'

const Option = Select.Option

/**
 * 接收的渐变数据格式如下
 * color: {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [{
        offset: 0, color: 'red' // 0% 处的颜色
    }, {
        offset: 1, color: 'blue' // 100% 处的颜色
    }],
    globalCoord: false // 缺省为 false
  }
 * 
 * @class AdvanceColorPicker
 * @extends {React.PureComponent}
 */
class AdvanceColorPicker extends React.PureComponent {

  static propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.object
    ]),
    defaultValue: PropTypes.string,
    popOverContainer: PropTypes.element
  }

  constructor(props) {
    super(props)
    this.state = {
      mode: 'fill'
    }
    const { value = '#fff' } = props
    if (typeof(value) === 'object' && 'colorStops' in value) {
      this.state.mode = 'gradient'
      // this.colors = value.colorStops.map(v => v.color)
    } else {
      // this.color = value
    }
  }

  componentWillReceiveProps(nextProps) {
    if(this.props.value !== nextProps.value) {
      if (typeof(nextProps.value) === 'object' && 'colorStops' in nextProps.value) {
        this.setState({
          mode: 'gradient'
        })
      } else {
        this.setState({
          mode: 'fill'
        })
      }
    }
  }

  handleChangeMode = (mode) => {
    this.setState({
      mode
    })
    if (mode === 'fill') {
      this.handleChangeValue('#00bde1')
    } else {
      this.handleChangeValue({
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        type: 'linear',
        global: false,
        colorStops: [
          {
            color: '#00bde1',
            offset: 0
          },
          {
            color: '#8e47e7',
            offset: 1
          }
        ]
      })
    }
  }

  handleChangeValue = (v, i) => {
    const { onChange, value } = this.props
    if (i !== undefined) {
      // this.colors[i] = v
      const targetValue = deepCopy(value)
      targetValue.colorStops[i].color = v
      onChange && onChange(targetValue)
    } else {
      onChange && onChange(v)
    }
  }

  render() {
    const { value, className, style } = this.props
    const { mode } = this.state
    let value1, value2
    if (mode === 'gradient') {
      value1 = value.colorStops[0].color
      value2 = value.colorStops[1].color
    }
    return (
      <div className={className} style={style}>
        <Select value={mode} onChange={this.handleChangeMode} className="width-100">
          <Option key="fill">颜色填充</Option>
          <Option key="gradient">颜色渐变</Option>
        </Select>
        {
          mode === 'gradient'
          ?
          <div style={{ display: 'table' }}>
            <div style={{ display: 'table-cell', width: 15, height: '100%', paddingTop: 5, verticalAlign: 'top'}}>
              <div style={{ width: 10, height: '100%', backgroundImage: `linear-gradient(${value1}, ${value2})` }} />
            </div>
            <div style={{ display: 'table-cell'}}>
              <ColorPicker key="1" value={value1} onChange={v => this.handleChangeValue(v, 0)} className="mg1y" />
              <ColorPicker key="2" value={value2} onChange={v => this.handleChangeValue(v, 1)} />
            </div>
          </div>
          :
            <ColorPicker value={value} onChange={this.handleChangeValue} className="mg1y" />
        }
      </div>
    )
  }
}

export default AdvanceColorPicker
