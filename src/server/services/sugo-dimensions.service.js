import db from '../models'
import { SugoDruidExternal, AttributeInfo } from 'sugo-plywood'
import {DruidNativeType, MultipleValuesTypeOffset} from '../../common/druid-column-type'
import businessDbSettingService from './business-db-setting.service'
import _ from 'lodash'
import conf from '../config'
import { generate } from 'shortid'
import fetch from '../utils/fetch-kit'
import sugoDatasourceService from './sugo-datasource.service'
import UindexDimensionService from '../services/uindex-dimension.service'
import SugoHqlService from '../services/sugo-tag-hql.service'
import { QUERY_ENGINE } from '../../common/constants'
import { recurFindFilter } from '../../common/druid-query-utils'

const druidLookupUrl = conf.druid.lookupHost
const uindexLookupUrl = conf.uindex.lookupHost
const sqlKeySplit = {
  postgresql: ['"', '"']
}

export async function getDimensionsByIds(dimensionIds) {
  return await db.SugoDimensions.findAll({
    where: {
      id: {$in: dimensionIds}
    },
    raw: true
  })
}

export async function getDimensionsByNames(dsId, names) {
  return await db.SugoDimensions.findAll({
    where: {
      parentId: dsId,
      name: {$in: names}
    },
    raw: true
  })
}

/**
 * 维度管理接口服务层
 */
export default {
  
  // 根据数据源名称获取所以的维度名称和类型
  getDimensionsForPlywood: async (dataSourceName, queryEngine) => {
    let queryField = 'name'
    if (queryEngine === QUERY_ENGINE.UINDEX) { // 如果是用户画像，数据源名称为tag_datasource_name字段
      queryField = 'tag_datasource_name'
    }
    // 根据数据源名称查询所有的去重维度名称和类型
    const queryDimSQL = `SELECT DISTINCT dim."name", dim."type" FROM sugo_dimensions dim, sugo_datasources ds WHERE dim."parentId"=ds."id" AND ds."${queryField}"=:dataSourceName`
    const timeAttribute = '__time'
    let foundTime = false
    let res = await db.client.query(queryDimSQL, {
      replacements: { dataSourceName }
    })
    let queryResult = res[0]
    if (queryResult.total <= 0) {
      return null
    }
    let attributes = []
    queryResult.forEach(dim => {
      const columnData = {
        ...dim,
        size: 0,
        cardinality: 0,
        minValue: 0,
        maxValue: 0,
        errorMessage: null
      }
      const name = dim.name
      const hasMultipleValues = MultipleValuesTypeOffset <= dim.type
      const nativeType = DruidNativeType[dim.type]

      if (name === SugoDruidExternal.TIME_ATTRIBUTE) {
        attributes.unshift(new AttributeInfo({
          name: timeAttribute,
          type: 'TIME',
          nativeType: '__time',
          hasMultipleValues,
          cardinality: columnData.cardinality,
          range: SugoDruidExternal.columnMetadataToRange(columnData)
        }))
        foundTime = true

      } else {
        // if (name === timeAttribute) continue; // Ignore dimensions and metrics that clash with the timeAttribute name
        switch (nativeType) {
          case 'FLOAT':
          case 'LONG':
          case 'INT':
          case 'DOUBLE':
          case 'BIGDECIMAL':
            attributes.push(new AttributeInfo({
              name,
              type: hasMultipleValues ? 'SET/NUMBER' : 'NUMBER',
              nativeType,
              hasMultipleValues,
              // maker: SugoDruidExternal.generateMaker(aggregators[name]),
              cardinality: columnData.cardinality,
              range: SugoDruidExternal.columnMetadataToRange(columnData)
            }))
            break

          case 'STRING':
          case 'TEXT': // support text add by WuQic at 2017-06-13
            attributes.push(new AttributeInfo({
              name,
              type: hasMultipleValues ? 'SET/STRING' : 'STRING',
              nativeType,
              hasMultipleValues,
              cardinality: columnData.cardinality,
              range: SugoDruidExternal.columnMetadataToRange(columnData)
            }))
            break

          case 'DATE':
            attributes.push(new AttributeInfo({
              name,
              type: 'TIME',
              nativeType,
              hasMultipleValues
            }))
            break

          case 'hyperUnique':
          case 'approximateHistogram':
          case 'thetaSketch':
            attributes.push(new AttributeInfo({
              name,
              type: 'NULL',
              nativeType,
              unsplitable: true,
              hasMultipleValues
            }))
            break

          default:
            attributes.push(new AttributeInfo({
              name,
              type: 'NULL',
              nativeType,
              hasMultipleValues
            }))
            break
        }
      }
    })
    // 如果维度表没有则自动补上__time 维度
    if (!foundTime) {
      attributes.unshift(new AttributeInfo({
        name: timeAttribute,
        type: 'TIME',
        nativeType: '__time'
      }))
    }
    return attributes
  },
  /**
 * 检测sql语句
 * 
 * @param {any} params 
 * @returns 
 */
  async checkJdbcSql(params) {
    return await businessDbSettingService.checkSql({ ...params, encrypted: true })
  },

  /**
   * 创建lookUpJdbc
   * 
   * @param {any} name  维度名称
   * @param {any} params 维度params
   * @param {any} sql 关联sql
   * @param {any} settingInfo 数据便连接信息
   * @returns
   */
  async lookup(name, params, sql, settingInfo, isUindex) {
    let result = {
      success: false,
      message: ''
    }
    let url = `${isUindex ? uindexLookupUrl : druidLookupUrl}/druid/coordinator/v1/lookups`
    let version = generate()
    let body = {
      type: 'cachingLookup',
      version: version,
      dataLoader: {
        type: 'jdbc',
        connectorConfig: {
          connectURI: `jdbc:${settingInfo.db_type}://${settingInfo.db_jdbc}?useSSL=false`,
          user: settingInfo.db_user,
          encrypted: true,
          password: settingInfo.db_pwd
        },
        query: sql,
        groupId: name,
        loadPeriod: `PT${params.load_period}H`,
        rowLimit: params.row_limit
      }
    }

    //初始化
    await fetch.post(url, {}, {
      handleResponse: (res) => res
    }).then(r => r && r.status)
    //real request
    await fetch.post(
      `${url}/__default/${name}`,
      body,
      {
        handleResponse: () => {
          result = { success: true }
        }
      }
    )
    return result
  },

  /**
   * 获取业务表信息 检测语句
   *
   * @param {any} params
   * @returns
   */
  async getBusinessInfo(params) {
    if (!params.table_id) return { success: false, message: '业务表ID不存在' }
    let settingInfo = await businessDbSettingService.findOne({ id: params.table_id })
    if (!settingInfo) return { success: false, message: '业务表信息不存在' }
    let [beg, end] = sqlKeySplit[settingInfo.db_type] || ['', '']
    let defaultValue =  _.get(params,'table_field_default_value','0')
    let sql = `SELECT ${beg + settingInfo.db_key + end} AS ${beg + settingInfo.db_key + end},
              CASE WHEN ${beg + params.table_field + end} IS NULL THEN '${defaultValue}' ELSE ${beg + params.table_field + end} END AS ${beg + params.table_field + end}
              FROM ${settingInfo.table_name}  WHERE ${beg + settingInfo.db_key + end} IS NOT NULL AND ${beg + settingInfo.db_key + end} <> ''`
    let res = await this.checkJdbcSql({ ..._.pick(settingInfo, ['db_type', 'db_jdbc', 'db_user', 'db_pwd']), sql })
    if (!res.success) return { success: false, message: `生成JdbcSql语句错误:[${res.message}]` }
    return { success: true, data: { sql, settingInfo } }
  },

  /**
   * 业务表修改后同步lookupjdbc
   *
   * @param {any} name 维度名
   * @param {any} params 维度params
   * @returns 
   */
  async updateDimensionLookUpJdbc(name, params, isUindex) {
    let resInfo = await this.getBusinessInfo(params)
    if (!resInfo.success) return resInfo
    let res = await this.lookup(name, params, resInfo.data.sql, resInfo.data.settingInfo, isUindex)
    if (!res.success) return { success: false, message: '更新LookUpJdbc失败' }
    return { success: true }
  },

  /**
   * 删除维度
   * 
   * @param {string} datasourceId id
   * @param {string} datasourceName name
   * @param {Arrary<string>} names 维度名集合
   * @param {string} company_id
   * @param {bool} isAutoDelete 自动删除 Ture:排除引用过的维度 执行删除, false:提示被引用
   * @param {bool} outerTransaction 事物
   * @returns {object}
   */
  async deleteDimension(datasourceId, datasourceName, names, company_id, isAutoDelete = false, outerTransaction = undefined) {
    //检测引用
    let used = await sugoDatasourceService.checkDimensionUsed({
      datasourceId,
      company_id,
      dimensionNames: names,
      ckeckAllUsed: isAutoDelete
    })
    // if (used) {
    //   let { taken, dimensionTitles, usedDimeNames } = used
    //   if (isAutoDelete) {
    //     names = _.difference(names, usedDimeNames)
    //     if (!names.length) return
    //   } else {
    //     return {
    //       success: false,
    //       message: `维度:<b class="color-red">${dimensionTitles.join(',')}</b> 已经被 ${taken} 使用，不能删除`
    //     }
    //   }
    // }

    let models = await db.SugoDimensions.findAll({
      where: {
        name: {
          $in: names
        },
        parentId: datasourceId,
        company_id
      }
    })

    let isUindex = (_.get(models, '[0].datasource_type') || '').includes('tag')
    if (isUindex) {
      if (!isAutoDelete) {
        // 要确认标签没有被hql语句关联。若有关联需要先在hql管理中去掉所有关联。
        const count = await SugoHqlService.getInstance().getDBInstance().count({
          where: {
            tags:  {
              $or: models.map(r => {
                return {
                  $contains: r.id
                }
              })
            }
          }
        })
        if (count > 0) {
          throw new Error(`操作失败标签体系管理【${models.map(d => d.title || d.name).join('、')}】被hql语句关联使用，请先在HQL管理中去掉所有关联`)
        }
        //确认标签是否被组合标签使用
        let arr = await db.TagGroup.findAll({
          where: {
            datasource_id: datasourceId,
            params: {
              filters: { $like: `%${names}%` }
            },
            company_id
          }
        })
        if(!_.isEmpty(arr)){
          throw new Error('此标签正在被组合标签使用，不能删除')
        }

      
        let res1 = await db.Segment.findAll({
          where: {
            datasource_name: datasourceName,
            druid_datasource_id: datasourceId
          },
          raw: true
        })
        let filterName = names[0]
        let canNotDelUgs = res1.filter(ug => recurFindFilter(ug.params.tagFilters, flt => flt.col === filterName))
        if(!_.isEmpty(canNotDelUgs)){
          throw new Error('此标签正在被用户分群使用，不能删除')
        }
      }
      try {
        let proj = await db.SugoProjects.findOne({
          where: {
            datasource_id: datasourceId
          }
        })
        await UindexDimensionService.delDimension({
          datasource_name: proj.tag_datasource_name,
          names: models.map(d => d.name)
        })
      } catch(e) {
        console.log(e)
        throw new Error('error when delete uindex dimension from druid')
      }
    }
    const proj = await db.SugoProjects.findOne({
      where: {
        datasource_id: datasourceId
      }
    })
    await db.client.transaction(async t => {
      let transaction = outerTransaction ? outerTransaction : t

      //删除标签字典表相关内容
      if (isUindex) {
        // modify by WuQic 2019-01-15 删除标签子标签记录
        await db.SugoTagDictionary.destroy({
          where: {
            name: {
              $in: models.map(d => d.name)
            },
            company_id,
            project_id: proj.id,
            tag_datasource_name: datasourceName
          },
          transaction
        })
      }

      // 删除tagType表 记录
      await db.TagType.destroy({
        where: {
          dimension_id: {
            $in: models.map(p => p.id)
          },
          datasource_id: datasourceId,
          company_id
        },
        transaction
      })

      //删除业务表lookup
      models.forEach(async p => {
        let t = _.get(p, 'params.type')
        if (t === 'business') {
          let url = `${druidLookupUrl}/druid/coordinator/v1/lookups/__default/${p.id}`
          await fetch.delete(url)
        }
      })

      // 记录需要排除同步的druid
      const deleteDruidDimension = models.filter(p => p.is_druid_dimension).map(p => p.name)
      if (deleteDruidDimension.length) {
        if (proj) {
          await db.SugoProjects.update(
            {
              ignore_sync_dimension: _.union(proj.ignore_sync_dimension || [], deleteDruidDimension)
            },
            {
              where: { id: proj.id },
              transaction
            }
          )
        }
      }
      // 删除维度
      await db.SugoDimensions.destroy({
        where: {
          name: {
            $in: names
          },
          parentId: datasourceId,
          company_id
        },
        transaction
      })
    })
    return { success: true }
  },
  
  getDimensionsByIds
}
