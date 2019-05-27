import Sequelize from 'sequelize'
import config from '../config'

// 兼容旧版本调用方式
const { Aliases: operatorsAliases } = Sequelize.Op

const model = config.db
let logging = !!model.verbase || config.site.env !== 'production'
if (model.verbase === false) {
  logging = false
}
const options = {
  dialect: model.dialect,
  host: model.host,
  port: model.port,
  pool: model.pool,
  define: {
    charset: 'utf8',
    timestamps: false, // true by default
    freezeTableName: true
  },
  logging: logging ? console.log : false,
  operatorsAliases
}

const sequelize = new Sequelize(
  model.database,
  model.username,
  model.password,
  options
)

let tagsSequelize = null
// 标签相关的数据库
if(config.tagsDb !== null) {
  const tagsDb = config.tagsDb
  const tagsOptions = {
    dialect: tagsDb.dialect,
    host: tagsDb.host,
    port: tagsDb.port,
    pool: tagsDb.pool,
    define: {
      charset: 'utf8',
      timestamps: false, // true by default
      freezeTableName: true
    },
    logging: config.site.env === 'development' ? console.log : false,
    operatorsAliases
  }

  tagsSequelize = new Sequelize(
    tagsDb.database,
    tagsDb.username,
    tagsDb.password,
    tagsOptions
  )
}


export { sequelize as client }
export { Sequelize as Seq }
export { tagsSequelize as tagsClient }
