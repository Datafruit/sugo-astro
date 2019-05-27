/**
 * 表名  ： sugo_projects
 * 实例名： SugoProjects
 * @description 项目表定义与说明
 */

/**
 * Project表定义
 * @typedef {Object} ProjectModel
 * @property {String} id
 * @property {String} name - 项目名称，同一公司下的项目名称唯一
 * @property {String} datasource_id - 项目关联数据源表(DataSourceModel)的id
 * @property {String} datasource_name - 数据源名，冗余字段，可删除
 * @property {String} tag_datasource_name - 标签数据源名
 * @property {String} company_id - 项目所属公司名
 * @property {Number} status - 项目显示状态，用于业务判断，只能取ProjectStatus中定义的值
 * @property {Number} state - 项目运行状态，只能取ProjectState中定义的值
 * @property {String} type - 类型，用户创建为`user-created`, 系统创建为`built-in`
 * @property {Number} access_type - 接入类型
 * @property {Number} from_datasource - 是否从数据源导入
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 更新时间
 * @property {String} created_by - 由谁创建
 * @property {String} updated_by - 更新记录
 * @property {String} reference_tag_name - 标签引用表名称
 * @property {String} real_user_table    - 真实用户ID关联表
 * @property {JSONB} extra_params - 扩展属性
 */

/**
 * Project表关联及引用定义
 * @see {DataSourceModel} - datasource_id
 * @see {ProjectStatus} - status
 * @see {ProjectState} - state
 * @see {AccessDataType} - access_type
 * @see {RealUserTableModel} - real_user_table
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoProjects', {
    id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    datasource_id: {
      type: dataTypes.STRING,
      allowNull: true
    },
    datasource_name: {
      type: dataTypes.STRING,
      allowNull: true
    },
    tag_datasource_name: {
      type: dataTypes.STRING(50),
      allowNull: true,
      validate: {
        is: /^[A-Za-z][\w\-]{1,49}$/i // 可用字母、数字、点、下划线、$，但必须以字母开头，长度为4至50位
      },
      comment: '标签数据源名称'
    },
    company_id: {
      type: dataTypes.STRING,
      allowNull: true
    },
    status: {
      type: dataTypes.INTEGER,
      allowNull: true
    },
    state: {
      type: dataTypes.INTEGER
    },
    access_type: {
      type: dataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: dataTypes.STRING(50),
      defaultValue: 'user-created'
    },
    created_by: {
      type: dataTypes.STRING,
      allowNull: true
    },
    updated_by: {
      type: dataTypes.STRING,
      allowNull: true
    },
    from_datasource: {
      type: dataTypes.INTEGER
    },
    reference_tag_name: {
      type: dataTypes.STRING(50)
    },
    real_user_table: {
      type: dataTypes.STRING(32)
    },
    ignore_sync_dimension: {
      type: dataTypes.JSONB,
      defaultValue: {}
    },
    extra_params: {
      type: dataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    tableName: 'sugo_projects',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    associate: function (models) {
      models.SugoProjects.hasMany(models.SugoScheduleTaskExtraInfo, {foreignKey: 'project_id', onDelete: 'cascade', hooks: true})
      models.SugoProjects.hasMany(models.SugoUserTagUpdateTask, {foreignKey: 'project_id', onDelete: 'cascade', hooks: true})
      models.SugoProjects.hasMany(models.SugoChildProjects, {foreignKey: 'project_id', onDelete: 'cascade', hooks: true})
    }
  })
}
