/**
 * 表名  ： sugo_user
 * 实例名： SugoUser
 * @description 用户表
 */

/**
 * User表定义
 * @typedef {Object} UserModel
 * @property {string} id
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} username
 * @property {string} cellphone
 * @property {string} password
 * @property {boolean} active
 * @property {string} type
 * @property {string} email
 * @property {string} created_by_fk
 * @property {string} changed_by_fk
 * @property {string} reset_password
 * @property {string} email_validate
 * @property {string} company_id
 */

/**
 * User 表关联及引用度定义
 * @see {CompanyModel.id} - company_id
 */

import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoUser = sequelize.define('SugoUser',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      first_name: {
        type: dataTypes.STRING(200),
        validate: {
          len: [1, 200]
        }
      },
      last_name: {
        type: dataTypes.STRING(200)
      },
      username: {
        type: dataTypes.STRING(100)
      },
      cellphone: {
        type: dataTypes.STRING(24),
        validate: {
          is: /^1[0-9]{10}$/
        }
      },
      password: {
        type: dataTypes.STRING(100),
        validate: {
          len: [1, 100]
        }
      },
      active: {
        type: dataTypes.BOOLEAN,
        defaultValue: true
      },
      type: {
        type: dataTypes.ENUM('built-in', 'user-created'),
        comment: '用户类型，build-in用户组不可删除, 用户建立的用户组为user-created',
        defaultValue: 'user-created'
      },
      email: {
        type: dataTypes.STRING(200),
        validate: {
          isEmail: true
        }
      },
      created_by_fk: {
        type: dataTypes.STRING(32)
      },
      changed_by_fk: {
        type: dataTypes.STRING(32)
      },
      reset_password: {
        type: dataTypes.STRING(32),
        comment: 'reset_password表id， 为空则无需重置密码',
        defaultValue: ''
      },
      email_validate: {
        type: dataTypes.STRING(32),
        comment: 'email_validate表id， 为空则已经验证邮件',
        defaultValue: ''
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_user',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoUser.belongsToMany(models.SugoRole, {through: models.SugoUserRole, foreignKey: 'user_id'})
        SugoUser.hasMany(models.SugoUserRole, {foreignKey: 'user_id'})
      }
    }
  )
  return SugoUser
}
