
//decorate class 
export function validateFields(target) {
  target.prototype.validateFields = function () {
    let {validateFields} = this.props.form
    return new Promise(resolve => {
      validateFields((errors, values) => {
        if (errors) resolve(false)
        else resolve(values)
      })
    })
  }
}

export function validateFieldsAndScroll(target) {
  target.prototype.validateFieldsAndScroll = function (fieldNames, options = {}) {
    let { validateFieldsAndScroll } = this.props.form
    return new Promise(resolve => {
      validateFieldsAndScroll(fieldNames, options, (errors, values) => {
        if (errors) resolve(false)
        else resolve(values)
      })
    })
  }
}

export function combineDecorators(...funcs) {
  return function (target) {
    funcs.forEach(function (func) {
      func(target)
    })
  }
}
