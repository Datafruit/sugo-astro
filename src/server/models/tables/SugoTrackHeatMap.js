
import { generate } from 'shortid'
export default(sequelize, dataTypes) => {
  const TrackHeatMap = sequelize.define('TrackHeatMap', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    appid: {
      type: dataTypes.STRING(32),
      // references: {
      //   model: 'sugo_data_analysis',
      //   key: 'id'
      // }
    },
    name: {
      type: dataTypes.TEXT
    },
    page_path: {
      type: dataTypes.STRING(225)
    },
    screenshot_id: {
      type: dataTypes.STRING(50),
      references: {
        model: 'sugo_track_event_screenshot',
        key: 'id'
      }
    },
    events: {
      type: dataTypes.JSONB
    },
    event_groups: {
      type: dataTypes.JSONB
    },
    points: {
      type: dataTypes.JSONB
    },
    params: {
      type: dataTypes.JSONB
    },
    created_by: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    updated_by: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    app_version: {
      type: dataTypes.STRING(32)
    },
    app_type: {
      type: dataTypes.STRING(32)
    },
    project_id : {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_projects',
        key: 'id'
      }
    }
  }, {
    tableName: 'sugo_track_heat_map',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      // TrackHeatMap.belongsTo(models.SugoDataAnalysis, { foreignKey: 'appid' })
      TrackHeatMap.belongsTo(models.TrackEventScreenshot, { foreignKey: 'screenshot_id' })
      TrackHeatMap.belongsTo(models.SugoProjects, { foreignKey: 'project_id' })
    }
  })
  return TrackHeatMap
}
