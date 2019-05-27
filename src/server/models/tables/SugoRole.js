import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRole = sequelize.define('SugoRole',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(200),
        validate: {
          len: [1, 200],
          notEmpty: true
        }
      },
      description: {
        type: dataTypes.STRING(500)
      },
      type: {
        type: dataTypes.ENUM('built-in', 'user-created'),
        comment: '用户组类型，build-in用户组不可删除, 用户建立的用户组为user-created',
        defaultValue: 'user-created'
      },
      created_by_fk: {
        type: dataTypes.STRING(32)
      },
      changed_by_fk: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_role',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRole.belongsToMany(models.SugoUser, {through: models.SugoUserRole, foreignKey: 'role_id'})
        SugoRole.hasMany(models.SugoUserRole, {foreignKey: 'role_id'})
        SugoRole.hasMany(models.SugoRoleRoute, {foreignKey: 'role_id'})
      }
    }
  )
  return SugoRole
}
