import BarChart from '../components/Charts/BarChart'
import StackedBarChart from '../components/Charts/BarChart/stacked-bars'
import HorizontalBarChart from '../components/Charts/BarChart/horizontal-bars'
import PieChart from '../components/Charts/PieChart'
import LineChart from '../components/Charts/LineChart'
import TwoDimBarChart from '../components/Charts/BarChart/two-dim-bar-chart'
import TwoDimLineChart from '../components/Charts/LineChart/two-dim-line-chart'
import {sliceTableChart, analyticTableChart} from '../components/Charts/TableChart'
import {sliceFlatTableChart, analyticFlatTableChart} from '../components/Charts/TableChart/flat-table'
import BigNumberChart from '../components/Charts/BigNumberChart'
import MapChart from '../components/Charts/MapChart'
import ScatterMapChart from '../components/Charts/MapChart/scatter-map'
import HeatMap from '../components/Charts/HeatMap'
import BubbleChart from '../components/Charts/BubbleChart'
import StackedLine from '../components/Charts/LineChart/stacked-line'
import BalanceBar from '../components/Charts/BarChart/balance-bars'
import RatioBar from '../components/Charts/BarChart/ratio-bars'
import RatioLine from '../components/Charts/LineChart/ratio-line'
import BarAndLine from '../components/Charts/MixChart/bar-and-line-chart'
import IframeBox from '../components/Charts/IframeBox'
import SdkHeatMap from '../components/Charts/HeatMap/sdkHeatMap'
import LiquidFill from '../components/Charts/LiquidFill'
import WordCloud from '../components/Charts/WordCloud'
import Gauge from '../components/Charts/Gauge'
import Radar from '../components/Charts/Radar'
import Chord from '../components/Charts/Chord'
import LinkChart from '../components/Charts/Link'
import _ from 'lodash'
import StaticImageChart from '../components/Charts/StaticImageChart'
import SugoFunnelSlice from '../components/Charts/CustomChart/sugo-funnel-slice'
import SugoRetentionSlice from '../components/Charts/CustomChart/sugo-retention-slice'
import SugoPathAnalysisSlice from '../components/Charts/CustomChart/sugo-path-analysis-slice'
import TreeChart from '../components/Charts/TreeChart'
import RelationChart from '../components/Charts/RelationChart'

export const vizTypeChartComponentMap = {
  number: BigNumberChart,
  table: sliceTableChart,
  table_flat: sliceFlatTableChart,
  pie: PieChart,
  dist_bar: BarChart,
  line: LineChart,
  map: MapChart,
  scatter_map: ScatterMapChart,
  horizontal_bar: HorizontalBarChart,
  balance_bar: BalanceBar,
  bubble: BubbleChart,
  multi_dim_bar: TwoDimBarChart,
  multi_dim_line: TwoDimLineChart,
  multi_dim_stacked_bar: StackedBarChart,
  heat_map: HeatMap,
  multi_dim_stacked_line: StackedLine,
  multi_dim_ratio_bar: RatioBar,
  multi_dim_ratio_line: RatioLine,
  bar_and_line: BarAndLine,
  tree: TreeChart,
  force: RelationChart,
  image: StaticImageChart,
  sdk_heat_map: SdkHeatMap,
  sugo_funnel: SugoFunnelSlice,
  sugo_retention: SugoRetentionSlice,
  sugo_path_analysis: SugoPathAnalysisSlice,
  IframeBox: IframeBox,
  liquidFill: LiquidFill,
  wordCloud: WordCloud,
  gauge: Gauge,
  radar: Radar,
  chord: Chord,
  link: LinkChart
}

 
export const analyticVizTypeChartComponentMap = {
  ..._.omit(vizTypeChartComponentMap, ['image', 'IframeBox', 'sdk_heat_map', 'sugo_funnel', 'sugo_retention', 'sugo_path_analysis', 'link']),
  table: analyticTableChart,
  table_flat: analyticFlatTableChart
}

export const vizTypeNameMap = {
  number: '总计',
  table: '树状表格',
  table_flat: '表格',
  pie: '饼图',
  dist_bar: '一维柱图',
  line: '一维线图',
  multi_dim_bar: '二维柱图',
  multi_dim_line: '二维线图',
  map: '地图',
  scatter_map: '散点地图',
  multi_dim_stacked_bar: '堆积柱图',
  horizontal_bar: '横向柱图',
  heat_map: '热力图',
  bubble: '气泡图',
  multi_dim_stacked_line: '堆积线图',
  balance_bar: '交错柱图',
  multi_dim_ratio_bar: '比例堆积柱图',
  multi_dim_ratio_line: '比例堆积线图',
  bar_and_line: '柱状折线图',
  tree: '树图',
  force: '力导图',
  image: '静态图片',
  sdk_heat_map: 'sdk热图',
  sugo_funnel: '漏斗',
  sugo_retention: '留存',
  sugo_path_analysis: '路径分析',
  liquidFill: '水泡图',
  wordCloud: '词云图',
  gauge: '仪表盘',
  radar: '雷达图',
  chord: '和弦图',
  link: '链接'
}

export const vizTypeIconMap = {
  number: 'sugo-chart-number',
  table: 'sugo-chart-table_flat',
  table_flat: 'sugo-chart-table_flat',
  pie: 'pie-chart',
  dist_bar: 'sugo-chart-dist_bar',
  line: 'sugo-chart-line',
  bar_and_line: 'sugo-chart-bar_and_line',
  map: 'sugo-chart-map',
  scatter_map: 'sugo-chart-scatter_map',
  horizontal_bar: 'sugo-chart-horizontal_bar',
  balance_bar: 'sugo-chart-balance_bar',
  bubble: 'dot-chart',
  multi_dim_bar: 'sugo-chart-multi_dim_bar',
  multi_dim_line: 'sugo-chart-multi_dim_line',
  multi_dim_stacked_bar: 'sugo-chart-multi_dim_stacked_bar',
  heat_map: 'sugo-chart-heat_map',
  multi_dim_stacked_line: 'sugo-chart-multi_dim_stacked_line',
  multi_dim_ratio_bar: 'sugo-chart-multi_dim_ratio_bar',
  multi_dim_ratio_line: 'sugo-chart-multi_dim_ratio_line',
  tree: 'sugo-model',
  force: 'sugo-analysis',
  image: 'picture',
  sdk_heat_map: 'sdk_heat_map',
  sugo_funnel: 'sugo-filter',
  sugo_retention: 'sugo-retention',
  sugo_path_analysis: 'sugo-path',
  IframeBox: 'ie',
  liquidFill: 'sugo-liquidfill',
  wordCloud: 'sugo-wordCloud',
  gauge: 'sugo-gauge',
  radar: 'sugo-radar',
  chord: 'sugo-chord',
  link: 'link-chart',
  video: 'sugo-video'
}

export const vizTypeLimitNameMap = {
  table: '显示条数',
  table_flat: '显示条数',
  number: '',
  dist_bar: '显示列数',
  pie: '显示块数',
  line: '显示条数',
  multi_dim_bar: '显示列数',
  multi_dim_line: '显示列数',
  map: '显示块数',
  scatter_map: '显示点数',
  multi_dim_stacked_bar: '显示条数',
  horizontal_bar: '显示条数',
  heat_map: '显示块数',
  bubble: '显示系列数',
  multi_dim_stacked_line: '显示条数',
  balance_bar: '显示条数',
  multi_dim_ratio_bar: '显示列数',
  multi_dim_ratio_line: '显示列数',
  bar_and_line: '显示列数',
  tree: '显示条数',
  force: '显示点数',
  sdk_heat_map: 'SDK热图',
  image: '显示条数',
  sugo_funnel: '显示条数',
  sugo_retention: '显示条数',
  sugo_path_analysis: '显示条数',
  IframeBox: '显示条数',
  liquidFill: '百分比',
  wordCloud: '',
  gauge: '百分比',
  radar: '显示块数',
  chord: '显示关系',
  link: '链接'
}

export const vizTypeHintMap = {
  number: '至少设置一个指标，无需设置维度',
  table: '至少设置一个指标',
  table_flat: '至少设置一个指标/维度，不能同时设为空',
  pie: '需要设置一个指标，一个维度',
  dist_bar: '至少设置一个指标，最多设置一个维度',
  line: '至少设置一个指标，并且设置一个维度',
  multi_dim_bar: '需要设置一个指标，两个维度；第一维度为对比维度，第二个维度作为 X 轴',
  multi_dim_line: '需要设置一个指标，两个维度；第一维度为对比维度，第二个维度作为 X 轴',
  map: '需要设置一个指标，并且设置省份作为维度',
  scatter_map: '需要设置一个指标，并且设置城市或省份与城市作为维度',
  multi_dim_stacked_bar: '需要设置一个指标，两个维度；第一维度为堆积维度，第二个维度作为 X 轴',
  horizontal_bar: '至少设置一个指标，最多设置一个维度',
  heat_map: '需要设置一个指标，两个维度；第一维度为 X 轴，第二个维度作为 Y 轴',
  bubble: '需要设置 2～3 个指标，1～2 个维度',
  multi_dim_stacked_line: '需要设置一个指标，两个维度；第一维度为堆积维度，第二个维度作为 X 轴',
  balance_bar: '需要设置一个指标，一个维度',
  multi_dim_ratio_bar: '需要设置一个指标，两个维度；第一维度为比例堆积维度，第二个维度作为 X 轴',
  multi_dim_ratio_line: '需要设置一个指标，两个维度；第一维度为比例堆积维度，第二个维度作为 X 轴',
  bar_and_line: '至少设置一个指标，一个维度，最后一个指标将以线条展示',
  tree: '需要设置一个指标，至少设置两个维度',
  force: '需要设置一个指标，至少设置一个维度',
  image: '无限制',
  sdk_heat_map: '至少设置一个指标',
  sugo_funnel: '无限制',
  sugo_retention: '无限制',
  sugo_path_analysis: '无限制',
  IframeBox: '需要一个URL',
  liquidFill: '需要设置一个指标',
  wordCloud: '需要设置一个指标,一个维度',
  gauge: '需要设置一个指标',
  radar: '需要至少三个指标,一个维度',
  chord: '需要两个维度',
  link: '无限制'
}

export const vizTypeHintMapForUserAction = _.mapValues(vizTypeHintMap, (val, key) => {
  return val.replace(/指标/g, '事件项').replace(/维度/g, '属性项')
})

const lenLt = n => arr => arr.length < n
const lenLte = n => arr => arr.length <= n
const lenEq = n => arr => arr.length === n
const lenGt = n => arr => n < arr.length
const lenGte = n => arr => n <= arr.length

const vizTypeEnableCheckerDict = {
  number: { metrics: lenGt(0), dimensions: lenEq(0) },
  table: { metrics: lenGt(0) },
  // table_flat 允许不带指标，即查询源数据；但是不带指标时至少要带一个维度
  table_flat: { dimensions: (dims, params) => !_.isEmpty(params.metrics) || !_.isEmpty(dims) },
  pie: { metrics: lenEq(1), dimensions: lenEq(1)},
  dist_bar: { metrics: lenGte(1), dimensions: lenLte(1) },
  line: { metrics: lenGte(1), dimensions: lenEq(1) },
  multi_dim_bar: { metrics: lenEq(1), dimensions: lenEq(2) },
  multi_dim_line: { metrics: lenEq(1), dimensions: lenEq(2) },
  map: { metrics: lenEq(1), dimensions: lenEq(1)},
  scatter_map: { metrics: lenEq(1), dimensions: arr => lenEq(1)(arr) || lenEq(2)(arr)},
  multi_dim_stacked_bar: { metrics: lenEq(1), dimensions: lenEq(2)},
  horizontal_bar: { metrics: lenGte(1), dimensions: lenEq(1)},
  heat_map: { metrics: lenEq(1), dimensions: lenEq(2) },
  bubble: { metrics: arr => lenGte(2)(arr) && lenLte(3)(arr), dimensions: arr => lenEq(2)(arr) || lenEq(1)(arr) },
  multi_dim_stacked_line: { metrics: lenEq(1), dimensions: lenEq(2)},
  balance_bar: { metrics: lenEq(1), dimensions: lenEq(1)},
  multi_dim_ratio_bar: { metrics: lenEq(1), dimensions: lenEq(2) },
  multi_dim_ratio_line: { metrics: lenEq(1), dimensions: lenEq(2) },
  bar_and_line: { metrics: lenGte(1), dimensions: lenEq(1) },
  tree: { metrics: lenEq(1), dimensions: lenGte(2) },
  force: { metrics: lenEq(1), dimensions: lenGte(1) },
  sdk_heat_map: { metrics: lenGt(0) },
  liquidFill: { metrics: lenEq(1), dimensions: lenEq(0) },
  wordCloud: { metrics: lenEq(1), dimensions: lenEq(1) },
  gauge: { metrics: lenEq(1), dimensions: lenEq(0) },
  radar: { metrics: lenGte(3), dimensions: lenEq(1) },
  chord: { dimensions: lenEq(2) }
}

export function checkVizTypeEnable(vizType, params) {
  let checker = vizTypeEnableCheckerDict[vizType]
  if (!checker) {
    return true
  }
  return _.every(Object.keys(checker), prop => checker[prop](params[prop], params))
}
