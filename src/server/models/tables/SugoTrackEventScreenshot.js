import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const TrackEventScreenshot = sequelize.define('TrackEventScreenshot',
    {
      id: {
        type: dataTypes.STRING(50),
        primaryKey: true,
        defaultValue: generate
      },
      screenshot: {
        type: dataTypes.BLOB
      }
    },
    {
      tableName: 'sugo_track_event_screenshot',
      timestamps: false,
      underscored: true
    }
  )
  return TrackEventScreenshot
}
