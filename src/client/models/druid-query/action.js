/**
 * Created on 10/05/2017.
 */

import { utils } from 'next-reader'
const generate = utils.short_id

export default {
  overrideParam: generate(),  // 重设参数
  setParam: generate(),       // 更新查询参数
  query: generate(),          // 执行查询
  resetParam: generate()      // 清空查询参数
}
