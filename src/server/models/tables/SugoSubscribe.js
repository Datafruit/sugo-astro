import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoSubscribe = sequelize.define('SugoSubscribe',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      user_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      dashboard_id: {
        type: dataTypes.STRING(32),
        allowNull: true,
        references: {
          model: 'dashboards',
          key: 'id'
        }
      },
      slice_id: {
        type: dataTypes.STRING(32),
        allowNull: true,
        references: {
          model: 'slices',
          key: 'id'
        }
      },
      gallery_id: {
        type: dataTypes.STRING(32),
        allowNull: true,
        references: {
          model: 'sugo_gallery',
          key: 'id'
        }
      }
    },
    {
      tableName: 'sugo_subscribe',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoSubscribe.belongsTo(models.SugoUser)
        SugoSubscribe.belongsTo(models.Slices, { foreignKey: { allowNull: true } })
        SugoSubscribe.belongsTo(models.Dashboards, { foreignKey: { allowNull: true } })
        SugoSubscribe.belongsTo(models.SugoGallery, { foreignKey: 'gallery_id' })
      }
    }
  )
  return SugoSubscribe
}
