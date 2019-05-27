/**
 * @typedef {object} SceneDataModel
 * @property {string} id
 * @property {string} project_id
 * @property {number} type
 * @property {object} params
 * @property {string} create_by
 * @property {string} updated_by
 * @property {string} create_at
 * @property {string} update_at
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoSceneData = sequelize.define('SugoSceneData',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      project_id: {
        type: dataTypes.STRING(32)
      },
      type: {
        type: dataTypes.INTEGER
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_scene_data',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoSceneData.belongsTo(models.SugoProjects, { foreignKey: 'project_id' })
      }
    }
  )
  return SugoSceneData
}
