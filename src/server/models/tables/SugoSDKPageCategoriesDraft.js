/**
 * @Author sugo.io<asd>
 * @Date 17-8-16
 */

/**
 * @typedef {SDKPageCategoriesModel} SDKPageCategoriesDraftModel
 */
import { generate } from 'shortid'

export default function (sequelize, dataTypes) {
  return sequelize.define('SDKPageCategoriesDraft', {
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
    regulation: {
      type: dataTypes.STRING(256),
      allowNull: false
    }
  }, {
    tableName: 'sugo_sdk_page_categories_draft',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  })
}
