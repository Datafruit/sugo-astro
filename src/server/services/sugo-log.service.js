import db from '../models'
import _ from 'lodash'
import {BaseService} from './base.service'
import {apis} from '../models/apis'
import {dictBy, mapAwaitAll} from '../../common/sugo-utils'
import { GLOBAL_ERROR } from '../utils/log2db'
import moment from 'moment'
import conf from '../config'
import pathToRegexp from 'path-to-regexp'

const logByMethod = (conf.log2dbByMethod || 'post,put,patch,delete').split(',')
const logByMethodSet = new Set([...logByMethod, ...logByMethod.map(m => m.toUpperCase())])

const logByPathStr = _.isEmpty(conf.log2dbByPath) ? 'others' : conf.log2dbByPath
const subsetPathRegs = logByPathStr.split(',').filter(p => p !== 'others').map(p => pathToRegexp(p))

export const loggingApis = apis.filter(api => {
  return logByMethodSet.has(api.method) && _.some(subsetPathRegs, pathReg => pathReg.test(api.path))
})

export const alwaysLoggingApis = apis.filter(api => {
  return api.alwaysLogging
})

const apiIdDict = _.keyBy(apis, 'id')
let _inst = null

export default class SugoLogService extends BaseService {
  constructor() {
    super('Log')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoLogService()
    }
    return _inst
  }
  
  async getLogsWithApiTitle(opts) {
    let { companyId, pageSize, pageIndex, since, until, isIncludeExplain } = opts
    let where = this.generateWhere(opts)
    const res = await this.findAndCountAll({
      $or: [{company_id: companyId}, {company_id: null}],
      created_at: { $between: [moment(since).toDate(), moment(until).toDate()] },
      ...where
    }, {
      limit: pageSize,
      offset: pageIndex * pageSize,
      order: [['created_at', 'desc']],
      raw: true
    })
    let resultArr = await mapAwaitAll( _.get(res,'rows',[]),async log => {
      let {path, method} = log
      let lowerMethod = method.toLowerCase()
      let matchedRoute = _.find([...alwaysLoggingApis,...loggingApis], api => api.method === lowerMethod && (api.path === path || api.pathReg.test(path))) || _.find(apis, api =>  api.method === lowerMethod &&  (api.path === path || api.pathReg.test(path)))
      const logKeywordExtractor = _.get(matchedRoute, 'logKeywordExtractor')
      let v = {
        ...log,
        apiClass: _.get(matchedRoute, 'class') || '未知',
        apiGroup: _.get(matchedRoute, 'group') || '未知',
        apiTitle: _.get(matchedRoute, 'title') || '未知',
        keyword: !logKeywordExtractor
          ? null
          : _.isFunction(logKeywordExtractor)
            ? await logKeywordExtractor(log)
            : _.get(log, logKeywordExtractor)
      }
      if (isIncludeExplain) {
        v.explain = await this.doExplain(log)
      }
    
      return v
    })
    return {
      data: resultArr,
      total: _.get(res,'count',0)
    }
  }

  generateWhere(opts) {
    let { username, ip, operaResult, operaType, keyword  } = opts
    let where = {}
    if (username) {
      where.username = username
    }
    if (ip) {
      where.ip = ip
    }
    if (operaResult) {
      if (operaResult === 'success') {
        where.status = {
          $between: [200,300]
        }
      } else if (operaResult === 'fail') {
        where.status = {
          $notBetween: [200,300]
        }
      }
    }
    if (operaType) {
      loggingApis
      let target = _.find([...alwaysLoggingApis,...loggingApis],{'title': operaType})
      //目前只接受单个
      if (target) {
        where.path = {
          $regexp:target.pathReg.source
        }  
      }
    }
    if (keyword) {
      where.body = {
        $or: [
          {name:{$like: `%${keyword}%`}},
          {username:{$like: `%${keyword}%`}},
          {'role':{'name': {$like: `%${keyword}%`}}},
          {'user':{'username': {$like: `%${keyword}%`}}},
          {'update': {'name': {$like: `%${keyword}%`}}},
          {'update': {'title': {$like: `%${keyword}%`}}},
          {'body': {'title': {$like: `%${keyword}%`}}},
          {'body': {'titles': {$like: `%${keyword}%`}}},
          {'body': {'username': {$like: `%${keyword}%`}}},
          {slice_name:{$like: `%${keyword}%`}},
          {'fileInfo': {'file_name': {$like: `%${keyword}%`}}},
          {title:{$like: `%${keyword}%`}}
        ]
      }
    }
    return where
  }
  
  async explainLogById(logId) {
    let log = await this.findOne({id: logId}, {raw: true})
    return {
      explain: await this.doExplain(log),
      log: log
    }
  }
  
  async batchExplain(ids, modelName, idColumnName, readColumnName) {
    let res = await db[modelName].findAll({
      [idColumnName]: {$in: ids},
      raw: true,
      attributes: [idColumnName, readColumnName]
    })
    let idDict = dictBy(res, o => o[idColumnName], o => o[readColumnName])
    return res.map(v => idDict[v[idColumnName]])
  }
  
  async doExplain(log) {
    if (!log) {
      return '日志不存在'
    }
    let {path, method} = log
    method = method.toLocaleLowerCase()
    let api = _.find(_.concat(loggingApis, alwaysLoggingApis), api => (api.path === path || api.pathReg.test(path)) && api.method === method)
    if (!api || !api.logExplain) {
      if (conf.errorLog2db) { // 解析错误信息日志展示
        if ((_.keys(log.body) || []).includes(GLOBAL_ERROR)) {
          return `${log.username} 访问 ${log.path} 出错
          错误信息：${log.body[GLOBAL_ERROR]}
          参数为：${JSON.stringify(log.body.params || {})}`
        }
      }
      return '没有为此日志的定义解释'
    }
    const imports = {
      apiIdDict: apiIdDict
    }
    let res = _.isFunction(api.logExplain)
      ? await api.logExplain(log, imports)
      : _.template(api.logExplain, {imports})(log)
    return res
  }
}
