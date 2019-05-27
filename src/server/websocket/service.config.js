/**
 * 所有可以处理socket信息的服务注册定义
 */
import trafficAnalytics from '../services/traffic.service'
import sugoLivescreenBroadcast from '../services/sugo-livescreen-broadcast.service'

const config = {
  'trafficAnalytics': trafficAnalytics,
  'sugo_livescreen_broadcast': sugoLivescreenBroadcast
}


export default config
