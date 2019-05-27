import db from '../models'
import hasher from 'sugo-pbkdf2-hasher'
import {permissions} from '../models/apis'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import testPassword from '../../common/test-password'
import {generate} from '../models/safe-id'
import {sendValidateEmail} from '../utils/email'
import initUser from '../utils/init-new-user'
import {checkLimit} from '../utils/resouce-limit'
import {moduleExtend} from 'sugo-analytics-common-tools/lib/file-extend'
import {requestJWTSign} from '../init/jwt-login-middleware'

const permissionTree = permissions.reduce((prev, p) => {
  prev[p.id] = p
  return prev
}, {})

const err1 = '用户名或者密码不正确'

export function hash (password) {
  return new Promise((resolve, reject) => {
    hasher.generate(password, (err, str) => {
      if (err) {
        reject(err)
      } else {
        resolve(str)
      }
    })
  })
}

function verifyPass(pass, passEnc) {
  return new Promise((resolve, reject) => {
    hasher.verify(pass, passEnc, (err, verified) => {
      if (err) {
        reject(err)
      } else {
        resolve(verified)
      }
    })
  })
}

const resetPassword = async ctx => {
  let {password, id} = ctx.q

  if (!testPassword(password)) {
    return returnError(ctx, '密码不符合格式')
  }

  let ig = await db.EmailValidate.findOne({
    where: {
      id
    }
  })

  if (!ig) {
    return returnError(ctx, '别开玩笑，你这id不对')
  } else if (new Date(ig.expire) < new Date()) {
    return returnError(ctx, '过期了，请重新申请重置密码')
  }

  password = await hash(password)
  let res = await db.client.transaction(async (transaction) => {

    await db.SugoUser.update({
      password
    }, {
      where: {
        id: ig.user_id
      },
      transaction
    })

    return await db.EmailValidate.destroy({
      where: {
        id
      },
      transaction
    })

  })

  returnResult(ctx, res)

}

const reg = async ctx => {
  let {
    email,
    cellphone,
    companyName,
    password,
    cellcode
  } = ctx.q

  let {session} = ctx
  if (!cellcode) {
    return ctx.body = {
      error: '请先发送验证码'
    }
  }
  if (cellcode.toLowerCase() !== session.cellcode) {
    return returnError(ctx, '验证码不正确')
  }

  if (!testPassword(password)) {
    return returnError(ctx, '密码不符合格式')
  }



  //email check
  let ig = await db.SugoUser.findOne({
    where: {
      email
    }
  })

  if (ig) {
    return returnError(ctx, '邮件地址已经被占用，请换个邮件地址')
  }

  //cellphone check
  let ig1 = await db.SugoUser.findOne({
    where: {
      cellphone
    }
  })

  if (ig1) {
    return returnError(ctx, '手机号码已经注册，请换个号码')
  }

  password = await hash(password)
  let company_id = generate()
  let user_id = generate()
  let emailValidateId = generate()
  let role_id = generate()
  
  //start create company, user...
  let res = await db.client.transaction(function (t) {

    let target = {
      transaction: t
    }

    return initUser({
      company_id,
      user_id,
      emailValidateId,
      role_id,
      target,
      db,
      email,
      cellphone,
      password,
      companyName
    })

  })

  await sendValidateEmail({
    ToAddress: email,
    code: emailValidateId,
    host: ctx.local.host
  })

  ctx.session.cellcode = ''

  returnResult(ctx, res)
}

/**
 * 初始化 user 对象，准备舍入 session，提供给扩展包的单点登录逻辑使用
 * @param user
 * @returns {Promise<*>}
 */
export async function prepareUserObjForSession(user) {
  //查找该user的permissions
  let roles = user.SugoRoles || []

  let permissionsList = []
  let isAdmin = _.some(roles, r => r.type === 'built-in')

  if (isAdmin) {
    permissionsList = permissions.slice(0)
  } else {
    let roleIds = roles
      .filter(r => r.type !== 'built-in')
      .map(r => r.id)
    let dbPermissions = await db.SugoRoleRoute.findAll({
      where: {
        role_id: { $in: roleIds }
      }
    })
    permissionsList = _(dbPermissions).chain()
      .map(p => p.route_id).uniq()
      .map(p => permissionTree[p])
      .filter(_.identity)
      .concat(permissions.filter(p => p.common))
      .uniqBy(p => p.method + ':' + p.path)
      .value()
  }

  user.permissions = permissionsList
  user.company = await db.SugoCompany.findById(user.company_id, { raw: true })

  return user
}

const login = async ctx => {

  const {
    username,
    password
  } = ctx.q

  if (!username) {
    return ctx.body = {
      code: 1,
      error: err1
    }
  }
  if (!password) {
    return ctx.body = {
      code: 1,
      error: err1
    }
  }

  let user = await db.SugoUser.findOne({
    where: {
      username: username
    },
    include: [{
      model: db.SugoRole
    }]
  })

  if (!user) {
    return returnError(ctx, err1, 200)
  }

  user = user.get({ plain: true })

  // if (user.email_validate) {
  //   return returnError(ctx, '您还没有验证邮箱，验证邮箱后您的账号才可以使用', 200)
  // }

  // //将AES密码解密为原密码，与数据库pbkdf2密码比对
  // let _password = CryptoJS.AES.decrypt(password, 'sugo').toString(CryptoJS.enc.Utf8)

  let pass = await verifyPass(password, user.password)

  if (!pass) {
    return returnError(ctx, err1, 200)
  }

  let comp = await db.SugoCompany.findById(user.company_id)

  if (!comp || comp.deleted) {
    return returnError(ctx, '您的企业不存在')
  } else if (!comp.active) {
    return returnError(ctx, '您的企业账户已经被锁定, 无法登录')
  }

  user.password = password

  ctx.session.user = await prepareUserObjForSession(user)

  let redirect = (ctx.session.redirect || '/console') + ''

  delete ctx.session.redirect

  ctx.body = {
    code: 0,
    redirect
  }

}

const logout = async ctx => {
  ctx.session = null
  ctx.redirect('/')
}

  //根据参数获取用户列表
const getUsers = async ctx => {

  let body = ctx.q || {}
  //let count = await db.SugoUser.count({})
  let u = ctx.session.user
  let {company_id, SugoRoles} = u
  body.where = body.where || {}
  body.where.company_id = company_id
  body.include = [{
    model: db.SugoRole
  }]
  body.attributes = ['id', 'email', 'first_name', 'username', 'type', 'cellphone']

  let rows = await db.SugoUser.findAll(body)
  let isAdmin = !!_.find(SugoRoles, { type: 'built-in' })
  if (body.canShare && !isAdmin) {
    let ids = u.SugoRoles.map(r => r.id)
    rows = rows.map(row => row.get({ plain: true }))
    .filter(uu => {
      let rids = uu.SugoRoles.map(s => s.id)
      return rids.reduce((prev, curr) => {
        return prev || _.indexOf(ids, curr) > -1
      }, false)
    })
  }
  
  ctx.body = {
    result: rows
  }

}

//新增用户
const addUser = async ctx => {

  let {
    user = {}
  } = ctx.q
  let u = ctx.session.user
  let {company_id} = u
  let userId = u.id
  let {username, roles, email} = user

  await checkLimit(ctx, 'user')
  let inDb = await db.SugoUser.findOne({
    where: {
      username
    }
  })

  //判断是否重复
  if (inDb) {
    return returnError(ctx, '用户名被占用，换一个吧')
  }

  inDb = email && await db.SugoUser.findOne({
    where: {
      email
    }
  })

  debug('email', email, inDb)

  if (inDb) {
    return returnError(ctx, '邮件地址被占用，换一个吧')
  }

  //创建
  user.created_by_fk = userId
  user.changed_by_fk = userId
  user.company_id = company_id
  
  delete user.id
  user.type = 'user-created'

  let {password, ignorePwdTest = false} = user
  if (!testPassword(password) && !ignorePwdTest) {
    return returnError(ctx, '密码必须为6~20位字母和数字组合')
  }

  password = await hash(password)
  user.password = password

  let res = await db.client.transaction(async transaction => {
    let res1 = await db.SugoUser.create(user, {transaction})
    for(let role of roles) {
      let q = {
        user_id: res1.id,
        role_id: role.id
      }
      await db.SugoUserRole.findOrCreate({
        where: q,
        defaults: q,
        transaction
      })
    }
    return res1.get({plain: true})
  })
  delete res.password
  return returnResult(ctx, res)
}

//更新用户
const editUser = async ctx => {

  let {
    user = {}
  } = ctx.q

  let {roles, id} = user

  if (!id) {
    return returnError(ctx, 'id不能为空', 404)
  }

  let u = ctx.session.user
  let {company_id} = u
  let userId = u.id

  let query1 = {
    where: {
      id,
      company_id
    }
  }

  let inDb = await db.SugoUser.findOne(query1)

  //判断是否存在
  if (!inDb) {
    return returnError(ctx, '找不到用户', 404)
  }

  //判断是否重名
  else if (
    !_.isUndefined(user.username) &&
    user.username !== inDb.username) {
    let inDb1 = await db.SugoUser.findOne({
      where: {
        username: user.username
      }
    })
    if (inDb1) return returnError(ctx, '用户名被占用, 换一个吧')
  } else if (
    !_.isUndefined(user.email) &&
    user.email !== inDb.email
  ) {
    let inDb2 = await db.SugoUser.findOne({
      where: {
        email: user.email
      }
    })
    if (inDb2) return returnError(ctx, '邮件地址被占用, 换一个吧')
  }

  //创建
  user = _.pick(user, ['username', 'first_name', 'password', 'active', 'email', 'last_name', 'cellphone'])
  user.changed_by_fk = userId

  //built-in user name not change able
  if (inDb.type === 'built-in') {
    delete user.username
    delete user.active
    if (userId !== inDb.id) {
      return returnError(ctx, '您无权更改超级管理员')
    }
  }


  if (user.password) {
    let {password} = user
    if (!testPassword(password)) {
      return returnError(ctx, '密码必须为6~20位字母和数字组合')
    }

    password = await hash(password)
    user.password = password
  }

  let res = await db.SugoUser.update(user, query1)

  let query2 = {
    where: {
      user_id: id
    }
  }

  if (inDb.type !== 'built-in') await db.client.transaction(function (t) {
    let target = {
      transaction: t
    }
    return db.SugoUserRole.destroy(query2, target)
      .then(() => {
        let arr = roles.map(p => {
          return db.SugoUserRole.create({
            user_id: id,
            role_id: p.id
          }, target)
        })
        return Promise.all(arr)
      })
  })

  returnResult(ctx, res)

}

//删除用户
const deleteUser = async ctx => {

  let {
    id
  } = ctx.q

  if (!id) {
    return returnError(ctx, 'id不能为空', 404)
  }
  let u = ctx.session.user
  let {company_id} = u

  let query1 = {
    where: {
      id,
      company_id
    }
  }

  let inDb = await db.SugoUser.findOne(query1)

  //判断是否重复
  if (!inDb) {
    return returnError(ctx, '找不到用户', 404)
  } else if (inDb.type === 'built-in') {
    return returnError(ctx, '不允许删除这个用户组')
  }

  let query2 = {
    where: {
      user_id: id,
      company_id
    }
  }
  let res
  let rootUser = await db.SugoUser.findOne({
    where: {
      type: 'built-in',
      company_id
    }
  })

  await db.client.transaction(async (t) => {
    let target = {
      transaction: t
    }

    let q4 = {
      where: {
        user_id: id
      }
    }

    //删除订阅
    await db.SugoSubscribe.destroy(q4, target)

    //删除自定义顺序
    await db.SugoCustomOrders.destroy(q4, target)

    //书签
    await db.SugoPivotMarks.destroy(q4, target)

    //邮件验证
    await db.EmailValidate.destroy(q4, target)

    //重置密码
    await db.ResetPassword.destroy(q4, target)

    //删除概览
    await db.SugoOverview.destroy({
      where: {
        created_by: id
      }
    }, target)

    //删除看板
    let q3 = {
      where: {
        created_by: id,
        company_id
      }
    }

    let dids = await db.Dashboards.findAll({
      ...q3,
      ...target
    })
    dids = dids.map(s => s.id)
    await db.DashboardSlices.destroy({
      where: {
        dashboard_id: {
          $in: dids
        }
      }
    }, target)
    await db.Dashboards.destroy(q3, target)

    //角色关联
    await db.SugoUserRole.destroy(q4, target)
    
    //单图转交给root用户
    await db.Slices.update({
      created_by: rootUser.id
    }, {
      where: {
        created_by: id,
        company_id
      },
      ...target
    })

    //最后删除用户
    res = await db.SugoUser.destroy(query1, target)
  })

  returnResult(ctx, res)
}

//更新个人信息
const updateUserProfile = async ctx => {

  let {
    user = {}
  } = ctx.q

  let {password, oldPassword} = user

  if (password && !testPassword(password)) {
    return returnError(ctx, '密码格式不符合要求')
  }

  let {id} = ctx.session.user
  let sessPass = ctx.session.user.password
  let query1 = {
    where: {
      id
    }
  }
  let update = {}
  let sessUpdate = {}
  if (oldPassword) {
    // sesion中的pwd有可能是已加密字符
    const oldPwdHash = await hash(oldPassword)
    const oldPass = await verifyPass(oldPassword, oldPwdHash)
    if (!(sessPass === oldPassword || oldPass)) return returnError(ctx, '旧密码不正确')
    update.password = await hash(password)
    sessUpdate.password = password
  } else {
    update = _.pick(user, ['first_name', 'email', 'cellphone'])
    sessUpdate = update
    if (!Object.keys(update).length) return returnResult(ctx)
  }

  let res = await db.SugoUser.update(update, query1)

  Object.assign(ctx.session.user, sessUpdate)

  returnResult(ctx, res)

}

//更新企业
const updateCompanyProfile = async ctx => {

  let {cellcode, cellphone, password} = ctx.q

  if (password && !testPassword(password)) {
    return returnError(ctx, '密码格式不符合要求')
  }

  let {company_id, company, type} = ctx.session.user
  let sessPass = ctx.session.user.password

  if (type !== 'built-in') {
    return returnError(ctx, '仅初始用户有权修改公司信息')
  }
  
  if (cellphone && cellphone !== ctx.session.cellnum) {
    return returnError(ctx, '验证手机与接受信息手机不一致') 
  }

  if (cellphone && cellphone !== company.cellphone && ctx.session.cellcode !== cellcode.toLowerCase()) {
    return returnError(ctx, '手机验证码不正确')
  }

  if (password !== sessPass) {
    return returnError(ctx, '密码不正确')
  }

  let query1 = {
    where: {
      id: company_id
    }
  }
  let update = _.pick(ctx.q, ['name', 'cellphone'])
  let update1 = _.pick(ctx.q, ['name', 'cellphone', 'description'])

  let qry = Object.keys(update).map(prop => {
    if(!update[prop]) {
      return undefined
    } 
    return {
      [prop]: update[prop]
    }
  })

  let indb = await db.SugoCompany.findOne({
    where: {
      $or: qry
    }
  })

  if (indb) return returnError(ctx, '公司名或者手机号码被占用')

  let res = await db.SugoCompany.update(update1, query1)

  Object.assign(ctx.session.user.company, update1)

  returnResult(ctx, res)

}

//获取登录用户信息，供app使用
const getUserInfo = async ctx => {
  ctx.body = {
    user: ctx.session.user,
    setting: ctx.local
  }
}

export default {
  login,
  getUserInfo,
  logout,
  getUsers,
  editUser,
  deleteUser,
  addUser,
  resetPassword,
  updateUserProfile,
  updateCompanyProfile,
  reg,
  prepareUserObjForSession,
  requestJWTSign
}

//通过扩展module扩展之
moduleExtend(__filename)
