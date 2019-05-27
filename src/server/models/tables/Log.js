import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const Log = sequelize.define('Log',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      company_name: {
        type: dataTypes.STRING(32)
      },
      user_id: {
        type: dataTypes.STRING(32)
      },
      username: {
        type: dataTypes.STRING(100)
      },
      path: {
        type: dataTypes.STRING(100)
      },
      ip: {
        type: dataTypes.STRING(500)
      },
      method: {
        type: dataTypes.STRING(6)
      },
      body: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      status: {
        type: dataTypes.INTEGER
      }
    },
    {
      tableName: 'sugo_log',
      timestamps: true,
      underscored: true
    }
  )
  return Log
}
