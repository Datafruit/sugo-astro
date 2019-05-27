import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoCustomOrders = sequelize.define('SugoCustomOrders',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      druid_datasource_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      user_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      dimensions_order: {
        type: dataTypes.JSONB,
        comment: '维度顺序',
        defaultValue: []
      },
      metrics_order: {
        type: dataTypes.JSONB,
        comment: '指标顺序',
        defaultValue: []
      },
      tags_order: {
        type: dataTypes.JSONB,
        comment: '标签顺序',
        defaultValue: []
      },
      module_id: {
        type: dataTypes.STRING(100),
        unique: true,
        allowNull: true,
        comment: '模块ID（唯一静态常量）'
      },
      module_orders: {
        type: dataTypes.JSONB,
        comment: '指标顺序',
        defaultValue: []
      }
    },
    {
      tableName: 'sugo_custom_orders',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoCustomOrders.belongsTo(models.SugoUser, {foreignKey: 'user_id'})
        SugoCustomOrders.belongsTo(models.SugoDatasources, {foreignKey: 'druid_datasource_id'})
      }
    }
  )
  return SugoCustomOrders
}
