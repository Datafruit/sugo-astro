/**
 * Created on 10/05/2017.
 */

import { utils } from 'next-reader'

export default {
  create: utils.short_id(),
  update: utils.short_id(),
  list: utils.short_id(),
  del: utils.short_id(),

  // 被改变，与update的区别在于:
  // change场景一般发生在缓存中，而不通知服务器
  // 比如用户输入name时，需要更新model，但并马上服务器
  // 而是在用户执行保存操作时，才上报服务器
  change: utils.short_id()
}

