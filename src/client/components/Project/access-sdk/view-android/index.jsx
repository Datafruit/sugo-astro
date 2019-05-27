/**
 * @file WekSDK接入UI
 * 判当前接入的analysis的接入状态
 * 如果是已接入数据，进入编辑UI
 * 如果是未接入，进入接入状态
 *
 * 注：此UI足够简单，不必写store
 */

import React from 'react'
import Accessor from './android-accessor'
import Editor from './android-editor'
import Docs from './docs'

import { PROJECT_STATE, AccessTypes } from '../../constants'

export default class AndroidAccessor extends React.Component {
  static propTypes = {
    project: React.PropTypes.object.isRequired,
    analysis: React.PropTypes.object.isRequired
  }

  static defaultProps = {
    project: {},
    analysis: {}
  }

  render () {
    const { project, analysis } = this.props
    return analysis.status === PROJECT_STATE.Disable
      ? (
        <Accessor
          project={project}
          analysis={analysis}
        />
      )
      : (
        <Editor
          title="Android SDK 维护"
          project={project}
          analysis={analysis}
          entry={`/console/track/${analysis.id}?type=${AccessTypes.Android}`}
        >
          <Docs
            project_id={project.datasource_name}
            appid={analysis.id}
          />
        </Editor>
      )
  }
}
