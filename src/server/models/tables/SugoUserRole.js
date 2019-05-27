import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoUserRole = sequelize.define('SugoUserRole',
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
      role_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_role',
          key: 'id'
        }
      }

    },
    {
      tableName: 'sugo_user_role',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoUserRole.belongsTo(models.SugoUser, {foreignKey: 'user_id'})
        SugoUserRole.belongsTo(models.SugoRole, {foreignKey: 'role_id'})
      }
    }
  )
  return SugoUserRole
}
