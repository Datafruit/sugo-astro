import sid from './safe-id'
import {hash} from '../controllers/user.controller'
import conf from '../config'
import initSugoSDK from '../utils/init-sugo-sdk'
import {err} from '../utils/log'
import { DEFAULT_COMPANY_EMAIL, DEFAULT_ADMIN_PWD } from '../constants'

const {pkg, shouldInitSugoSDKProject, initSugoSDKProjectName} = conf

//初始化空数据库
export default async function init(db) {

  let clusterId = process.env.NODE_APP_INSTANCE
  //仅仅在第一个实例执行
  if (clusterId > 0) return

  let count = await db.SugoUser.count()
  if (count) return

  let company_id = sid()
  let role_id = sid()
  let user_id = sid()
  let email = DEFAULT_COMPANY_EMAIL
  let password = await hash(DEFAULT_ADMIN_PWD)

  await db.Meta.create({
    name: 'version',
    value: pkg.version
  })

  // 创建默认企业用户
  await db.SugoCompany.create({
    id: company_id,
    name: 'test',
    type: 'payed',
    active: true,
    deleted: false,
    is_root: true,
    email
  })

  // 创建默认角色
  await db.SugoRole.create({
    id: role_id,
    company_id,
    name: 'admin',
    type: 'built-in'
  })

  // 创建默认超级管理用户
  await db.SugoUser.create({
    id: user_id,
    company_id,
    username: 'admin',
    type: 'built-in',
    email,
    password,
    first_name: '超级管理员'
  })

  await db.SugoUserRole.create({
    role_id,
    user_id
  })

  if (shouldInitSugoSDKProject) {
    try {
      await initSugoSDK(company_id, user_id, role_id)
    } catch(e) {
      err(e.stack)
      err('创建初始化埋点项目:', initSugoSDKProjectName, '失败了')
    }
  }

}
