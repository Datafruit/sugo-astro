import { remoteUrl as URL } from '../constants'
import Fetch from '../common/fetch-final'
import _ from 'lodash'
import {toQueryParams} from 'common/sugo-utils'

// 获取数据源列表
export async function getDatasources(data, options) {
  return await Fetch.get(URL.GET_DATASOURCES, data, options)
}

// 获取全公司所有维度指标，目前仅供新建用户组授权使用，以便减少查询次数
export async function getRes(data) {
  return await Fetch.get(URL.GET_RES, data)
}

//获取带维度的数据源
export async function getDatasourcesWithDimSize(data = {}, options) {
  return await Fetch.get(
    URL.GET_DATASOURCES, 
    { ...data, withCount: 1 },
    options
  )
}

//获取带设定参数的数据源
export async function getDatasourcesWithSetting(data = {}, options) {

  if (!data.where) {
    data.where = {
      status: 1
    }
  } else if (!data.where.status) {
    data.where.status = 1
  }

  let res = await Fetch.get(
    URL.GET_DATASOURCES,
    { ...data, withDim: 1 },
    options
  )
  let {dimensions} = res
  res.result = res.result.map(datasource => {
    datasource.params.retentionDimension = datasource.params.commonDimensions
    datasource.params.retentionDimensionTitle = datasource.params.retentionDimension.map(dimensionName => {
      let obj = _.find(dimensions, {
        name: dimensionName,
        parentId: datasource.id
      })
      return obj && obj.title || dimensionName
    })

    datasource.commonDimensionsTree = datasource.params.commonDimensions.reduce((prev, name) => {
      let obj = _.find(dimensions, {
        name: name,
        parentId: datasource.id
      })
      prev[name] = obj
      return prev
    }, {})
    datasource.commonMetricTree = datasource.params.commonMetric.reduce((prev, name) => {
      let obj = _.find(dimensions, {
        name: name,
        parentId: datasource.id
      })
      prev[name] = obj
      return prev
    }, {})
    return datasource
  })
  return res
}

// 编辑数据源
export async function editDatasource(id, data) {
  return await Fetch.put(URL.EDIT_DATASOURCE + '/' + id, data)
}

// 删除数据源
export async function deleteDatasource(id) {
  return await Fetch.post(URL.DELETE_DATASOURCE, {id})
}

// 激活数据源
export async function topicDatasource(id) {
  return await Fetch.get(URL.GET_DATASOURCES + '/' + id + '/active')
}

export async function unActiveTask(data) {
  return await Fetch.get(URL.GET_DATASOURCES + '/' + data.id + '/unActive/' + data.taskId)
}

// 获取维度
export async function getDimensions(parentId, data) {
  return await Fetch.get(URL.GET_DIMENSIONS + '/' + parentId + '?' + toQueryParams(data))
}

// 新增维度
export async function addDimension(parentId, data) {
  return await Fetch.post(URL.ADD_DIMENSION + '/' + parentId, data)
}

// 编辑维度
export async function editDimension(id, data) {
  return await Fetch.put(URL.EDIT_DIMENSION + '/' + id, data)
}

// 删除维度
export async function deleteDimension(names, parentId, sourceName, titles) {
  return await Fetch.post(URL.DELETE_DIMENSION, { names, parentId, sourceName, titles }) // titles 为日志搜索需要的字段
}

// 获取指标
export async function getMeasures(id, data) {
  return await Fetch.get(URL.GET_MEASURES + '/' + id + '?' + toQueryParams(data))
}

// 新增指标
export async function addMeasure(parentId, data) {
  return await Fetch.post(URL.ADD_MEASURE + '/' + parentId, data)
}

// 编辑指标
export async function editMeasure(id, data) {
  return await Fetch.put(URL.EDIT_MEASURE + '/' + id, data)
}

// 删除指标
export async function deleteMeasure(names, parentId) {
  return await Fetch.post(URL.DELETE_MEASURE, {names, parentId})
}

// 新增标签
export async function addTag(id, data) {
  return await Fetch.post(URL.ADD_TAG + '/' + id, data)
}

// 获取标签
export async function getTags(id, data) {
  return await Fetch.get(URL.GET_TAGS + '/' + id, data)
}

// 编辑标签
export async function editTag(id, data) {
  return await Fetch.post(URL.EDIT_TAG + '/' + id, data)
}

// 删除标签
export async function deleteTag(id, data) {
  return await Fetch.post(URL.DELETE_TAG + '/' + id, data)
}

// 验证公式
export async function validFormula(data) {
  return await Fetch.post(URL.VALID_FORMULA, data)
}

// 同步维度
export async function syncDimensions(parentId, data) {
  return await Fetch.post(URL.SYNC_DIMENSIONS + '/' + parentId, data)
}

// 获取druid 维度
export async function getDruidDims(name) {
  return await Fetch.get(URL.GET_DRUID_DIMS + '/' + name)
}

// 同步维度
export async function editProjectRoles(id, data) {
  return await Fetch.put(URL.EDIT_PROJECT_ROLES + '/' + id, data)
}

// 验证复合维度计算公式
export async function validDimensionFormula(data) {
  return await Fetch.post(URL.VALID_DIMENSION_FORMULA, data)
}

// 授权维度
export async function authorizeDimension(id, data) {
  return await Fetch.put(URL.AUTHORIZE_DIMENSION + '/' + id, data)
}

// 授权指标
export async function authorizeMeasure(id, data) {
  return await Fetch.put(URL.AUTHORIZE_MEASURE + '/' + id, data)
}

// 新增用户标签
export async function addUserTag(parentId, data) {
  return await Fetch.post(URL.ADD_USER_TAG + '/' + parentId, data)
}

// 编辑用户标签
export async function editUserTag(id, data) {
  return await Fetch.put(URL.EDIT_USER_TAG + '/' + id, data)
}

// 删除用户标签
export async function deleteUserTag(names, parentId, sourceName, titles) {
  return await Fetch.post(URL.DELETE_USER_TAG, { names, parentId, sourceName, titles }) // titles 为日志搜索需要的字段
}

// 同步用户标签
export async function syncUserTag(parentId, data) {
  return await Fetch.post(URL.SYNC_USER_TAG + '/' + parentId, data)
}

// 授权用户标签
export async function authorizeUserTag(id, data) {
  return await Fetch.put(URL.AUTHORIZE_USER_TAG + '/' + id, data)
}
