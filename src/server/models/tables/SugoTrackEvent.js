/**
 * Created by fengxj on 11/2/16.
 */

/**
 * 表名  ： sugo_track_event
 * 实例名： TrackEvent
 * @description 已部署事件记录表
 * 从TrackEventDraftModel复制记录到该表
 * 并给每一个事件打上部署版本标记:event_bindings_version
 */

/**
 * @typedef {Object} TrackEventModel
 * @property {String} id
 * @property {String} appid - DataAnalysis 表id
 * @property {String} page - 事件所属页面
 * @property {String} event_path - 元素path
 * @property {String} similar_path - 同类元素path
 * @property {String} event_type - 事件类型
 * @property {String} event_name - 事件名称
 * @property {String} event_path_type - app埋点相关
 * @property {String} event_id - 事件id
 * @property {String} app_version - 部署所属app-version
 * @property {Blob} screenshot
 * @property {Number} control_event - app埋点相关
 * @property {String} delegate - app埋点相关
 * @property {Number} event_bindings_version - 当前部署版本
 * @property {String} code - 注入代码
 * @property {Boolean} advance - 是否开启高级功能
 * @property {Boolean} similar - 是否是同类元素
 * @property {Boolean} is_global - 是否是全局事件
 * @property {Array} tags - 标签
 * @property {String} screenshot_id - 图片ID
 * @property {String} created_on
 * @property {String} changed_on
 */

/**
 * 关联及引用定义
 * event_bindings_version 功能见 AppVersionModel 中的描述
 * @see {AppVersionModel}
 * @see {DataAnalysis}
 * @see {TrackEventDraftModel}
 */

import { generate } from 'shortid'
export default(sequelize, dataTypes) => {
  const TrackEvent = sequelize.define('TrackEvent', {
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
    event_path: {
      type: dataTypes.TEXT
    },
    similar_path: {
      type: dataTypes.TEXT
    },
    event_type: {
      type: dataTypes.STRING(30)
    },
    event_name: {
      type: dataTypes.STRING(255)
    },
    event_path_type: {
      type: dataTypes.STRING(20)
    },
    event_id: {
      type: dataTypes.STRING(36)
    },
    app_version: {
      type: dataTypes.STRING(30)
    },
    screenshot: {
      type: dataTypes.BLOB
    },
    control_event: {
      type: dataTypes.INTEGER
    },
    delegate: {
      type: dataTypes.STRING(255)
    },
    event_bindings_version: {
      type: dataTypes.INTEGER
    },
    code: {
      type: dataTypes.TEXT
    },
    advance: {
      type: dataTypes.BOOLEAN
    },
    similar: {
      type: dataTypes.BOOLEAN
    },
    is_global: {
      type: dataTypes.STRING(3)
    },
    tags: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    binds: {
      type:dataTypes.JSONB
    },
    cross_page: {
      type:dataTypes.BOOLEAN
    },
    screenshot_id: {
      type:dataTypes.STRING(50)
    },
    class_attr: {
      type: dataTypes.JSONB
    }
  }, {
    tableName: 'sugo_track_event',
    timestamps: true,
    underscored: true,
    createdAt: 'created_on',
    updatedAt: 'changed_on'
  })
  return TrackEvent
}
