/**
 * Created by fengxj on 11/22/16.
 */

/**
 * 表名  ： sugo_app_version
 * 实例名： AppVersion
 * @description
 */

/**
 * @typedef {Object} AppVersionModel
 * @property {String} id
 * @property {String} appid - 与 DataAnalysis 表关联
 * @property {String} app_version - 由用户输入
 * @property {Number} event_bindings_version - 部署事件版本关联
 * @property {Number} status - 启动或禁用该版本 0 | 1
 * @property {String} last_deployed_on - 最后一次部署时间
 * @property {String} created_on
 * @property {String} changed_on
 */

/**
 * 关联及引用
 * @see {DataAnalysis} - appid
 *
 * @description event_bindings_version
 * 在部署事件的时候，会给每一个部署的事件打上一个版本号(见TrackEventModel)。
 * 此时，可以用版本号来管理部署的事件。
 * 这样用户可以在已部署的事件中选择对应的版本事件，使其生效，其他事件失效。
 */

import { generate } from 'shortid'
import { APP_VERSION_STATUS } from '../../../common/constants'

export default(sequelize, dataTypes) => {
  const AppVersion = sequelize.define('AppVersion', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    appid: {
      type: dataTypes.STRING(32)
    },
    app_version: {
      type: dataTypes.STRING(30),
      defaultValue: APP_VERSION_STATUS.Active
    },
    event_bindings_version: {
      type: dataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: dataTypes.INTEGER,
      defaultValue: 1,
      comment: '启动或禁用该版本，0=禁用；1=启用；默认启用'
    },
    last_deployed_on: {
      type: dataTypes.DATE
    }
  }, {
    tableName: 'sugo_app_version',
    timestamps: true,
    underscored: true,
    createdAt: 'created_on',
    updatedAt: 'changed_on',
    associate: function (models) {
      AppVersion.belongsTo(models.SugoDataAnalysis, { foreignKey: 'appid' })
    }
  })
  return AppVersion
}
