import db from '../models'
import SugoLogService,{ alwaysLoggingApis, loggingApis } from '../services/sugo-log.service'
import {returnResult} from '../utils/helper'
import _ from 'lodash'

async function getLogs(ctx) {
  // console.log(ctx.q, ctx.query);
  let {
    pageSize = 10, pageIndex = 0, since = '1000', until = '3000', username, ip, operaResult,
    operaType, isIncludeExplain, keyword
  } = !_.isEmpty(ctx.q) ? ctx.q : ctx.query
  let { user = {} } = ctx.session
  let { company = {} } = user
  let res = await SugoLogService.getInstance().getLogsWithApiTitle({
    companyId: company.id,
    pageSize,
    pageIndex,
    since,
    until,
    username, 
    ip, 
    operaResult, 
    operaType,
    keyword,
    isIncludeExplain
  })
  
  returnResult(ctx, res)
}

async function explainLog(ctx) {
  let {id} = ctx.params
  let explainResult = await SugoLogService.getInstance().explainLogById(id)
  returnResult(ctx, explainResult)
}

async function apiTitles (ctx) {
  returnResult(ctx,{
    apiTitles: [...alwaysLoggingApis, ...loggingApis].map(i => i.title)
  })
}

export default {
  getLogs,
  explainLog,
  apiTitles
}
