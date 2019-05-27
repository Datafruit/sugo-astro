import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoFirstStartTime = sequelize.define('SugoFirstStartTime',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      app_id: {
        type: dataTypes.STRING(50)
      },
      app_type: {
        type: dataTypes.STRING(20)
      },
      device_id: {
        type: dataTypes.STRING(100)
      },
      app_version: {
        type: dataTypes.STRING(50)
      },
      channel: {
        type: dataTypes.STRING(50)
      },
      start_time: {
        type: dataTypes.DATE
      }
    },
    {
      tableName: 'sugo_first_start_time',
      timestamps: false,
      underscored: true
    }
  )
  return SugoFirstStartTime
}
