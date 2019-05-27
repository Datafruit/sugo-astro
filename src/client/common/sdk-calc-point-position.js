
import { Tooltip } from 'antd'
import _ from 'lodash'
import { EMPTY_VALUE_OR_NULL } from '../../common/constants'
import { HEATMAP_VIEW_TYPE } from '../components/HeatMap/web/store/constants'

export const TEMP_METRIC = '_tempMetric_clicks'

export const APP_TYPE = {
  ios: 'iOS',
  android: 'Android',
  web: 'web'
}

export const Relation_Field = {
  eventId: 'event_id',
  evnetName: 'event_name'
}

/** 热图类型 */
export const HEATMAP_TYPE = {
  /** 事件热图 */
  EVENT: 'event',
  /** 网格热图 */
  GRID: 'grid', 
  /** 混合模式 */
  HYBRID: 'hybrid',  
}

export const widthCount = 36
export const heightCount = 64

export function getPositionByPoint(params) {
  let { point, pointWidth, pointHeight } = params
  point = _.toNumber(point) - 1  //解决位置错误
  let topCount = Math.floor(point / widthCount)
  let leftCount = point % widthCount
  let position = { top: topCount * pointHeight, left: leftCount * pointWidth, height: pointHeight, width: pointWidth }
  return position
}
export function getPointByPosition(params) {
  const { pointBeginY, pointEndY, pointBeginX, pointEndX, pointWidth, pointHeight } = params
  const point = []
  const beginY = Math.floor(pointBeginY / pointHeight)
  const top = beginY * pointHeight
  let countY = Math.ceil((pointEndY - top) / pointHeight)
  const beginX = Math.floor(pointBeginX / pointWidth)
  const left = beginX * pointWidth
  let countX = Math.ceil((pointEndX - left) / pointWidth)
  countY = beginY + countY > heightCount ? (countY - 1) : countY
  countX = beginX + countX > widthCount ? (countX - 1) : countX
  for (let i = 0; i < countY; i++) {
    for (let j = 0; j < countX; j++) {
      point.push((widthCount * (i + beginY)) + beginX + j + 1)
    }
  }
  return {
    point,
    position: {
      top,
      left,
      height: countY * pointHeight,
      width: countX * pointWidth
    }
  }
}

export function createHeatMapPosition(params) {
  let { top, left, width, height, radius, value } = params
  let newRadius = Math.ceil(radius / 2)
  let widthCount = Math.floor(width / newRadius)
  let heightCount = Math.floor(height / newRadius)
  widthCount = widthCount ? widthCount : 1
  heightCount = heightCount ? heightCount : 1
  const y = Math.floor(top)
  const x = Math.floor(left)
  const points = []
  // let isAdd = new Math.seedrandom(`${widthCount}${heightCount}`)
  for (let i = 1; i < widthCount; i++) {
    for (let j = 0; j < heightCount; j++) {
      // if (isAdd() > 0.42) {
      //   continue
      // }
      let point = {
        x: x + (i * newRadius),
        value,
        radius
      }
      point.y = y + newRadius + (j * newRadius)
      // if (point.y > (y + height - newRadius)) {
      //   point.y = y + height - newRadius
      // }
      // if (point.x > (x + width - newRadius)) {
      //   point.x = x + width - newRadius
      // }
      points.push(point)
    }
  }
  return points
}

/**
 * 
 * @param {*} heatMapInfo 热图信息
 * @param {*} selectViewModal 
 * @param {*} queryRelativeTime 时间范围
 * @param {*} dimensionFilters 
 * @param {*} userGroupId 
 * @param {*} relationType 事件查询关联字段
 */

export function getHeatMapFilters(heatMapInfo, selectViewMode, queryRelativeTime, dimensionFilters = [], userGroupId, relationType = 'event_id') {
  let filters = []
  let dimensions = []
  const { events = [], event_groups = [], app_type: systemName } = heatMapInfo
  const eventIds = relationType === Relation_Field.eventId ? (events || []).map(p => p.event_id) : []
  const isWeb = systemName === APP_TYPE.web
  let eventNames = _.uniq(_.flatten(event_groups.map(p => p.event_names)))
  eventNames = relationType === Relation_Field.eventId ? eventNames : _.uniq(eventNames.concat(events.map(p => p.event_name)))
  if (selectViewMode !== HEATMAP_TYPE.GRID) { // 事件热图模式过滤条件
    const notIns = [{
      col: 'event_name',
      'op': 'not in',
      'eq': ['屏幕点击'],
      'type': 'string'
    }]
    dimensions =  relationType === Relation_Field.eventId ? ['event_id'] : ['event_name']
    filters = (
      isWeb ? [] : [{
        op: 'or',
        eq: [
          eventIds.length ? {
            col: 'event_id',
            op: 'in',
            eq: eventIds,
            type: 'string'
          } : null,
          eventNames.length ? {
            col: 'event_name',
            op: 'in',
            eq: eventNames,
            type: 'string'
          } : null,
          {
            col: 'event_name',
            op: 'in',
            eq: ['浏览'],
            type: 'string'
          }
        ].filter(_.identity)
      }]
    ).concat(notIns)
  } else {
    dimensions = ['onclick_point', 'event_name']
    filters = [{
      op: 'or',
      eq: [
        {
          col: 'onclick_point',
          op: 'not nullOrEmpty',
          eq: [EMPTY_VALUE_OR_NULL],
          type: 'string', containsNull: false
        },
        {
          col: 'event_name',
          op: 'in',
          eq: ['浏览'],
          type: 'string'
        }
      ]
    }]
  }
  return {
    filters: [
      {
        col: '__time',
        op: 'in',
        eq: queryRelativeTime,
        dateStringComparingFormat: null
      },
      userGroupId ? {
        col: 'distinct_id',
        op: 'lookupin',
        eq: userGroupId
      }
        : null,
      ...filters,
      ...dimensionFilters.filter(p => p.col)
    ].filter(_.identity),
    dimensions
  }
}

/**
 * @description 解析热图数据格式，输出界面渲染需要格式
 * @export convertWebHeatMapData
 * @param {object} { data, heatmapGroups, viewType, heatmapType }
 * @returns  `{ events, eventGroups, points, pointsGroups }`
 */
export function convertWebHeatMapData({ data, heatmap, viewType, heatmapType }) {
  const totalInfo = data.find(p => p.event_name === '浏览')
  const total = _.get(totalInfo, TEMP_METRIC, 1)
  const calcTotal = val => Math.round(val / total * 100)
  // 事件热图数据
  if (viewType === HEATMAP_VIEW_TYPE.HEATMAP && heatmapType === HEATMAP_TYPE.EVENT) {
    const events = _.map(data, p => {
      let clicks = _.get(p, TEMP_METRIC, 0)
      return {
        ..._.omit(p, TEMP_METRIC),
        clicks,
        clicksProportion: calcTotal(clicks)
      }
    })
    const eventGroups = _.map(heatmap.event_groups, p => {
      let clicks = _.filter(data, d => p.event_names.includes(d.event_name)) || []
      clicks = _.sumBy(clicks, p => _.get(p, TEMP_METRIC, 0))
      return {
        event_path: p.event_path,
        clicks,
        clicksProportion: calcTotal(clicks)
      }
    })
    return {
      events,
      eventGroups
    }
  }
  // 网格热图数据
  if (heatmapType === HEATMAP_TYPE.GRID) {
    const pointsGroups = _.map(heatmap.points, p => {
      let clicks = _.filter(data, d => d.event_name === '屏幕点击' && p.point.includes(_.toNumber(d.onclick_point))) || []
      clicks = _.sumBy(clicks, p => _.get(p, TEMP_METRIC, 0))
      return {
        ...p,
        isGroup: true,
        clicks,
        clicksProportion: calcTotal(clicks)
      }
    })
    const points = data.filter(p => p && p.onclick_point).map(p => {
      const clicks = _.get(p, TEMP_METRIC, 0)
      return {
        ..._.omit(p, TEMP_METRIC),
        clicks,
        clicksProportion: calcTotal(clicks)
      }
    })
    return { points, pointsGroups }
  }
}

/**
 * @description 解析热图数据格式，输出界面渲染需要格式
 * @export
 * @param {any} data 
 * @param {any} params { event_groups, events, points, show_point_group, showAllPoint, relation_type }
 * @returns {object} { events, points, eventGroups pointsGroups }
 */
export function getHeatMapPointData(data, params) {
  const {
    event_groups, // 圈选的事件名称列表
    points: heatPoints, // 圈选的点击格子数列
    events: heatEvents,  // APP热图专有参数
    show_point_group, // APP热图专有参数
    showAllPoint = false, // APP热图专有参数
    relation_type = Relation_Field.eventId
  } = params

  let total = data.find(p => p.event_name === '浏览' || !p.event_id)
  total = _.get(total, TEMP_METRIC, 1)
  const events = _.map(heatEvents, p => {
    let clicks = _.find(data, d => d[relation_type] === p[relation_type]) || {}
    clicks = _.get(clicks, TEMP_METRIC, 0)
    return {
      ...p,
      clicks,
      clicksProportion: Math.round(clicks / total * 100)
    }
  })

  const eventGroups = _.map(event_groups, p => {
    let clicks = _.filter(data, d => p.event_names.includes(d.event_name)) || []
    clicks = _.sumBy(clicks, p => _.get(p, TEMP_METRIC, 0))
    return {
      ...p,
      clicks,
      clicksProportion: Math.round(clicks / total * 100)
    }
  })
  let points = []
  let pointsGroups = []
  if (show_point_group || showAllPoint) {
    pointsGroups = _.map(heatPoints, p => {
      let clicks = _.filter(data, d => d.event_name === '屏幕点击' && p.point.includes(_.toNumber(d.onclick_point))) || []
      clicks = _.sumBy(clicks, p => _.get(p, TEMP_METRIC, 0))
      return {
        ...p,
        clicks,
        isGroup: true,
        clicksProportion: Math.round(clicks / total * 100)
      }
    })
  }
  if (!show_point_group || showAllPoint) {
    points = data.filter(p => p && p.onclick_point).map(p => {
      const clicks = _.get(p, TEMP_METRIC, 0)
      return {
        ...p,
        clicks,
        clicksProportion: Math.round(clicks / total * 100)
      }
    })
  }
  return {
    events,
    eventGroups,
    points,
    pointsGroups
  }
}

export function getHeatMapPointsAndPanel(eventPoints, showDataInHeatPanel, heatMapModal = 'events', imgWidth = 0, imgHeight = 0, slace = 1) {
  let heatMapDivs = []
  let heatPoints = []
  if (heatMapModal === 'events') {
    heatMapDivs = eventPoints.map((p, i) => {
      const { position, clicks = 0, clicksProportion = 0 } = p
      const { top = 0, left = 0, width = 0, height = 0 } = position
      if(top < 0) return null
      return (
        <Tooltip
          title={<div>点击数:{clicks} ({clicksProportion}%)</div>}
          placement="top"
          key={`event-tip-${i}`}
        >
          <div
            style={{
              top: top * slace,
              left: left * slace,
              height: height * slace,
              width: width * slace,
              zIndex: 1000 - i,
              border: '2px solid #40a5ed',
              position: 'absolute',
              background: 'rgba(125,125,125,0.2)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight:'bold'
            }}
            className="event-point-panel point-group elli"
          >
            {
               width * slace > 40 ? `${clicks}(${clicksProportion}%)` : ''
            }
          </div>
        </Tooltip >
      )
    })
  } else {
    const pointWidth = (imgWidth / widthCount).toFixed(2)
    const pointHeight = (imgHeight / heightCount).toFixed(2)
    heatMapDivs = eventPoints.map((p, i) => {
      const { clicks = 0, clicksProportion = 0 } = p
      const { top, left, width, height } = getPositionByPoint({ point: p.onclick_point, pointWidth, pointHeight })
      heatPoints = _.concat(heatPoints, createHeatMapPosition({ top, left, width, height, value: clicksProportion, radius: width * 0.8 }))
      // heatPoints.push({ x: Math.floor(left) + 10, value: clicks, radius: 20, y: Math.floor(top) + 10 })
      return (
        <Tooltip
          title={<div>点击数:{clicks} ({clicksProportion}%) {p.onclick_point}</div>}
          placement="top"
          key={`event-tip-${i}`}
        >
          <div
            style={{ top, left, height: `${height}px`, width: `${width}px`, zIndex: 1000 - i }}
            className="event-point elli"
          />
        </Tooltip>
      )
    })
  }
  return {
    heatPoints,
    heatMapDivs: heatMapDivs.filter(_.identity)
  }
}
