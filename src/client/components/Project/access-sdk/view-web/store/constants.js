/**
 * @Author sugo.io<asd>
 * @Date 17-10-26
 */

/**
 * 事件状态
 * @type {{DRAFT: number, DEPLOYED: number}}
 */
const TRACK_EVENT_STATE = {
  DRAFT: 0,       // 未部署，还位于草稿表中
  DEPLOYED: 1     // 已部署
}

/**
 * 事件类型->名称映射
 */
const TRACK_EVENT_TYPE_MAP = {
  click: '点击',
  focus: '获取焦点',
  change: '修改',
  submit: '提交',
  undef: '未知事件'
}

/**
 * 视图状态
 */
const WEB_EDITOR_VIEW_STATE = {
  DOCS: 0,        // 显示接入文档
  EDITOR: 1,      // 显示编辑器
  EVENTS_LIST: 2  // 显示事件列表
}

export {
  TRACK_EVENT_STATE,
  TRACK_EVENT_TYPE_MAP,
  WEB_EDITOR_VIEW_STATE
}

