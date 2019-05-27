import _ from 'lodash'
import React, {PropTypes} from 'react-proptypes-proxy'

export default class DebounceOnChange extends React.Component {

  static defaultProps = { }

  static propTypes = {
    children: PropTypes.func.isRequired,
    wait: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired,
    onDebouncing: PropTypes.func,
    eventValueMapper: PropTypes.func.isRequired,
    debounceOptions: PropTypes.object,
    value: PropTypes.any
  }

  state = {
    tempValue: null
  }

  componentWillMount() {
    let {value, wait, debounceOptions} = this.props
    this.setState({tempValue: value})
    this.debouncedOnChange = _.debounce(this.delayOnChange, wait, debounceOptions)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({tempValue: nextProps.value})
    }
  }

  debounceStatus = false

  delayOnChange = val => {
    let {onChange, onChangeValWrapper = _.identity} = this.props
    if (this.debounceStatus) {
      this.debounceStatus = false
    }
    onChange(onChangeValWrapper(val))
  }

  realTimeOnChange = (...args) => {
    let {eventValueMapper, onDebouncing} = this.props

    let val = eventValueMapper(...args)
    if (onDebouncing && !this.debounceStatus) {
      this.debounceStatus = true
      onDebouncing(true)
    }
    this.setState({tempValue: val})
    this.debouncedOnChange(val)
  }

  render() {
    let {children} = this.props

    return children({value: this.state.tempValue, onChange: this.realTimeOnChange})
  }
}

export const withDebouncedOnChange = (ComposedComponent, eventValueMapper, wait = 1300, debounceOptions, onChangeValWrapper) => props => {
  let {value, onChange, onDebouncing, wait: waitOverwrite, ...rest} = props
  return (
    <DebounceOnChange
      value={value}
      onChange={onChange}
      wait={waitOverwrite || wait}
      debounceOptions={debounceOptions}
      eventValueMapper={eventValueMapper}
      onChangeValWrapper={onChangeValWrapper}
      onDebouncing={onDebouncing}
    >
      {({value, onChange}) => {
        return (
          <ComposedComponent
            value={value}
            onChange={onChange}
            {...rest}
          />
        )
      }}
    </DebounceOnChange>
  )
}
