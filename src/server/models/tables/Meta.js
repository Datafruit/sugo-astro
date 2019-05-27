//db info by ZHAO Xudong @2016-10-27
//储存版本信息等数据库信息
import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const Meta = sequelize.define('Meta',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50)
      },
      value: {
        type: dataTypes.STRING(1000)
      },
      created_by_fk: {
        type: dataTypes.INTEGER
      }
    },
    {
      tableName: 'db_meta',
      timestamps: true,
      underscored: true
    }
  )
  return Meta
}
