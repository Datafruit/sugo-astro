/**
 * @file 微信小程序接入
 */

import React from 'react'
import Accessor from './wx-accessor'
import Docs from './docs'

import { PROJECT_STATE } from '../../constants'

export default class WXMiniAccessor extends React.PureComponent {

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
        <Docs
          project_id={project.datasource_name}
          appid={analysis.id}
        />
      )
  }
}
