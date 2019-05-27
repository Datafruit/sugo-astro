/**
 * 异步任务执行器，类似 fetcher，但通常用于执行不是单纯的 fetch 的任务
 * 若需要规范执行结果返回顺序，可结合 inQueue 使用
 * TODO 内嵌 inQueue ？
 */
import React from 'react'
import _ from 'lodash'
import {PropTypes} from 'react-proptypes-proxy'
import {isEqualWithFunc} from '../../../common/sugo-utils'

export default class AsyncTaskRunner extends React.Component {
  static propTypes = {
    args: PropTypes.array.isRequired,
    task: PropTypes.func.isRequired,
    doRun: PropTypes.bool,
    onResult: PropTypes.func,
    onError: PropTypes.func,
    onRunningStateChange: PropTypes.func,
    onRunnerUnmount: PropTypes.func,
    children: PropTypes.func,
    // debounce: PropTypes.number,
  }

  static defaultProps = {
    doRun: true,
    onRunningStateChange: _.noop,
    children: _.constant(null)
  }

  state = {
    isRunning: false,
    result: undefined,
    error: undefined
  }

  componentDidMount() {
    if (this.props.doRun) {
      this.run()
    }
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.doRun && !isEqualWithFunc(prevProps.args, this.props.args)) {
      this.run(this.props.args)
    }
  }
  
  componentWillUnmount() {
    let {onRunnerUnmount} = this.props
    if (onRunnerUnmount) {
      onRunnerUnmount()
    }
  }

  runCount = 0

  run = async (args = this.props.args) => {
    let {onRunningStateChange, onError, onResult} = this.props
    try {
      if (onRunningStateChange) {
        onRunningStateChange(true)
        this.setState({isRunning: true})
      }
      this.runCount += 1
      let validRunCount = this.runCount
      let res = await this.props.task(...args)
      if (this.runCount !== validRunCount) {
        return res
      }

      if (onResult) {
        onResult(res)
      }
      this.setState({result: res})
      return res
    } catch (e) {
      console.error(e)
      if (onError) {
        onError(e)
      }
      this.setState({error: e})
    } finally {
      onRunningStateChange(false)
      this.setState({isRunning: false})
    }
  }

  render() {
    return this.props.children({
      ...this.state,
      run: this.run
    })
  }

}
