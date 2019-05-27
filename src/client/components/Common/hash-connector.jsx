import {browserHistory} from 'react-router'
import React, {PropTypes} from 'react-proptypes-proxy'
import {decompressUrlQuery, compressUrlQuery, immutateUpdate} from '../../../common/sugo-utils'
import _ from 'lodash'

// 功能：
// 子组件需要设置：感兴趣的部分状态
// 那部分状态变化后刷新子组件
// 提供方法给子组件更新 hash

// hash 将会是一个 object 压缩后的字符串
function notifyAllForHashChange() {
  HashConnector.instants.forEach(inst => {
    inst.onHashChange()
  })
}

let prevPath
let prevHash

function isMoveToSamePage(nextPathName, currPathName) {
  return nextPathName === currPathName || nextPathName !== '/console' && _.startsWith(currPathName, nextPathName)
}

browserHistory.listenBefore((nextLocation, callback) => {
  // 记录上一个 pathname
  let currLocation = window.location
  if (currLocation.pathname !== nextLocation.pathname) {
    prevPath = currLocation.pathname
  }

  if (HashConnector.instants.length
    && !nextLocation.hash && currLocation.hash
    && isMoveToSamePage(nextLocation.pathname, currLocation.pathname)) {

    // 再次点击导航后则更新 prevPath ?
    prevPath = currLocation.pathname

    // fix #1824 自助分析中，再次点击自助分析的导航链接，会清空 hash，导致后续操作报错 (#1834)
    callback()

    // 重新加载默认的 hash
    setTimeout(() => {
      let insts = HashConnector.instants
      HashConnector.instants = []
      insts.forEach(inst => {
        inst.reloadDefaultState()
        HashConnector.instants.push(inst)
      })
    }, 1)
  } else {
    prevHash = currLocation.hash
    callback()
  }
})

browserHistory.listen(location => {
  if (location.hash && (location.hash !== prevHash || location.action === 'POP')) {
    notifyAllForHashChange()
  }
})

export function getPrevPathname() {
  return prevPath
}

export default class HashConnector extends React.Component {
  static propTypes = {
    mapHashStateToProps: PropTypes.func,
    defaultState: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
    children: PropTypes.func.isRequired,
    name: PropTypes.string
  }

  static defaultProps = {
    mapHashStateToProps: _.identity,
    defaultState: {}
  }

  static instants = []

  componentDidMount() {
    this.reloadDefaultState(true)
    HashConnector.instants.push(this)
  }

  componentWillUnmount() {
    HashConnector.instants = HashConnector.instants.filter(inst => inst !== this)
  }

  reloadDefaultState(appendOnly = false) {
    let {defaultState} = this.props
    if (_.isFunction(defaultState)) {
      defaultState = defaultState()
    }

    if (!_.isEmpty(defaultState)) {
      // 根据默认属性初始化 hash
      let hash = location.hash && location.hash.replace('#', '')
      let json = decompressUrlQuery(hash)
      let currentState = hash && JSON.parse(json) || {}
      let shouldMergeKey = appendOnly
        ? _.difference(Object.keys(defaultState), Object.keys(currentState))
        : Object.keys(defaultState).filter(newKey => {
          return !(newKey in currentState) || !_.isEqual(defaultState[newKey], currentState[newKey])
        })

      if (shouldMergeKey.length) {
        let preMerge = _.pick(defaultState, shouldMergeKey)
        let nextHashState = {...currentState, ...preMerge}
        let nextHash = compressUrlQuery(JSON.stringify(nextHashState), 'hash-connector: init')
        browserHistory.replace({
          pathname: window.location.pathname,
          search: window.location.search,
          hash: `#${nextHash}`
        })
      }
    }
    this.setState(this.extractState(location.hash))
  }

  onHashChange = () => {
    let callback = this.onHashChangedCallback
    this.onHashChangedCallback = null

    let partialState = this.extractState(location.hash)
    let preUpdateKeys = Object.keys(partialState)
    if (_.every(preUpdateKeys, k => _.isEqual(partialState[k], this.state[k]))) {
      if (callback) {
        callback()
      }
      return
    }

    this.setState(partialState, callback)
  }

  extractState(hash) {
    let newState = hash && JSON.parse(decompressUrlQuery(hash.replace('#', ''))) || {}
    return this.props.mapHashStateToProps(newState)
  }

  updateHashState = (partialState, doReplaceHistory = false, callback = null) => {
    let hash = location.hash && location.hash.replace('#', '')
    let currentState = JSON.parse(decompressUrlQuery(hash))

    let delta = _.isFunction(partialState) ? partialState(currentState) : partialState
    let newState = Object.assign({}, currentState, delta)
    if (_.isEqual(newState, currentState)) {
      if (callback) {
        callback()
      }
      return
    }

    let nextHash = compressUrlQuery(JSON.stringify(newState), 'hash-connector: hash update')
    // console.info(`Will ${doReplaceHistory ? 'replace' : 'push'} hash state: ${JSON.stringify(newState)}`)

    this.onHashChangedCallback = callback
    if (doReplaceHistory) {
      browserHistory.replace({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: `#${nextHash}`
      })
    } else {
      browserHistory.push({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: `#${nextHash}`
      })
    }
  }

  updateHashStateByPath = (path, updater, doReplaceHistory = false, callback = null) => {
    this.updateHashState(prevState => immutateUpdate(prevState, path, updater), doReplaceHistory, callback)
  }

  render() {
    return this.props.children({
      ...this.state,
      updateHashState: this.updateHashState,
      updateHashStateByPath: this.updateHashStateByPath
    })
  }
}

export const withHashStateDec = (mapHashStateToProps, defaultState, name) => {
  return WrappedComponent => withHashState(WrappedComponent, mapHashStateToProps, defaultState, name)
}

export const withHashState = (WrappedComponent, mapHashStateToProps, defaultState, name) => props => {
  return (
    <HashConnector
      mapHashStateToProps={mapHashStateToProps}
      defaultState={_.isFunction(defaultState) ? () => defaultState(props) : defaultState}
      name={name || WrappedComponent.displayName || WrappedComponent.name}
    >
      {(propsFromHashConnector) => {
        return (
          <WrappedComponent
            {...props}
            {...propsFromHashConnector}
          />
        )
      }}
    </HashConnector>
  )
}
