/**
 * @Author sugo.io<asd>
 * @Date 17-11-24
 * @desc 存放用户真实id的redis表名
 */

/**
 * @typedef {object} RealUserTableModel
 * @property {string} id
 * @property {string} name
 * @property {string} company_id
 * @property {string} created_at
 * @property {string} updated_at
 */

import generate from 'shortid'
import validator from '../../../common/model-validator/RealUserTable'

// TODO 如果能保证接口都验证了,写入的时候可以不必验证
export default function (sequelize, dataTypes) {
  return sequelize.define('RealUserTable', {
    id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(32),
      allowNull: false,
      validate: function (value) {
        const message = validator.valid('name', value)
        if (message) {
          throw new Error(message)
        }
      }
    },
    company_id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      validate: function (value) {
        const message = validator.valid('company_id', value)
        if (message) {
          throw new Error(message)
        }
      }
    }
  }, {
    indexs: [{
      fields: ['name']
    }],
    tableName: 'sugo_real_user_table',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
