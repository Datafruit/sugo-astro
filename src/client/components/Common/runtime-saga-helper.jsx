import React from 'react'
import _ from 'lodash'

/**
 * 动态 saga model 绑定工具，用法：
 * @@withRuntimeSagaModel(props => ({
 *   namespace: '',
 *   state: {},
 *   reducers: {},
 *   ...
 * })
 * class XXX extends React.Component {
 *   ...
 * }
 *
 * <XXX key={xxxId} /> 使用 key 来实现切换 model
 *
 * @param sagaModelGenerators: props => sagaModel
 * @returns function(*): {new(*=): ComponentWithRuntimeSagaModel, sagaModelInst: *, new<P, S>(props: Readonly<P>): ComponentWithRuntimeSagaModel, new<P, S>(props: P, context?: any): ComponentWithRuntimeSagaModel, prototype: ComponentWithRuntimeSagaModel} 高阶组件
 */
export default function withRuntimeSagaModel(sagaModelGenerators) {
  return WrappedComponent => {
    return class ComponentWithRuntimeSagaModel extends React.Component {
      constructor(props) {
        super(props)
        let sagaModelGeneratorArr = _.isArray(sagaModelGenerators)
          ? sagaModelGenerators
          : [sagaModelGenerators]
        let sagaModelInstArr = sagaModelGeneratorArr.map(gen => gen(props))
        sagaModelInstArr.forEach(inst => {
          window.store.register(inst)
        })
        this.nsArr = sagaModelInstArr.map(inst => inst.namespace)
      }
    
      componentWillUnmount() {
        this.nsArr.forEach(ns => {
          window.store.dump(ns)
        })
      }
    
      render() {
        return (
          <WrappedComponent {...this.props} />
        )
      }
    }
  }
}
