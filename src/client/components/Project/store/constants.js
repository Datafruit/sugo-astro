function creator (mark) {
  return `project-list-actions-${mark}`
}

/** UI相关Action */
const UIActionTypes = {
  Message: creator('message'),               // 消息
  CleanMessage: creator('clean-message')          // 清空消息
}

const CommonActionNames = {
  UpdateState: creator('update-state')           // 从外部参数更新state
}

export { UIActionTypes, CommonActionNames }
