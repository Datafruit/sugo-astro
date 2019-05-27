import * as ls from '../common/localstorage'
import deepCopy from '../../common/deep-copy'
// const saveToLsList = ['usergroups', 'slices', 'dashboards']
const saveToLsList = []
/**
 * 从初始状态构建constants
 * @param {object} initState
 * @return {object}
 *
    let initState = {
        loading: false,
        users: [],
        total: 0
    }

    const types = constantFactory(initState)

    types = {
        set_loading: 'set_loading',
        set_total: 'set_total',
        set_users: 'set_users',
        add_users: 'add_users',
        del_users: 'del_users',
        update_users: 'update_users'
    }

 */
function typesFactory (initState) {
  let obj = {}
  let keys = Object.keys(initState)
  keys.forEach(key => {
    let value = initState[key]
    let methods = ['set']
    if (Array.isArray(value)) {
      methods = ['set', 'add', 'del', 'update']
    }
    methods.forEach(met => {
      let name = met + '_' + key
      obj[name] = name
    })
  })
  return Object.freeze(obj)
}

/**
 * 从初始状态构建reducer
 * @param {object} initState
 * @return {function}
 *
  const reducers = reducerFactory(initState)

  //all through 'data' key

  //set will replace the whole value
  dispatch({
    type: types.set_loading
    ,data: true
  })
  dispatch({
    type: types.set_users
    ,data: [{ name: 'apple' }]
  })

  //add will unshift/push one item into array
  dispatch({
    type: types.add_users
    ,data: { name: 'apple' }
    //optional, default is 'unshift'
    ,method: 'push'
  })

  //del will remove one item with same id or ===
  dispatch({
    type: types.del_users
    ,data: { id: 'appleid' }
    //optional compare fucntion default is (a, b) => a.id === b.id
    ,compare: (a, b) => a.name === b.name
    //optional default is 'id'
    ,prop: 'id'
  })

  //update will update one item with same id by default
  dispatch({
    type: types.update_users
    ,data: { id: 'appleid', name: 'orange' }
    //optional compare fucntion default is (a, b) => a.id === b.id
    ,compare: (a, b) => a.name === b.name
    //optional default is 'id'
    ,prop: 'id'
  })

  //use custom function as updater to update multiple props in one action
  dispatch({
    type: types.custom
    ,custom: state => {
      state.total = 1
      state.users = []
      return state
    }
  })
 */
export default function(initState) {

  let types = typesFactory(initState)

  return function(state = initState, action) {

    let mutations = {}

    function mutate(prop) {
      return Object.assign(deepCopy(state), prop)
    }

    //build mutation tree
    Object.keys(types).forEach(typ => {
      let arr = typ.split('_')
      let method = arr[0]
      let target = arr[1]
      let act
      if (method === 'set') {
        act = action => {
          let obj = {
            [target]: deepCopy(action.data)
          }
          if(saveToLsList.includes(target)) ls.set('ls_' + target, obj[target])
          return mutate(obj)
        }
      } else if (method === 'add') {
        act = action => {
          let rt = target
          let {method = 'unshift'} = action
          let arr = deepCopy(state[rt])
          arr[method](action.data)
          let obj = {
            [rt]: arr
          }
          if(saveToLsList.includes(rt)) ls.set('ls_' + rt, obj[rt])
          return mutate(obj)
        }
      } else if (method === 'del') {
        act = action => {
          let rt = target
          let arr0 = deepCopy(state[rt])
          let {data, prop = 'id', compare} = action
          for (let i = 0, len = arr0.length; i < len; i++) {
            let item = arr0[i]
            //only check for object array
            let compareRes = compare
              ? compare(item, data)
              : item[prop] === data[prop]
            if (compareRes) {
              arr0.splice(i, 1)
              break
            }
          }
          let obj = {
            [rt]: arr0
          }
          if(saveToLsList.includes(rt)) ls.set('ls_' + rt, obj[rt])
          return mutate(obj)
        }
      } else if (method === 'update') {
        act = action => {
          let rt = target
          let arr0 = deepCopy(state[rt])
          let {data, prop = 'id', compare} = action
          for (let i = 0, len = arr0.length; i < len; i++) {
            let item = arr0[i]
            let compareRes = compare
              ? compare(item, data)
              : item[prop] === data[prop]
            if (compareRes) {
              arr0.splice(i, 1, Object.assign(item, data))
              break
            }
          }
          let obj = {
            [rt]: arr0
          }
          if(saveToLsList.includes(rt)) ls.set('ls_' + rt, obj[rt])
          return mutate(obj)
        }
      }
      mutations[typ] = act
    })

    if (action.type === 'custom') {
      return action.func(deepCopy(state))
    }
    let func = mutations[action.type]
    if (func) return func(action)
    else return mutate({})
  }

}
