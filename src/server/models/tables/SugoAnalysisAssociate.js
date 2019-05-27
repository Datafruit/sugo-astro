import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoAnalysisAssociate', {
    id: {
      type: dataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    analysis_id: {
      type: dataTypes.STRING,
      allowNull: true,
      references: {
        model: 'sugo_data_analysis',
        key: 'id'
      }
    },
    main_dimension: {
      type: dataTypes.STRING,
      allowNull: true
    },
    associate_dimension: {
      type: dataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'sugo_analysis_associate',
    freezeTableName: true,
    underscored: true,
    timestamps: false
  })
}
