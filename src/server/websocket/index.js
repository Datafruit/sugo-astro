/**
 * websocket server init
 */
import getServer from './server'

export default function init(app) {
  return getServer(app)
}
