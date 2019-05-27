/**
 * https://reactjs.org/docs/context.html#reactcreatecontext
 * Context 是 React 用于向下传播变量的工具，可以直接在深层组件直接读取某些变量，而不需要一级级往下传递
 */
import React from 'react'

const ContextNameDict = { }

export function getContextByName(contextName) {
  let Context = ContextNameDict[contextName]
  if (!Context) {
    ContextNameDict[contextName] = Context = React.createContext()
  }
  return Context
}

export function withContextConsumer(contextName) {
  const {Consumer} = getContextByName(contextName)
  return function withContext(Component) {
    return function Wrapped(props) {
      return (
        <Consumer>
          {value => {
            return <Component {...props} {...value} />
          }}
        </Consumer>
      )
    }
  }
}

export const ContextNameEnum = {
  // 提供了： loadingProject, projectCurrent, datasourceCurrent, mainTimeDimName, projectList, datasourceList, tagProject, tagDatasource
  ProjectInfo: 'projectInfo'
}
