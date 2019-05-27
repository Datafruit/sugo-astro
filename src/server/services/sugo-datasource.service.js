import db from '../models'
import _ from 'lodash'
import {checkLimit} from '../utils/resouce-limit'
import SupervisorService from '../services/druid-supervisor.service'
import {err, log} from '../utils/log'
import {convertTypeToDruid, groupBy, immutateUpdate, immutateUpdates} from '../../common/sugo-utils'
import fetch from '../utils/fetch-kit'
import config from '../config'
import {SDK_DEFAULT_DIMENSION_TRANSLATION_DICT, SDK_DEFAULT_DIMENSIONS, TAG_DEFAULT_DIMENSION_TRANSLATION_DICT, TAG_DEFAULT_DIMENSIONS} from '../../common/sdk-access-dimensions'
import {
  AccessDataOriginalType,
  AccessDataType,
  DataSourceType,
  DimDatasourceType, MySQLColumnTypeMatchDict,
  QUERY_ENGINE
} from '../../common/constants'
import DruidQueryService from '../services/druid-query.service'
import ProjectService from '../services/sugo-project.service'
import LogUploadSrv from './log-upload.service'
import DruidColumnType, {DRUID_DIMENSION_MAP, MultipleValuesTypeOffset} from '../../common/druid-column-type'
import {generate} from 'shortid'
import {defineTypes, PropTypes} from '../../common/checker'
import {Response} from '../utils/Response'
import sugoDimensionService from './sugo-dimensions.service'
import UindexDatasourceService from '../services/uindex-datasource.service'
import {SDK_DEFAULT_DASHBOARDS, SDK_DEFAULT_METRICS, SDK_DEFAULT_SLICES} from '../constants/sdk-default-dashboard'
import moment from 'moment'
import {
  getExpressionComputeContext,
  getStreamRequesterByDataSource
} from '../utils/plywood-facade'
import toArray from 'stream-to-array'

const timeout = 30000

//检查JSON字符串是否含有数组中任意一个字符串
const checkInStr = (str, arr) => {
  return arr.filter(f => {
    return str.includes(`"${f}"`)
  })
}

//druid type 为全大写 LONG，需要转换
const convertedColumnType = _.mapKeys(DruidColumnType, (val, key) => key.toUpperCase())


/**
 * 合并默认数据源维度和标签数据源维度信息，准备一起同步到维度表
 * 主要要注意的是两个数据源共有的维度标识为 datasource_type: 'default_tag'
 * @param {object} defaultDimDict
 * @param {object} tagDimDict
 */
const mergeDimensionDict = (defaultDimDict, tagDimDict) => {
  return Object.keys(tagDimDict).reduce((prev, k) => {
    if (prev[k]) {
      prev[k].datasource_type = 'default_tag'
    } else {
      prev[k] = tagDimDict[k]
      prev[k].datasource_type = 'tag'
    }
    return prev
  }, defaultDimDict)
}

/**
 * 查询tindex(druid)/uindex原始维度
 * QUERY_ENGINE.TINDEX
 * @param {*} sourceName 数据源名称
 * @param {*} queryEngine 查询引擎 QUERY_ENGINE
 * @return /**
  *  {  "__time": {
        "type": "LONG",
        "hasMultipleValues": false,
        "datasource_type": "tag/default" // tag=UINDEX, default=TINDEX
      },
      ...
    }
 */
const getDruidDims = async (sourceName, queryEngine = QUERY_ENGINE.TINDEX) => {
  let queryObj = {
    queryType: 'lucene_segmentMetadata',
    intervals: '1000/3000',
    dataSource: sourceName,
    merge: true,
    analysisTypes: [
      'aggregators'
    ],
    lenientAggregatorMerge: true,
    usingDefaultInterval: false
  }

  let druidDims
  try {
    druidDims = await DruidQueryService.queryByLucene(queryObj, queryEngine)
  } catch (e) {
    debug(e.stack)
    err('druid 查询出错')
  }
  /**
   * result =>
   * "__time": {
          "type": "LONG",
          "hasMultipleValues": false,
          "datasource_type": "tag/default" // tag=UINDEX, default=TINDEX
          // "size": 0,
          // "cardinality": 0,
          // "minValue": 0,
          // "maxValue": 0,
          // "errorMessage": null
      },
      ...
   */
  let result = {}
  if (druidDims) {
    result = ('columns' in druidDims) ? druidDims.columns : _.get(druidDims, '[0].columns', {})
  }

  // 将 __time 修改为 Date 类型
  if (_.has(result, '__time')) {
    result = immutateUpdate(result, '__time.type', () => 'DATE')
  }
  result = Object.keys(result).reduce((prev, v) => {
    result[v].datasource_type = queryEngine === QUERY_ENGINE.UINDEX ? 'tag' : 'default'
    return result
  }, result)

  if (queryEngine === QUERY_ENGINE.UINDEX) {
    try {
      const uindeSpecs = await UindexDatasourceService.getInstance().getSpecDimesnion(sourceName)
      const { dimensions = [] } = uindeSpecs
      result = dimensions.reduce((prev, cur) => {
        const dimName = cur.name
        if (!_.has(result, dimName)) { // 如果segmentMeta中不存在的维度则已接口返回维度填充
          result[dimName] = {
            datasource_type: 'tag',
            type: _.toUpper(_.get(cur, 'type')),
            hasMultipleValues: _.get(cur, 'hasMultipleValues')
          }
        }
        return result
      }, result)
    } catch (e) {
      console.log('getSpecDimesnion error', e.stack)
      throw new Error(e)
    }
  }
  return result
}

const getMySQLDimNameDict = async (tableName) => {
  let requester = getStreamRequesterByDataSource(await getDataSourceByName(tableName))

  let computeContext = await getExpressionComputeContext(undefined, tableName)
  let streamRes = await requester({
    query: `DESCRIBE \`${tableName}\``,
    context: computeContext.context
  })

  let res = await toArray(streamRes)

  return groupBy(res.map(d => _.mapKeys(d, (v, k) => k.toLowerCase())),
    v => v.field,
    arr => _.mapValues(arr[0], (v, k) => {
      return k === 'type' ? _.findKey(MySQLColumnTypeMatchDict, re => re.test(v)) || v : v
    }))
}

const selectOneByAppidForNewAccess = async (appid) => {
  if (!appid) {
    return null
  }
  //查询DataSourceid
  const sql = `SELECT ds.* FROM sugo_datasources ds, sugo_projects pro, sugo_data_analysis da
            WHERE pro."id"=da.project_id AND pro.datasource_id=ds."id" AND da."id" =:appid`
  const dsRes = await db.client.query(sql, {
    replacements: { appid },
    type: db.client.QueryTypes.SELECT
  })
  if (dsRes && dsRes.length > 0) {
    return dsRes[0]
  } else {
    return null
  }
}

const deleteTopic = async (topic) => {
  if (!topic) return
  const host = await SupervisorService.getLeaderHost()
  let url = `http://${host}/druid/indexer/v1/supervisor/topic/${topic}/delete`
  let res = await fetch.post(url, null, {
    timeout,
    handleResponse: res => {
      return res.text()
    }
  })
  log('del topic', topic, 'result:', res)
  return res
}

/**
 * 查询所有维度与维度类型
 * @static
 * @param {String} project_id
 * @param {String} [company_id] - sdk接入时可不传company_id
 * @return {Array<Object>}
 */
const getDimensionsForSDK = async (project_id, company_id) => {
  const checked = defineTypes({
    project_id: PropTypes.string.isRequired,
    company_id: PropTypes.string
  })({ project_id, company_id })

  if (!checked.success) {
    return []
  }

  const res = await ProjectService.info(project_id)
  const project = res.result

  if (!project) {
    return []
  }

  const datasource_id = project.datasource_id
  let sql = 'SELECT DISTINCT ' +
    'dim."name", dim."type", dim."title" ' +
    'from sugo_dimensions dim, sugo_datasources ds ' +
    'WHERE dim."parentId"=ds."id" ' +
    'AND ds."id"=:datasource_id'

  if (company_id) {
    sql = sql + ' AND ds.company_id=:company_id'
  }

  return await db.client.query(sql, {
    replacements: { datasource_id, company_id },
    type: db.client.QueryTypes.SELECT
  })
}

/**
 * 获取维度最大的时间戳
 * @static
 * @param {String} project_id
 * @return {Array<Object>}
 */
const getDimensionsVersion = async (project_id) => {
  const res = await ProjectService.info(project_id)
  const project = res.result

  if (!project) {
    return 0
  }
  const maxUpdatedAt = await db.SugoDimensions.max('updatedAt', { 
    where: { 
      parentId: project.datasource_id, 
      company_id: project.company_id
    }
  })
  const maxVersion = _.toInteger(moment(maxUpdatedAt).format('X'))
  return maxVersion
}

/**
 * 获取创建supervisor需要的维度列表
 * @static
 * @param {String} project_id
 * @param {String} company_id
 * @returns {Promise<Array<Object>>}
 */
const getDimensionsForSupervisor = async (project_id, company_id) => {
  // 加载维度表的维度组装 dimensionsSpec
  const dimensions = await getDimensionsForSDK(project_id, company_id)
  return dimensions.map((dim) => {
    const name = dim.name
    const type = convertTypeToDruid(dim.type)
    return { name, type }
  })
}

/**
 * 同步维度服务
 * @static
 * @param {string} datasourceId 数据源id
 * @param company_id
 * @param created_by
 * @param outerTransaction
 * @returns {object}

 */
const syncDimension = async (datasourceId, company_id, created_by, outerTransaction = undefined) => {
  let parentId = datasourceId
  let dbDims = await db.SugoDimensions.findAll({
    where: {
      parentId,
      company_id
    },
    transaction: outerTransaction,
    raw: true
  })
  let dataSource = await db.SugoDatasources.findOne({
    where: {
      id: parentId,
      company_id
    },
    transaction: outerTransaction,
    raw: true
  })
  let { role_ids, name, tag_datasource_name, type } = dataSource
  const dbDimNameDict = _.keyBy(dbDims, 'name')
  let druidDimNameDict = []
  let excultTagDim = []
  if(type === DataSourceType.Uindex) {
    druidDimNameDict = await getDruidDims(tag_datasource_name, QUERY_ENGINE.UINDEX)  
    // 获取default_tag 同步排除
    excultTagDim = dbDims.filter(p => p.datasource_type === 'default_tag').map( p => p.name)
  } else if(type ===  DataSourceType.MySQL) {
    druidDimNameDict = await getMySQLDimNameDict(name)
  } else {
    druidDimNameDict = await getDruidDims(name, QUERY_ENGINE.TINDEX)
  }

  let druidDimNames = Object.keys(druidDimNameDict)

  if (type === DataSourceType.Uindex) {
    let druidDimNamesInspec = await UindexDatasourceService.getInstance().getSpecDimesnion(tag_datasource_name)
    druidDimNamesInspec = [
      '__time',
      ...druidDimNamesInspec.dimensions.map(n => n.name)
    ]
    druidDimNames = druidDimNames.filter(p => p !== '__ut').filter(p => !excultTagDim.includes(p)).filter(k => {
      let dim = druidDimNameDict[k]
      let { datasource_type } = dim
      if (!datasource_type.includes('tag')) {
        return true
      }
      return datasource_type.includes('tag') && druidDimNamesInspec.includes(k)
    })
  }
  let newDimensions = []
  let addedDims = []
  let updatedDims = []
  //如果druid没有维度信息 则不同步维度
  if (druidDimNames && druidDimNames.length === 0) {
    return {
      updatedDims,
      addedDims
    }
  }

  // 同步维度 排除已删除的维度
  let proj = await db.SugoProjects.findOne({
    where: {
      datasource_id: datasourceId
    },
    raw: true
  })
  if (proj && _.get(proj, 'ignore_sync_dimension.length', 0)) {
    let ignoreSyncDimension = _.difference(proj.ignore_sync_dimension || [], dbDims.map(p => p.name))
    if(ignoreSyncDimension.length) {
      druidDimNames = druidDimNames.filter(p => !ignoreSyncDimension.includes(p))
    }
  }

  for (let i = 0; i < druidDimNames.length; i++) {
    let druidDimName = druidDimNames[i]
    let dbDimByDruidName = dbDimNameDict[druidDimName]
    let druidDim = druidDimNameDict[druidDimName]
    if (!druidDim) {
      continue
    }
    let {hasMultipleValues} = druidDim

    let finalDimType = convertedColumnType[druidDim.type] + (hasMultipleValues ? MultipleValuesTypeOffset : 0)

    // 如果 druid 维度不存在于 pg，则添加
    if (!dbDimByDruidName) {
      let uid = generate()
      newDimensions.push({
        id: uid,
        parentId,
        title: SDK_DEFAULT_DIMENSION_TRANSLATION_DICT[druidDimName] || druidDimName,
        type: finalDimType,
        company_id,
        role_ids,
        created_by,
        name: druidDimName,
        datasource_type: druidDim.datasource_type || DimDatasourceType.default,
        is_druid_dimension: true
      })
      addedDims.push(druidDimName)
    } else {
      // pg 数据库中存在 druid 维度

      // 过滤DateString情况，因为csv上报druid的时候，DateString最终还是传入string类型
      let isDateStringMatchToString = dbDimByDruidName.type === DruidColumnType.DateString && finalDimType === DruidColumnType.String
      // 检测已存在的维度类型是不是匹配
      let isTypeNotMatch = finalDimType !== dbDimByDruidName.type && !isDateStringMatchToString

      let dbDimMarkedAsDruidDim = dbDimByDruidName.is_druid_dimension
      let datasource_typeNotSame = dbDimByDruidName.datasource_type !== druidDim.datasource_type

      if (isTypeNotMatch || datasource_typeNotSame || !dbDimMarkedAsDruidDim) {
        updatedDims.push({
          id: dbDimByDruidName.id,
          type: finalDimType,
          datasource_type: druidDim.datasource_type,
          name: dbDimByDruidName.title || dbDimByDruidName.name,
          is_druid_dimension: true // SQL更新方式被注释了(故打开此属性设置)
        })
      }
    }
  }

  //获取SpecDimesnion
  let names = druidDimNames

  let doUpdate = async transaction => {
    //获取pg有druid没有的字段删除
    let pgDimensions = _.map(dbDimNameDict, p => {
      // 删除维度时排除掉标签项目default_tag
      if(excultTagDim.includes(p.name)) {
        return null
      } else if (p.is_druid_dimension) {
        return p.name
      } else {
        return null
      }
    }).filter(_.identity)
    let removePgDimensions = _.difference(pgDimensions, names)
    if (removePgDimensions.length) {
      await sugoDimensionService.deleteDimension(parentId, name, removePgDimensions, company_id, true, transaction)
    }
    /**
     updatedDims = [{
          id: dim.id,
          type: druidDimType,
          name: dim.title || dim.name
        }]
     ===>
     updateTypeGroups = {
        type_0: [id, id]
        type_2: [id, id]
      }
     */
    // let updateTypeGroups = groupBy(updatedDims, dimPatch => `${dimPatch.type}`, patchDims => patchDims.map(pd => pd.id))
    // const sql = 'update sugo_dimensions set type=:type, is_druid_dimension=TRUE where id IN(:ids) and company_id=:company_id'

    // let updatePromises = Object.keys(updateTypeGroups).map(type => {
    //   return db.client.query(sql, {
    //     replacements: {
    //       ids: updateTypeGroups[type],
    //       type: +type,
    //       company_id
    //     },
    //     type: db.client.QueryTypes.UPDATE,
    //     transaction
    //   })
    // })

    //为了支持datasource_type更新,改为逐个更新
    for (let dim of updatedDims) {
      // 只更新 type，datasource_type，is_druid_dimension
      await db.SugoDimensions.update(_.pick(dim, ['type', 'datasource_type', 'is_druid_dimension']), {
        where: {
          id: dim.id,
          company_id
        },
        transaction
      })
    }

    if (!_.isEmpty(newDimensions)) {
      await db.SugoDimensions.bulkCreate(newDimensions, { transaction })
    }
  }
  if (outerTransaction) {
    await doUpdate(outerTransaction)
  } else {
    await db.client.transaction(doUpdate)
  }

  return {
    updatedDims,
    addedDims
  }
}

/**
 * 检查维度服务
 * 检查维度是否被单图,分群，数据源行为维度设置等使用，如果有返回占用单位描述，否则返回false
 * @param {string} datasourceId 数据源名称
 * @param {string} company_id 数据源名称
 * @param {string} dimensionId 维度id
 * @param {bool} ckeckAllUsed 检测所有引用 返回被引用的names
 * @returns {false | string}
 */
const checkDimensionUsed = async ({ datasourceId, company_id, dimensionNames, ckeckAllUsed = false }) => {

  let usedDimeNames = []
  let dims = await db.SugoDimensions.findAll({
    where: {
      company_id,
      parentId: datasourceId,
      name: {
        $in: dimensionNames
      }
    }
  })

  let tree = dims.reduce((prev, curr) => {
    prev[curr.name] = curr.title || curr.name
    return prev
  }, {})

  //check slice
  let query = {
    where: {
      company_id,
      druid_datasource_id: datasourceId
    },
    attributes: ['slice_name', 'params']
  }

  let existInSlice = await db.Slices.findAll(query)
  let dims1 = []
  let sliceNames = existInSlice
    .filter(bm => {
      let str = JSON.stringify(bm.params)
      let used = dimensionNames.filter((curr) => {
        return str.includes(`"${curr}"`)
      })
      dims1 = dims1.concat(used)
      return used.length
    })
    .map(s => s.slice_name).join(',')

  if (sliceNames) {
    if (ckeckAllUsed) {
      usedDimeNames = usedDimeNames.concat(dims1)
    } else {
      return {
        taken: `单图:<b>${sliceNames}</b>`,
        dimensionTitles: _.uniq(dims1).map(r => tree[r])
      }
    }
  }

  //check datasource
  let ds = await db.SugoDatasources.findOne({
    where: {
      company_id,
      id: datasourceId
    },
    attributes: ['title', 'params']
  })

  if (ds) {
    let str = JSON.stringify(ds.params)
    let used = dimensionNames.filter((curr) => {
      return str.includes('"' + curr + '"')
    })

    if (used.length) {
      if (ckeckAllUsed) {
        usedDimeNames = usedDimeNames.concat(used)
      } else {
        return {
          taken: `项目:<b>${ds.title}</b> 的<b>场景应用设置</b>`,
          dimensionTitles: used.map(r => tree[r])
        }
      }
    }
  }

  //check segment
  let dims0 = []
  let existInSg = await db.Segment.findAll({
    where: {
      company_id,
      druid_datasource_id: datasourceId
    },
    attributes: ['title', 'params']
  })
  let sgNames = existInSg
    .filter(ds => {
      let {
        dimension = {}
      } = ds.params
      let filtered = checkInStr(
        JSON.stringify(dimension),
        dimensionNames
      )
      dims0 = dims0.concat(filtered)
      return filtered.length
    })
    .map(s => s.title).join(',')
  if (sgNames) {
    if (ckeckAllUsed) {
      usedDimeNames = usedDimeNames.concat(dims0)
    } else {
      return {
        taken: `分群:<b>${sgNames}</b>`,
        dimensionTitles: _.uniq(dims0).map(r => tree[r])
      }
    }
  }
  if (ckeckAllUsed) {
    return { usedDimeNames: _.uniq(usedDimeNames) }
  }
  return false
}

export const getDatasourcesById = async (id) => {
  return await db.SugoDatasources.findById(id)
}

export async function getDataSourcesByIds(dataSourceIds) {
  return await db.SugoDatasources.findAll({
    where: {
      id: {$in: dataSourceIds}
    },
    raw: true
  })
}

const $checker = {

  processForAccessSDK: defineTypes({
    datasource_id: PropTypes.string.isRequired,
    company_id: PropTypes.string.isRequired
  }),
  // =============
  // 新增接口
  //
  findOne: defineTypes({
    id: PropTypes.string.isRequired
  }),
  update: defineTypes({
    id: PropTypes.string.isRequired,
    props: PropTypes.object.isRequired
  }),
  updateDataSourceSupervisor: defineTypes({
    datasource_id: PropTypes.string.isRequired,
    supervisorJson: PropTypes.object.isRequired
  }),
  createDataSource: defineTypes({
    dataSource: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    props: PropTypes.object.isRequired
  }),
  createDefaultSupervisor: defineTypes({
    datasource_id: PropTypes.string.isRequired,
    project_id: PropTypes.string.isRequired,
    company_id: PropTypes.string.isRequired
  }),
  runSupervisor: defineTypes({
    project: PropTypes.object.isRequired
  }),
  updateSupervisorJsonTimeColumn: defineTypes({
    datasource_id: PropTypes.string.isRequired,
    time_column: PropTypes.string.isRequired,
    format: PropTypes.string,
    granularity: PropTypes.object
  })
}

async function appendSDKDefaultMetrics(datasource, transaction) {
  const { id: dsId, created_by, company_id, user_ids, role_ids } = datasource
  let preCreateMetrics = SDK_DEFAULT_METRICS.map(m => {
    let metricId = generate()
    return {
      id: metricId,
      name: `${datasource.name}_${metricId}`,
      parentId: dsId,
      company_id,
      user_ids,
      role_ids,
      created_by,
      aggregate: '',
      pattern: 'none',
      type: 1,
      ...m
    }
  })

  return await db.SugoMeasures.bulkCreate(preCreateMetrics, { transaction })
}

async function appendSDKDefaultSlices(datasource, createdMetrics, transaction) {
  let metricTitleNameDict = _(createdMetrics).keyBy('title').mapValues(v => v.name).value()
  metricTitleNameDict['总记录数'] = `${datasource.name}_total`

  const { id: dsId, created_by, company_id } = datasource
  let preCreateSlices = SDK_DEFAULT_SLICES.map(s => {
    // 需要翻译 metrics/sortCol title 到实际的 name
    return {
      druid_datasource_id: dsId,
      created_by,
      company_id,
      ...s,
      params: immutateUpdates(s.params,
        'metrics', arr => (arr || []).map(mTitle => metricTitleNameDict[mTitle]),
        'dimensionExtraSettingDict', dict => _.mapValues(dict, v => {
          return v.sortCol && v.sortCol in metricTitleNameDict ? {...v, sortCol: metricTitleNameDict[v.sortCol]} : v
        }))
    }
  })

  return await db.Slices.bulkCreate(preCreateSlices, { transaction })
}

async function appendSDKDefaultDashboards(datasource, createdSlices, transaction) {
  let sliceTitleIdDict = _(createdSlices).keyBy('slice_name').mapValues(v => v.id).value()

  const { id: dsId, created_by, company_id } = datasource
  let preCreateDashboards = SDK_DEFAULT_DASHBOARDS.map(da => {
    return {
      datasource_id: dsId,
      created_by,
      company_id,
      ...da,
      position_json: da.position_json.map(pos => pos.i && pos.i in sliceTitleIdDict
        ? {...pos, i: sliceTitleIdDict[pos.i]}
        : pos
      )
    }
  })

  let createdDashboards = await db.Dashboards.bulkCreate(preCreateDashboards, { transaction })

  let mappings = _.flatMap(createdDashboards, da => da.position_json.map(p => ({ dashboard_id: da.id, slice_id: p.i })))

  return await db.DashboardSlices.bulkCreate(mappings, { transaction })
}

export async function getDataSourceByName(dsName) {
  return await db.SugoDatasources.findOne({where: {name: dsName}})
}

export default {
  getDruidDims,
  selectOneByAppidForNewAccess,
  deleteTopic,
  getDimensionsForSDK,
  getDimensionsVersion,
  getDimensionsForSupervisor,
  syncDimension,
  checkDimensionUsed,
  getDatasourcesById,
  getDataSourceByName,
  getDataSourcesByIds,

  /**
   * SDK接入时数据处理：
   * 1.新建sdk应用后新建sdk默认维度
   * 2.更新默认数据源场景设置参数
   * @param {String} datasource_id
   * @param {String} company_id
   * @return {Promise.<ResponseStruct<Boolean>>}
   */
  async processForAccessSDK (datasource_id, company_id){
    const checked = $checker.processForAccessSDK({ datasource_id, company_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    return db.client.transaction(async t => {
      const transaction = { transaction: t }
      const filter = { where: { id: datasource_id, company_id }, ...transaction }
      const datasource = await db.SugoDatasources.findOne(filter)

      if (datasource && _.isEmpty(datasource.params)) {
        //1.新建sdk应用后新建sdk默认维度
        const { created_by, company_id, user_ids, role_ids } = datasource
        const dimensions = SDK_DEFAULT_DIMENSIONS.map(dim => {
          // 维度类型：0=long; 1=float; 2=string; 3=dateString; 4=date
          const type = dim[2] === undefined ? 2 : dim[2] // default is string
          return {
            name: dim[0],
            title: dim[1],
            type,
            parentId: datasource.id,
            company_id,
            user_ids,
            role_ids,
            created_by
          }
        })

        //2.如果是sdk接入，则判断场景设置参数(params属性)，是否已设置，如果未设置，则设置默认项，以供漏斗、留存、用户分群等地方正常使用
        await db.SugoDimensions.bulkCreate(dimensions, { transaction: t })
        // https://github.com/Datafruit/sugo-analytics/issues/677

        if (config.createDefaultDashboardForSDKProject) {
          // 添加默认指标
          let createdMetrics = await appendSDKDefaultMetrics(datasource, t)
          let createdSlices = await appendSDKDefaultSlices(datasource, createdMetrics, t)
          await appendSDKDefaultDashboards(datasource, createdSlices, t)
        }

        const params = {
          commonMetric: ['distinct_id'],
          commonDimensions: ['event_name'],
          commonSession: 'session_id',
          isSDKProject: true,
          titleDimension: 'page_name' //params.titleDimension(用于路径分析) issue #2929
        }
        await db.SugoDatasources.update({ params }, filter)
      }
      return Response.ok(true)
    })
  }, 
  
  /**
  * TAG接入时数据处理：
  * 1.新建TAG应用后新建TAG默认维度
  * 2.更新默认数据源场景设置参数
  * @param {String} datasource_id
  * @param {String} company_id
  * @return {Promise.<ResponseStruct<Boolean>>}
  */
  async processForAccessTAG(datasource_id, company_id) {
    const checked = $checker.processForAccessSDK({ datasource_id, company_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    return db.client.transaction(async t => {
      const transaction = { transaction: t }
      const filter = { where: { id: datasource_id, company_id }, ...transaction }
      const datasource = await db.SugoDatasources.findOne(filter)
      let dimIds = []
      if (datasource && _.isEmpty(datasource.params)) {
        const { created_by, company_id, user_ids, role_ids } = datasource
        const dimensions = TAG_DEFAULT_DIMENSIONS.map(dim => {
          // 维度类型：0=long; 1=float; 2=string; 3=dateString; 4=date
          const type = dim[2] === undefined ? 2 : dim[2] // default is string
          const dimId = generate()
          dimIds.push(dimId)
          return {
            id:dimId,
            name: dim[0],
            title: dim[1],
            type,
            datasource_type: 'tag',
            parentId: datasource.id,
            company_id,
            user_ids,
            role_ids,
            created_by,
            is_druid_dimension: true,
            tag_extra: {
              is_base_prop: '1' // 默认为用户基础属性
            }
          }
        })

        //2.如果是sdk接入，则判断场景设置参数(params属性)，是否已设置，如果未设置，则设置默认项，以供漏斗、留存、用户分群等地方正常使用
        await db.SugoDimensions.bulkCreate(dimensions, { transaction: t })
        const treeId = generate()
        await db.SugoTagTypeTree.create({
          id: treeId,
          name: '用户基础属性',
          parent_id: '-1',
          order: 0,
          remark: '',
          company_id,
          datasource_id: datasource.id,
          created_by,
          type: 0,
          is_druid_dimension: true
        },
        { transaction: t }
        )
        const tagType = dimIds.map((p, i) => {
          return {
            id: generate(),
            created_by,
            type:_.get(TAG_DEFAULT_DIMENSIONS, `[${i}][0]`, ''),
            datasource_id: datasource.id,
            company_id,
            dimension_id: p,
            tag_tree_id: treeId
          }
        })
        await db.TagType.bulkCreate(tagType, { transaction: t })
        await datasource.update({
          params: {
            commonMetric: ['distinct_id'],
            commonMicroPicture: TAG_DEFAULT_DIMENSIONS.map(p => p[0])
          }
        })
      }
      return Response.ok(true)
    })
  },

  /**
   * 创建数据源
   * 1. 插入数据源记录
   * 2. 插入指标记录
   * @param ctx
   * @param {String} dataSource
   * @param {String} title
   * @param {Object} props
   * @param {Object} [transaction]
   * @param dsType
   * @return {Promise.<ResponseStruct<DataSourceModel>>}
   */
  async createDataSource (ctx, dataSource, title, props, transaction, dsType = DataSourceType.Tindex, tagDatasourceName = undefined) {

    // 检测数据源是否超过限制
    await checkLimit(ctx, 'datasource')

    const checked = $checker.createDataSource({
      dataSource,
      title,
      props
    })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { company_id, id: user_id, SugoRoles } = ctx.session.user

    // default role auth
    let role = await db.SugoRole.findOne({
      where: {
        company_id,
        type: 'built-in'
      }
    })

    transaction = transaction || await db.client.transaction()

    // 1. 插入数据源记录
    const dataSourceModel = {
      ...props,
      name: dataSource,
      title,
      status: 1,
      type: dsType,
      peak: 0,
      access_type: 'single', // default is single
      created_by: user_id,
      role_ids: [role.id].concat(SugoRoles.map(r => r.id)),
      user_ids: [],
      company_id,
      tag_datasource_name: tagDatasourceName
    }

    const [DataSourceIns] = await db.SugoDatasources.findOrCreate({
      where: {
        name: dataSource,
        company_id
      },
      defaults: dataSourceModel,
      transaction
    })

    // 2. 插入指标记录
    const name = dataSource + '_total'
    await db.SugoMeasures.findOrCreate({
      where: { name },
      defaults: {
        parentId: DataSourceIns.id,
        name,
        title: '总记录数',
        formula: '$main.count()',
        created_by: user_id,
        user_ids: dataSourceModel.user_ids,
        role_ids: dataSourceModel.role_ids,
        company_id
      },
      transaction
    })

    return Response.ok(DataSourceIns.get({ plain: true }))
  },

  /**
   * 使用id查询数据源表中的记录
   * @param {String} id
   * @return {Promise.<ResponseStruct<DataSourceModel|String>>}
   */
  async findOne (id) {
    const where = { id }
    const checked = $checker.findOne(where)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoDatasources.findOne({ where })
    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  },

  /**
   * 更新dataSource
   * @param {String} id
   * @param {Object} props
   * @return {Promise.<ResponseStruct<Object>>}
   */
  async update (id, props) {
    const checked = $checker.update({ id, props })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const [affectedCount] = await db.SugoDatasources.update(props, {
      where: {
        id
      }
    })

    return affectedCount > 0 ? Response.ok(props) : Response.fail('操作失败')
  },

  /**
   * 更新数据源时间列
   * @param {string} datasource_id
   * @param {string} time_column
   * @param {object} granularity
   * @param {string} format
   * @return {Promise.<*>}
   */
  async updateSupervisorJsonTimeColumn(datasource_id, time_column, granularity, format){
    const checked = $checker.updateSupervisorJsonTimeColumn({
      datasource_id,
      time_column,
      format,
      granularity
    })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { result: DataSource } = await this.findOne(datasource_id)

    if (!DataSource) {
      return Response.fail('未找到记录')
    }

    const supervisorJson = SupervisorService.generateSupervisorSpecWithTimeColumn(DataSource.name, time_column, granularity, format)
    const updateRes = await this.update(datasource_id, { supervisorJson })

    if (!updateRes.success) {
      return updateRes
    }

    const supervisorRes = await SupervisorService.createSupervisor(supervisorJson)
    return supervisorRes && supervisorRes.id ? Response.ok(datasource_id) : Response.fail(supervisorRes)
  },

  /**
   * 指定dimensions启动数据源，用于处理旧版本静态列的数据源
   * @param datasource_id
   * @param project_id
   * @param company_id
   * @return {Promise.<ResponseStruct<String>>}
   */
  async createDefaultSupervisor(datasource_id, project_id, company_id){
    const checked = $checker.createDefaultSupervisor({
      datasource_id,
      project_id,
      company_id
    })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { result: DataSource } = await this.findOne(datasource_id)
    const dimensions = await this.getDimensionsForSupervisor(project_id, company_id)
    const res = await SupervisorService.createDefaultSupervisor(DataSource.name, dimensions)

    return res && res.id ? Response.ok(datasource_id) : Response.fail(res)
  },

  /**
   * 使用数据源自身存储的supervisorJson启动、创建数据源
   * @param {String} datasource_id
   * @return {Promise.<ResponseStruct<String>>}
   */
  async createSupervisorBySupervisorJson(datasource_id, dataSource){
    if (!dataSource) {
      const { result: DataSource } = await this.findOne(datasource_id)
      dataSource = DataSource
    }
    const { supervisorJson } = dataSource
    if (_.isEmpty(supervisorJson)) {
      return Response.ok('激活数据源错误：没有配置参数')
    }
    const res = await SupervisorService.createSupervisor(supervisorJson)
    return res && res.id ? Response.ok(datasource_id) : Response.fail(res)
  },

  /**
   * 创建日志项目的 supervisor
   * @param {ProjectModel} project
   * @return {Promise.<ResponseStruct<String>>}
   */
  async createSupervisorForLogApp(project) {
    let app = await db.SugoDataAnalysis.findOne({
      where: { project_id: project.id, access_type: AccessDataOriginalType.Log },
      raw: true
    })
    let { grokPattern, timeDimensionName, dailyLogAmount } = app.params
    let typeDict = LogUploadSrv.grokTypeToDruidColumnType(LogUploadSrv.extractFieldType(grokPattern))
    let dimSpecs = _.keys(typeDict).map(name => {
      let type = typeDict[name]
      return type === DRUID_DIMENSION_MAP.date ? { name, type, format: 'millis' } : { name, type }
    })
    let taskSpec = SupervisorService.generateLuceneSupervisorSpec(project.datasource_name, {
      dimSpecs, timeDimensionName, dailyLogAmount
    })

    let res = await SupervisorService.createSupervisor(taskSpec)

    return res && res.id ? Response.ok(project.datasource_name) : Response.fail(res)
  },

  /**
   * 创建动态列 supervisor
   * @param {String} datasource_name
   * @param {Boolean} [withSDKDimensions=false]
   * @return {Promise.<ResponseStruct<String>>}
   */
  async createSupervisorForDynamicDimension(datasource_name, withSDKDimensions = false){
    const res = await SupervisorService.createSupervisorForDynamicDimension(datasource_name, void 0, withSDKDimensions)
    return res && res.id ? Response.ok(datasource_name) : Response.fail(res)
  },

  /**
   * 生成文件接入数据源 supervisorJson 并写入记录
   * @param {DataSourceModel} dataSource
   * @return {Promise.<ResponseStruct<Object>>}
   */
  async createSupervisorJsonForFileAccessor(dataSource){
    const { id, name, supervisorJson } = dataSource

    if (!_.isEmpty(supervisorJson)) {
      return Response.fail('已配置过supversior')
    }

    return await this.update(id, { supervisorJson: SupervisorService.generateDynamicSupervisorSpec(name) })
  },

  /**
   * 关闭数据源task
   * @param datasource_name
   * @return {Promise.<ResponseStruct>}
   */
  async shutdownSupervisor(datasource_name){
    const res = new Response()
    try {
      await SupervisorService.shutdownSupervisor(datasource_name)
    } catch (e) {
      // 如果task不存在，依然认为暂停成功
      // 捕获其他错误
      if (e.message.indexOf('does not exist') === -1) {
        res.message = e.message
      }
    }
    return res.serialize()
  },

  /**
   * 运行数据源的task
   * @param {ProjectModel} project
   * @return {Promise.<ResponseStruct>}
   */
  async runSupervisor(project){
    const checked = $checker.runSupervisor({ project })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const {
      datasource_id,
      datasource_name,
      company_id,
      from_datasource,
      id: project_id
    } = project

    // 从数据源转接过来的项目，使用原来的方式启动
    if (from_datasource === 1) {
      return await this.createDefaultSupervisor(datasource_id, project_id, company_id)
    }

    const { result: dataSource } = await this.findOne(datasource_id)
    const { supervisorJson } = dataSource

    // 如果是File接入类型项目，使用dataSource中记录的启动参数启动
    // if (project.access_type === AccessDataType.File && !_.isEmpty(supervisorJson)) {
    // modify: 如果存在supervisorJson字段，说明手动改了json，以这个优先启动
    if (!_.isEmpty(supervisorJson)) {
      return await this.createSupervisorBySupervisorJson(datasource_id, dataSource)
    }

    // 日志类型项目：定死维度，传入时间列和预估数据量
    if (project.access_type === AccessDataType.Log) {
      return await this.createSupervisorForLogApp(project)
    }

    // 其他的方式为动态列方式
    return this.createSupervisorForDynamicDimension(datasource_name)
  },
  //根据token 获取项目维度
  async getDimensionsByToken(token){
    const sql = `select dim.id, dim.name, dim.title, dim.type from sugo_dimensions dim
      left join sugo_projects pro on dim."parentId" = pro.datasource_id and dim.company_id = pro.company_id
      left join sugo_data_analysis ana on pro.id = ana.project_id
      where ana.id=:appid`
    let res = await db.client.query(sql, {
      replacements: {
        appid: token
      }
    })
    if (res && res.length > 0) {
      return res[0]
    } else {
      return null
    }
  },

  //获取页面分类
  async getCategory(token){
    const sql = 'select DISTINCT category  from  sugo_sdk_page_info_draft where  appid=:appid and category is not  NULL'
    let res = await db.client.query(sql, {
      replacements: {
        appid: token
      }
    })
    if (res && res.length > 0) {
      return res[0]
    } else {
      return null
    }
  }
}
