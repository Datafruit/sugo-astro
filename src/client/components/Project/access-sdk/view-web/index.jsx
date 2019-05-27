/**
 * @file WekSDK接入UI
 * 判当前接入的analysis的接入状态
 * 如果是已接入数据，进入编辑UI
 * 如果是未接入，进入接入状态
 *
 * 注：此UI足够简单，不必写store
 */

import React from 'react'
import PropTypes from 'prop-types'
import Accessor from './web-accessor'
import Editor from './web-editor'
import Docs from './docs'

import { compressUrlQuery } from '../../../../../common/sugo-utils'
import { PROJECT_STATE } from '../../constants'

export default class WebAccessor extends React.PureComponent {

  static propTypes = {
    project: PropTypes.object.isRequired,
    analysis: PropTypes.object.isRequired
  }

  static defaultProps = {
    project: {},
    analysis: {}
  }

  render () {
    const { project, analysis } = this.props
    const params = { token: analysis.id, appName: analysis.name, project_id: analysis.project_id }
    return analysis.status === PROJECT_STATE.Disable
      ? (
        <Accessor
          project={project}
          analysis={analysis}
        />
      )
      : (
        <Editor
          title="WEB SDK 维护"
          project={project}
          analysis={analysis}
          entry={`/console/track/choose-website-track/${compressUrlQuery(params)}`}
        >
          <Docs
            project_id={project.datasource_name}
            appid={analysis.id}
          />
        </Editor>
      )
  }
}
