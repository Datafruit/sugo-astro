//比较表单变化，仅仅提交有改变的属性
import _ from 'lodash'
export const diff = function (toSubmit, oldOne, propsToSubmit) {
  return propsToSubmit
    .filter(prop => {
      return !_.isEqual(toSubmit[prop], oldOne[prop])
    })
    .reduce((prev, prop) => {
      prev[prop] = toSubmit[prop]
      return prev
    }, {})
}
