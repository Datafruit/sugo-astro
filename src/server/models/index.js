import fs from 'fs'
import path from 'path'
import { client, Seq, tagsClient} from './_db'
import {err} from '../utils/log'
import init from './init-db'

const db = {}

// read all models and import them into the 'db' object
fs
  .readdirSync(__dirname + '/tables')
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file.indexOf('.map') === -1) && (file !== '_db.js')
  })
  .forEach(file => {
    try {
      const model = client.import(path.join(__dirname + '/tables', file))
      db[model.name] = model
    } catch(e) {
      err('加载DB Model错误',file, e.message)
    }
  })

Object.keys(db).forEach(modelName => {
  if ('associate' in db[modelName].options) {
    try {
      db[modelName].options.associate(db)
    } catch(e) {
      err('设置DB关联关系错误', modelName, e.stack)
    }
  }
})

export async function initDb() {

  await client.authenticate()
  await client.sync()

  if (tagsClient !== null) {
    await tagsClient.authenticate()
    await tagsClient.sync()
  }

  exports.default = {
    ...db,
    client,
    tagsClient,
    Sequelize: Seq
  }

  // 初始化用户数据
  await init(exports.default)
}
