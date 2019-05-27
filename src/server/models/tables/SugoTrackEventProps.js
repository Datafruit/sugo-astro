/**
 * Created by fengxj on 11/2/16.
 */

/**
 * 表名  ： sugo_track_event_props
 * 实例名： TrackEventProps
 * @description 埋点事件自定义属性
 */

/**
 * @typedef {Object} TrackEventDraftModel
 * @property {String} id
 * @property {String} appid - DataAnalysis 表id
 * @property {String} extend_value - 自定义值
 * @property {String} event_id - 事件id
 * @property {String} datasource_name - 数据源名称
 * @property {String} app_version - app版本
 * @property {String} created_on
 * @property {String} changed_on
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoTrackEventProps = sequelize.define('TrackEventProps', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    appid: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_data_analysis',
        key: 'id'
      }
    },
    extend_value: {
      type: dataTypes.TEXT
    },
    datasource_name: {
      type: dataTypes.STRING(50)
    },
    event_id: {
      type: dataTypes.STRING(36)
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    app_version: {
      type: dataTypes.STRING(30)
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    }
  }, {
      tableName: 'sugo_track_event_props',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoTrackEventProps.belongsTo(models.SugoDataAnalysis, { foreignKey: 'appid' })
      }
    })
  return SugoTrackEventProps
}
