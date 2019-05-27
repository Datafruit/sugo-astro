
import db from '../models'
import _ from 'lodash'
import dataSourceService from '../services/sugo-datasource.service'

async function updateCustomOrder({ dataSourceId, myCustomOrders, dataType, userId, company_id }) {
  // let { dataSourceId } = ctx.params
  // let myCustomOrders = ctx.q
  // let { dataType } = myCustomOrders

  // let { id: userId, company_id } = ctx.session.user
  let reqUseId = userId
  let isGlobal = dataType === 'global'
  isGlobal && (reqUseId = null)
  _.omit(myCustomOrders, ['dataType'])

  //所有已经应用的维度不允许隐藏
  if (isGlobal) {
    let dimensions_order = _.get(myCustomOrders, 'dimensions_order') || []
    let hideDimensionNames = dimensions_order.filter(d => {
      return _.startsWith(d, 'hide:')
    }).map(d => d.replace(/^hide\:/, ''))

    let used = await dataSourceService.checkDimensionUsed({
      datasourceId: dataSourceId,
      company_id,
      dimensionNames: hideDimensionNames
    })

    if (used) {
      let { taken, dimensionTitles } = used
      return {
        success: false,
        message: `要隐藏的维度:<b class="color-red">${dimensionTitles.join(', ')}</b>已经被 ${taken} 使用，不能隐藏`
      }
    }
  }

  let defaults = { ...myCustomOrders, created_by: userId }
  let findOrCreated = await db.SugoCustomOrders.findOrCreate({
    where: {
      druid_datasource_id: dataSourceId,
      user_id: reqUseId,
      company_id
    },
    defaults: defaults
  })
  let [dbInst, created] = findOrCreated
  if (!created) {
    dbInst.changed_by = userId
    await dbInst.update({
      ...myCustomOrders,
      updated_by: userId
    })
  }
  return { success: true }
}

async function getCustomOrder({ dataSourceId, userId, company_id, dataType }) {
  dataType === 'global' && (userId = null)
  let myOrders = await db.SugoCustomOrders.findOne({
    where: {
      druid_datasource_id: dataSourceId,
      user_id: userId,
      company_id
    }
  })
  return myOrders
}

/**
 * @description 更新或创建指定模块排序配置
 * @param {any} {module_id, module_orders, user_id, company_id }
 * @returns 
 */
async function updateCustomModuleOrder({module_id, module_orders, user_id, company_id }) {
  const defaults = { module_orders, created_by: user_id }
  let findOrCreated = await db.SugoCustomOrders.findOrCreate({
    where: {
      module_id,
      company_id
    },
    defaults
  })
  let [dbInst, created] = findOrCreated
  if (!created) {
    dbInst.changed_by = user_id
    await dbInst.update({
      module_orders,
      updated_by: user_id
    })
  }
  return { success: true }
}

/**
 * @description 获取指定模块排序配置
 * @param {any} { module_id, company_id }
 * @returns
 */
async function getCustomModuleOrder({ module_id, company_id }) {
  // dataType === 'global' && (user_id = null)
  const myOrders = await db.SugoCustomOrders.findOne({
    where: {
      module_id,
      // user_id,
      company_id
    },
    raw: true
  })
  return myOrders
}

export default {
  updateCustomOrder,
  getCustomOrder,
  getCustomModuleOrder,
  updateCustomModuleOrder
}
