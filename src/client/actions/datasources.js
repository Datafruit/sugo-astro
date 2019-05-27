import * as bus from '../databus/datasource'
import {setLoading} from './common'
import _ from 'lodash'

const getDatasources = (data, method, cb, doDispatch = true, options) => {

  return async dispatch => {

    setLoading(dispatch, true)
    let func = method
      ? bus[method]
      : data
        ? bus.getDatasources
        : bus.getDatasourcesWithDimSize

    let res =  await func(data, options)
    setLoading(dispatch, false)

    if (res && doDispatch) {
      let action1 = {
        type: 'set_datasources',
        data: res.result || res
      }
      dispatch(action1)
    }

    if (_.isFunction(cb)) {
      cb(res.result || res)
    }

    return res
    
  }

}

const getDimensions = (id, data, doDispatch = true) => {

  return async dispatch => {
    setLoading(dispatch, true)
    let res = await bus.getDimensions(id, data)
    setLoading(dispatch, false)

    if (!res) return

    let action1 = {
      type: 'set_dimensions',
      data: res.data
    }
    doDispatch && dispatch(action1)
    return res
  }
}

//获取未排序的维度
const getOriginDimensions = (id, data) => {

  return async dispatch => {
    setLoading(dispatch, true)
    let res = await bus.getDimensions(id, data)
    setLoading(dispatch, false)

    if (!res) return

    let action = {
      type: 'set_originDimensions',
      data: res.data
    }
    dispatch(action)
  }
}

//获取未排序的指标
const getOriginMeasures = (id, data) => {

  return async dispatch => {
    setLoading(dispatch, true)
    let res = await bus.getMeasures(id, data)
    setLoading(dispatch, false)

    if (!res) return

    let action = {
      type: 'set_originMeasures',
      data: res.data
    }
    dispatch(action)
  }
}

const getMeasures = (id, data) => {

  return async dispatch => {

    setLoading(dispatch, true)
    let res = await bus.getMeasures(id, data)
    setLoading(dispatch, false)

    if (!res) return

    let action1 = {
      type: 'set_measures',
      data: res.data
    }
    dispatch(action1)
  }
}

//actions maptoprops
export {getDatasources, getDimensions, getMeasures, getOriginDimensions, getOriginMeasures}
