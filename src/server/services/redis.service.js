/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   12/01/2018
 * @description
 */

import conf from '../config'
import { Redis } from '../utils/RedisServer'
const redisConfig = conf.redis
const redis = new Redis(redisConfig, redisConfig.clusterMode || false, redisConfig)

process.on('beforeExit', function () {
  redis.disconnect()
})

export default redis
