import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoGlobalConfig = sequelize.define('SugoGlobalConfig',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      key: {
        type: dataTypes.STRING(50),
        allowNull: false
      },
      value: {
        type: dataTypes.STRING(200),
        allowNull: false
      }
    },
    {
      tableName: 'sugo_global_config',
      freezeTableName: true,
      timestamps: true,
      underscored: true
    }
  )
  return SugoGlobalConfig
}
