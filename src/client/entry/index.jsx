
import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { LocaleProvider } from 'antd'

// style
import '../css/theme.styl'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '../components/Dashboards/dashboards.styl'
import '../components/TagManager/tag-manager.styl'
import '../components/Retention/retention.styl'
import '../components/Insight/insight.styl'
import '../components/Slices/slice.styl'
import '../components/Usergroup/style.styl'
import '../components/UserActionAnalytics/index.styl'
import '../components/SugoFunnel/index.styl'
import '../components/Analytic/analytic.styl'
import '../components/Analytic/split-tile.styl'
import '../components/Track2/track.styl'
import '../components/Common/highlight-string.styl'
import '../components/Common/multi-select-buttons.styl'
import '../components/SegmentExpand/segment-expand.styl'
import '../css/split-helper.styl'
import '../components/Datasource/style.styl'
import '../components/LossPredict/loss-predict.styl'
import 'jointjs/dist/joint.css'
import 'sugo-dragula/dragula.styl'
import '../components/PioProjects/pio.styl'
import '../components/TrafficAnalytics/traffic-analytics-theme.styl'
import '../components/BehaviorAnalytics/behavior-analytics-theme.styl'
import '../components/LiveScreen/livescreen.styl'
import 'react-html5video/dist/styles.css'
import '../components/SourceDataAnalytic/source-data-analytic.styl'
import '../components/Project/access-collector/access-collector.styl'
import 'github-markdown-css/github-markdown.css'
import '../components/Charts/MapChart/map-chart.styl'
import '../components/TaskScheduleManager/index.styl'
import '../components/PathAnalysis/pa.styl'
import { rootReducers } from '../reducers'
import ReducerRegistry from '../reducers/reducer-registry'
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import moment from 'moment-timezone/moment-timezone'
import 'moment/locale/zh-cn'
import createStore from '../store'
import { configureRoutes } from '../routes'
import {getJwtSign} from '../common/jwt-helper'

moment.locale('zh-cn')
moment.tz.add('Asia/Shanghai|CST CDT|-80 -90|01010101010101010|-1c1I0 LX0 16p0 1jz0 1Myp0 Rb0 1o10 11z0 1o10 11z0 1qN0 11z0 1o10 11z0 1o10 11z0|23e6')
moment.tz.setDefault('Asia/Shanghai')

const reducerRegistry = new ReducerRegistry(rootReducers)
const store = createStore({}, reducerRegistry)
const routes = configureRoutes(reducerRegistry)

const rootElement = document.getElementById('container')
window.store = store

render (
  <LocaleProvider locale={zh_CN}>
    <Provider store={store}>
      {routes}
    </Provider>
  </LocaleProvider>,
  rootElement
)


window.getJwtSign = getJwtSign
