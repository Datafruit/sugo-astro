/**
 * 同步器，用于自动同步 js obj 和 数据库数据
 * 由 Fetcher 把服务器的数据下载下来，然后用户能够修改，将修改存于 pendingData
 * 同步时检查差异，不同的就调用 http PUT，丢失的就调用 http DELETE，多出的没有 id 的项就调用 http POST 新增
 * 默认开启自动同步，关闭后可手动同步
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'
import {immutateUpdate, mapAwaitAll} from '../../../common/sugo-utils'
import setStatePromise from '../../common/set-state-promise'

@setStatePromise
export default class Synchronizer extends React.Component {
  static propTypes = {
    modelName: PropTypes.string.isRequired,
    url: PropTypes.oneOfType([PropTypes.string, PropTypes.func]).isRequired,
    query: PropTypes.object,
    children: PropTypes.func,
    doFetch: PropTypes.bool,
    doSync: PropTypes.bool,
    onLoaded: PropTypes.func,
    resultExtractor: PropTypes.func
  }

  static defaultProps = {
    children: _.constant(null),
    doFetch: true,
    doSync: false,
    resultExtractor: data => data && data.result || []
  }

  state = {
    isSyncing: false,
    pendingData: null // 应为数组
  }

  onData = (data) => {
    let {onLoaded, resultExtractor} = this.props
    let data0 = resultExtractor(data)

    this.setState({pendingData: data0})

    if (onLoaded) {
      onLoaded(data0)
    }
  }

  getUrlByMethod(method) {
    let {url} = this.props
    return _.isFunction(url) ? url(method) : url
  }

  addModel = (model) => {
    return FetchFinal.post(this.getUrlByMethod('POST'), model)
  }

  updateModel = (patch) => {
    return FetchFinal.put(`${this.getUrlByMethod('PUT')}/${patch.id}`, patch)
  }

  deleteModel = model => {
    return FetchFinal.delete(`${this.getUrlByMethod('DELETE')}/${model.id}`)
  }

  sync = async () => {
    let {resultExtractor} = this.props
    let {pendingData, isSyncing} = this.state
    if (!pendingData) {
      // 没有进行修改
      return
    }
    if (isSyncing) {
      // 已经正在同步
      return
    }
    this.setState({isSyncing: true})

    let originalData = resultExtractor(_.get(this._fetcher, 'state.data')) || []
    let fetchedDataDict = _.keyBy(originalData, d => d.id)

    let preCreateModels = pendingData.filter(d => !d.id || !(d.id in fetchedDataDict))
    let preUpdateModels = pendingData.filter(pd => pd.id && pd.id in fetchedDataDict && !_.isEqual(pd, fetchedDataDict[pd.id]))
    let preDeleteModels = _.differenceBy(originalData, pendingData, d => d.id)

    let resCreate = await mapAwaitAll(preCreateModels, this.addModel)
    let resUpdate = await mapAwaitAll(preUpdateModels, this.updateModel)
    let resDelete = await mapAwaitAll(preDeleteModels, this.deleteModel)

    let resReload = await this._fetcher.fetch()
    this.setState({isSyncing: false})

    return {resCreate, resUpdate, resDelete, resReload}
  }

  modifyData = async (path, updater) => {
    let {isSyncing, pendingData} = this.state
    if (isSyncing) {
      throw new Error('正在保存修改，请稍后再修改数据')
    }

    await this.setStatePromise({pendingData: immutateUpdate(pendingData, path, updater)})
    let {doSync} = this.props
    if (doSync) {
      return await this.sync()
    }
  }

  render() {
    let {doFetch, query, debounce, resultExtractor} = this.props

    let {pendingData, isSyncing} = this.state
    return (
      <Fetch
        ref={ref => this._fetcher = ref}
        lazy={!doFetch}
        params={includeCookie}
        headers={recvJSON.headers}
        onData={this.onData}
        url={this.getUrlByMethod('GET')}
        body={query}
        debounce={debounce}
      >
        {({isFetching, data, error, fetch}) => {
          let data0 = resultExtractor(data) || []
          return this.props.children({
            isFetching,
            data:  pendingData || data0,
            isSyncing,
            error,
            fetch,
            sync: this.sync,
            modifyData: this.modifyData
          })
        }}
      </Fetch>
    )
  }
}

export const synchronizer = (mapPropsToFetcherProps) => (Component) => props => {
  let fetcherProps = mapPropsToFetcherProps(props)
  let {modelName = 'models'} = fetcherProps
  let capModelName = modelName.replace(/^./, str => str.toUpperCase())
  return (
    <Synchronizer
      {...fetcherProps}
    >
      {({isFetching, isSyncing, data, fetch, sync, modifyData, ...rest}) => {
        return (
          <Component
            {...props}
            {...{
              ...rest,
              [modelName]: data || [],
              [`isFetching${capModelName}`]: isFetching,
              [`isSyncing${capModelName}`]: isSyncing,
              [`reload${capModelName}`]: fetch,
              [`modify${capModelName}`]: modifyData,
              [`sync${capModelName}`]: sync
            }}
          />
        )
      }}
    </Synchronizer>
  )
}
