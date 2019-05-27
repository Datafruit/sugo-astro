/**
 * Created on 15/03/2017.
 */

import _ from 'lodash'
import React from 'react'
import { Tabs, Popover, Icon, Spin } from 'antd'
import Bread from '../Common/bread'
import UserBehavior from '../Datasource/settings'
import SceneDataRFM  from './scene-data-RFM'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from 'client/actions'
import { SceneType, AccessDataType } from '../../../common/constants'
import UserTypeScene from '../Datasource/user-type-scene'
import MicroSetTypeScene from '../Datasource/microset-type-scene'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

const TabPane = Tabs.TabPane
const showRFMTab = _.some(window.sugo.menus || [], m => {
  if (!_.isArray(m.children)) return false
  return m.children.some(r => _.isString(r.path) && r.path.indexOf('/console/rfm') === 0)
})

// 菜单包含留存功能说明就有行为分析等菜单设置
const showBehaviourSetting = _.flatMap(window.sugo.menus || [], m => _.map(m.children, p => p.path)).includes('/console/retention')

const SceneTypeStringMap = {}
Object.keys(SceneType).forEach(n => SceneTypeStringMap[n] = SceneType[n].toString())

/**
 * @description 场景数据设置组件
 * @class SceneData
 * @extends {React.Component}
 */
@connect(mapStateToProps, mapDispatchToProps)
class SceneData extends React.Component {

  componentDidMount () {
    this.fetch()
  }

  componentWillReceiveProps (nextProps) {
    //如果url指定了id或者datasource_id，并且跟顶部菜单不一致
    //主动切换顶部菜单
    const { query: { id } } = nextProps.location
    let nid = nextProps.datasourceCurrent.id
    let {changeProject, projectList, datasourceList} = nextProps
    let nDatasourceId = _.get(_.find(datasourceList, {id}), 'id')
    let proj = _.find(projectList, { datasource_id: nDatasourceId})
    if (
      proj && nid !== nDatasourceId &&
      !this.onChange
    ) {
      this.shouldNotChangeProject = true
      changeProject(proj.id)
      this.props.changeUrl({ id }, 'replace')
    }

    const { id: nextProjId } = nextProps.projectCurrent
    const { id: prevProjId } = this.props.projectCurrent
    if (prevProjId !== nextProjId) {
      this.fetch(nextProps)
    }
  }

  fetch (props = this.props) {
    let datasourceId = _.get(props, 'datasourceCurrent.id')
    // this.props.changeUrl({
    //   id: undefined
    // })
    if (datasourceId) {
      this.props.getDimensions(datasourceId)
    }
  }

  changeType (type) {
    this.props.changeUrl({
      type
    })
  }

  render () {
    const {
      dimensions,
      loadingProject,
      projectCurrent,
      projectList,
      loading,
      location: {
        query: {
          type = SceneTypeStringMap.UserType
        }
      }
    } = this.props

    let help = (
      <div className="width300">
        <p>场景数据设置是配置该场景项目要接入的数据字段，只有正确配置该场景设置后，才可以使用用户行为分析的相应模型，做一些行为分析，如漏斗分析、留存分析和用户行为路径分析等。</p>
      </div>
    )
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <Icon type="question-circle-o" className="font14 iblock"/>
      </Popover>
    )

    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            { name: '场景数据设置' }
          ]}
          extra={extra}
        />
        <Spin spinning={loadingProject || loading}>
          <div className="pd2y pd3x">
            <Tabs
              type="card"
              defaultActiveKey={type}
              onChange={key => this.changeType(key)}
            >
              {
                !showBehaviourSetting ? null :
                  (
                    [
                      <TabPane
                        tab="用户类型数据设置"
                        key={SceneTypeStringMap.UserType}
                      >
                        <UserTypeScene {...this.props} />
                      </TabPane>,

                      <TabPane
                        tab="用户行为数据设置"
                        key={SceneTypeStringMap.UserBehavior}
                      >
                        <UserBehavior {...this.props} />
                      </TabPane>
                    ]
                  )
              }
              {
                projectCurrent.access_type === AccessDataType.Tag
                  ?
                  <TabPane
                    tab="用户画像设置"
                    key={SceneTypeStringMap.SetMicroPicture}
                  >
                    <MicroSetTypeScene {...this.props} />
                  </TabPane>
                  : null
              }
             
              {showRFMTab
                ? (
                  <TabPane tab="RFM数据设置" key={SceneTypeStringMap.RFM}>
                    <SceneDataRFM
                      projects={projectList}
                      project={projectCurrent}
                      dimensions={dimensions}
                    />
                  </TabPane>
                )
                : null
              }
            </Tabs>
          </div>
        </Spin>
      </div>
    )
  }
}

export default SceneData
