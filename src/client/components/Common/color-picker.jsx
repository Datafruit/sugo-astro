import { Component, PropTypes } from 'react'
import { SketchPicker } from 'react-color'
import { Input, Popover } from 'antd'
const InputGroup = Input.Group

class ColorPicker extends Component {

  static propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.string,
    defaultValue: PropTypes.string,
    popOverContainer: PropTypes.element
  }

  state = {
    displayColorPicker: false,
    color: this.props.value || this.props.defaultValue || '#fff'
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.value !== nextProps.value) {
      this.setState({
        color: nextProps.value
      })
    }
  }

  handleClick = () => {
    this.setState({ displayColorPicker: !this.state.displayColorPicker })
  }

  handleClose = () => {
    this.setState({ displayColorPicker: false })
  }

  handleGlobalClick = e => {
    e.stopPropagation()
    this.handleClose()
  }

  handleChangeComplete = (color) => {
    let colorCode = color.hex
    if (color.rgb.a < 1) {
      const {r,g,b,a} = color.rgb
      colorCode = `rgba(${r},${g},${b},${a})`
    }
    this.setState({
      color: colorCode
    })
    this.props.onChange && this.props.onChange(colorCode)
  }

  handleInputChange = (v) => {
    //如果颜色上有透明,就切换到RGB
  }

  render() {
    const swatch = {
      padding: '4px',
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
      width: '20%',
      border: '1px solid #d9d9d9',
      borderRightWidth: 0,
      display: 'inline-block',
      cursor: 'pointer'
    }
    const colorPreview= {
      // width: 18,
      border: '1px solid #e9e9e9',
      height: 18,
      backgroundColor: this.state.color
    }

    const overlayStyle = {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      left:0,
      zIndex: 2
    }

    const { popOverContainer } = this.props
    return (
       <Popover
          visible={this.state.displayColorPicker}
          placement="bottom"
          overlayClassName="color-picker-over"
          getPopupContainer={node => popOverContainer ? popOverContainer : node.parentNode}
          content={
            <SketchPicker
                width={240}
                color={this.state.color}
                onChangeComplete={this.handleChangeComplete}
            />
          }
       >
          {
            this.state.displayColorPicker
            ? <div style={overlayStyle} onClick={this.handleGlobalClick} />
            : false
          }
          <InputGroup {...this.props} compact>
            <div style={swatch} onClick={this.handleClick} ref={prefix => this.prefix = prefix}>
              <div style={colorPreview}/>
            </div>
            <Input
              style={{ width: '80%' }}
              value={this.state.color}
              onClick={this.handleClick}
              onChange={this.handleInputChange}
              ref={input => this.input = input}
            />
          </InputGroup>
       </Popover>
    )
  }
}

export default ColorPicker
