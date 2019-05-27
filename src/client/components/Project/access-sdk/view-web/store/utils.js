/**
 * @Author sugo.io<asd>
 * @Date 17-11-13
 */

/**
 * 返回event的page字段,执行步骤
 * 1. 如果有category,返回category
 * 2. 返回page
 * @param {SDKPageInfoModel} page
 * @return {string}
 */
function getPageField (page) {
  return page.category || page.page
}

/**
 * 生成event的唯一标识
 * @param {TrackEventModel} event
 * @return {string}
 */
function trackEventIdentification (event) {
  return event.page + event.event_path
}

/**
 * 判断两个事件是否为同一元素的事件
 * 由于现在的web埋点可能存在多个域名,所以需要同时判断 page 与 event_path
 * @param {TrackEventModel} base
 * @param {TrackEventModel} target
 * @return {boolean}
 */
function isSameTrackEvent (base, target) {
  return base.page === target.page && base.event_path === target.event_path
}

/**
 * 在列表中查找与base相同的track event记录
 * @param {TrackEventModel} base
 * @param {Array<TrackEventModel>} list
 * @return {?TrackEventModel}
 */
function findTrackEvent (base, list) {
  const match = list.find(record => isSameTrackEvent(base, record))
  return match || null
}

/**
 * 检测事件 base 相对于 target 是否有更新
 * 由于用户可能修事件的任意属性,比如修复event_name,event_type等
 * 所以需要对比事件所有 __用户设置__ 字段才能判断事件是否已部署
 * @param base
 * @param target
 */
const EventKeys = [
  'event_type',
  'event_name',
  'similar_path',
  'event_path_type',
  'event_id',
  'control_event',
  'delegate',
  'code',
  'advance',
  'similar',
  'is_global'
]

/**
 * @param {TrackEventModel} base
 * @param {TrackEventModel} target
 * @return {boolean}
 */
function isUpdated (base, target) {
  return EventKeys.some(key => base[key] !== target[key])
}

export {
  isSameTrackEvent,
  findTrackEvent,
  isUpdated,
  getPageField,
  trackEventIdentification
}
