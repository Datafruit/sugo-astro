/**
 * @Author sugo.io<asd>
 * @Date 17-8-16
 */

/**
 * @typedef {Object} SDKPageCategoriesModel
 * @property {String} id
 * @property {String} name - 分类名称
 * @property {String} appid - 所属分析表
 * @property {String} app_version
 * @property {String} regulation - 分类规则
 * @property {String} created_at
 * @property {String} changed_at
 */

import { generate } from 'shortid'

export default function (sequelize, dataTypes) {
  return sequelize.define('SDKPageCategories', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(32)
    },
    appid: {
      type: dataTypes.STRING(32)
    },
    app_version: {
      type: dataTypes.STRING(32)
    },
    event_bindings_version: {
      type: dataTypes.INTEGER
    },
    regulation: {
      type: dataTypes.STRING(256),
      allowNull: false
    }
  }, {
    tableName: 'sugo_sdk_page_categories',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  })
}
