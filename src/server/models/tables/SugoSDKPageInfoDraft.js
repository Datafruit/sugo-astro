/**
 * Created by fengxj on 1/19/17.
 */

/**
 * 表名  ： sugo_sdk_page_info_draft
 * 实例名： SugoSDKPageInfoDraft
 * @description 埋点页面信息草稿表
 */

/**
 * SDKPageInfoDraft 表定义
 * @typedef {Object} SDKPageInfoDraftModel
 * @property {string} id
 * @property {string} appid
 * @property {string} page
 * @property {string} page_name
 * @property {string} app_version
 * @property {string} code
 * @property {boolean} similar
 * @property {string} category
 * @property {string} created_on
 * @property {string} changed_on
 */

/**
 * User 表关联及引用度定义
 * @see {DataAnalysisModel.id} - appid
 */

import { generate } from 'shortid'
export default(sequelize, dataTypes) => {
  const SugoSDKPageInfoDraft = sequelize.define('SugoSDKPageInfoDraft', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    appid: {
      type: dataTypes.STRING(32)
    },
    page: {
      type: dataTypes.STRING(255)
    },
    page_name: {
      type: dataTypes.STRING(255)
    },
    app_version: {
      type: dataTypes.STRING(30)
    },
    code: {
      type: dataTypes.TEXT
    },
    similar: {
      type: dataTypes.BOOLEAN
    },
    category: {
      type: dataTypes.TEXT
    },
    is_submit_point: {
      type: dataTypes.BOOLEAN
    }
  }, {
    tableName: 'sugo_sdk_page_info_draft',
    timestamps: true,
    underscored: true,
    createdAt: 'created_on',
    updatedAt: 'changed_on'
  })
  return SugoSDKPageInfoDraft
}
