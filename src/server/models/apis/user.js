const ctrl = 'controllers/user.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '管理中心',
  group: '用户管理'
}

const routes = [
  {
    path: '/common/login',
    title: '登录',
    method: 'post',
    requireLogin: false,
    requirePermission: false,
    alwaysLogging: true,
    func: 'login'
  }, {
    path: '/logout',
    title: '注销登录',
    method: 'get',
    requireLogin: false,
    requirePermission: false,
    alwaysLogging: true,
    func: 'logout'
  }, {
    path: '/app/user/get',
    title: '查询用户列表',
    method: 'get',
    common: true,
    requirePermission: false,
    func: 'getUsers'
  }, {
    path: '/app/user/create',
    title: '添加用户',
    method: 'post',
    func: 'addUser',
    logExplain: `<%= username %> 创建了用户 <%= body.user.username %>，其属性为：
      email: <%= body.user.email %>
      名称: <%= body.user.first_name %>
      电话: <%= body.user.cellphone %>
      用户组: <%= body.user.roles.map(r => r.name).join('，')%>
    `,
    logKeywordExtractor: 'body.user.username'
  }, {
    path: '/app/user/update',
    title: '更新用户',
    method: 'post',
    func: 'editUser',
    logExplain: `<%= username %> 将用户 <%= body.user.username %> 的属性修改为：
      email: <%= body.user.email %>
      名称: <%= body.user.first_name %>
      电话: <%= body.user.cellphone %>
      用户组: <%= body.user.roles.map(r => r.name).join('，')%>
      密码: <%= body.user.password ? '******' : '(无变更)' %>
    `,
    logKeywordExtractor: 'body.user.username'
  }, {
    path: '/app/user/update-profile',
    title: '更新个人信息',
    method: 'post',
    requirePermission: false,
    func: 'updateUserProfile',
    logExplain: `<%= username %> 更新个人信息为：
      密码: <%= body.user.password === undefined ? '（无变更）' : '******' %>
      email: <%= body.user.email === undefined ? '（无变更）' : body.user.email + '' %>
      名称: <%= body.user.first_name === undefined ? '（无变更）' : body.user.first_name + '' %>
      电话: <%= body.user.cellphone === undefined ? '（无变更）' : body.user.cellphone + '' %>
    `,
    logKeywordExtractor: 'username'
  }, {
    path: '/app/user/update-company-profile',
    title: '更新企业信息',
    method: 'post',
    requirePermission: false,
    func: 'updateCompanyProfile'
  }, {
    path: '/app/user/delete',
    title: '删除用户',
    method: 'post',
    func: 'deleteUser',
    logExplain: `<%= username %> 删除了用户 <%= body.username %>`,
    logKeywordExtractor: 'body.username'
  }, {
    path: '/app/user/info',
    title: '获取登录后个人信息',
    method: 'post',
    requirePermission: false,
    func: 'getUserInfo'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : ''
}
