/**
 * @typedef {Object} CreateProjectValidate
 * @property {String|null} name
 */

const Def = {
  name: null
}

const Reg = {
  name(input) {
    if (input === null) return null

    if (!/.{1,32}/.test(input)) {
      return '必填项，内容为1～32个字符'
    }

    return null
  }
}

/**
 * @param {Object} state
 * @param {Object} action
 * @param {Function} next
 * @this {ViewModel}
 */
function scheduler (state, action, next) {
  const storeState = this.store.getState()
  return {
    name: Reg.name(storeState.ViewModel.name)
  }
}

export default {
  name: 'validate',
  scheduler,
  state: { ...Def }
}
