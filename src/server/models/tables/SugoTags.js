/* jshint indent: 1 */

import {TagTypeEnum} from 'common/constants'

export default (sequelize, DataTypes) => {
  return sequelize.define('SugoTags', {
    id: {
      type: DataTypes.STRING(32),
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(32),
      validate: {
        is: /^\s*(\S+)\s*$/ // 不能包含空格
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.keys(TagTypeEnum)),
      allowNull: false
    },
    project_id: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    updated_by: {
      type: DataTypes.STRING(32),
      allowNull: true
    }
  }, {
    tableName: 'sugo_tags',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
