/**
 * 用户向导
 * 使用方法：
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {Modal, Button, message} from 'antd'
import {synchronizer} from '../Fetcher/synchronizer'
import classNames from 'classnames'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'

@synchronizer(() => ({
  url: '/app/user-guide-reading-state/states',
  modelName: 'states',
  doSync: true
}))
export default class UserGuide extends React.Component {
  static propTypes = {
    guideName: PropTypes.string.isRequired,
    guideVersion: PropTypes.number.isRequired,
    guideDataGenerator: PropTypes.func.isRequired,
    states: PropTypes.array
  }

  static defaultProps = {
    method: 'get',
    onFetchingStateChange: _.noop,
    cleanDataWhenFetching: false
  }

  state = {
    guideData: null,
    step: null
  }

  componentDidMount() {
    let {innerRef} = this.props
    if (innerRef) {
      innerRef(this)
    }
  }

  componentWillUnmount() {
    let {innerRef} = this.props
    if (innerRef) {
      innerRef(null)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.isFetchingStates && !nextProps.isFetchingStates) {
      let {guideName, guideVersion} = nextProps
      if (!_.some(nextProps.states, rs => rs.guide_name === guideName && guideVersion <= rs.guide_version)) {
        // 向导未被读
        this.showGuide()
      }
    }
  }

  showGuide = () => {
    this.setState({step: 0, guideData: this.props.guideDataGenerator(this)})
  }

  closeGuide = () => {
    this.setState({step: null})
  }

  prevStep = () => {
    let {step} = this.state
    if (step === 0) {
      this.closeGuide()
    } else {
      this.setState({step: step - 1})
    }
  }

  nextStep = () => {
    let {step, guideData} = this.state
    if (step === guideData.length - 1) {
      this.setState({step: 0})
    } else {
      this.setState({step: step + 1})
    }
  }

  markRead = async ev => {
    ev.stopPropagation()
    let {modifyStates, guideVersion, guideName} = this.props
    await modifyStates('', prevStates => {
      if (_.some(prevStates, ps => ps.guide_name === guideName && ps.guide_version === guideVersion)) {
        return prevStates
      }
      return [...(prevStates || []), {
        guide_name: guideName,
        guide_version: guideVersion,
        user_id: _.get(window.sugo, 'user.id')
      }]
    })
    this.closeGuide()
  }

  render() {
    let {step, guideData} = this.state
    if (!guideData || step === null) {
      return null
    }
    let {modal} = guideData[step]
    let {
      title,
      content,
      showPrimaryBtn = false,
      primaryBtnText = '开始使用',
      showAlreadyReadBtn = false,
      showAlreadyReadBtn2 = false,
      alreadyReadBtnText = '不再提醒',
      showNextBtn = false,
      nextBtnText = '下一步',
      showPrevBtn = false,
      prevBtnText = '上一步',
      showExitBtn = true,
      width,
      footnotes,
      wrapClassName
    } = modal

    let visible = _.isNumber(step)
    return (
      <Modal
        visible={visible}
        onCancel={this.closeGuide}
        onOk={this.closeGuide}
        title={title}
        maskClosable={false}
        closable={showExitBtn}
        width={width}
        wrapClassName={classNames('vertical-center-modal', wrapClassName)}
        footer={visible ? (
          <div className="relative pd2">
            <FixWidthHelper
              className="alignleft"
              style={{minHeight: '32px'}}
              toFix="last"
              toFixWidth="200px"
              wrapperClassLast="vertical-center-of-relative"
            >
              {footnotes}
              <div className="alignright">
                <Button
                  type="ghost"
                  onClick={this.prevStep}
                  className={classNames('minw100', {hide: !showPrevBtn})}
                >{prevBtnText}</Button>
                <Button
                  type="primary"
                  onClick={this.nextStep}
                  className={classNames('minw100', {hide: !showNextBtn})}
                >{nextBtnText}</Button>
                <a
                  href="javascript:"
                  onClick={this.markRead}
                  className={classNames('mg2l', {hide: !showAlreadyReadBtn2})}
                >{alreadyReadBtnText}</a>
              </div>
            </FixWidthHelper>
            <Button
              key="submit"
              type="primary"
              size="large"
              className={classNames('minw100 center-of-relative', {hide: !showPrimaryBtn})}
              onClick={this.nextStep}
            >
              {primaryBtnText}
              <a
                href="javascript:"
                onClick={this.markRead}
                style={{right: '-70px'}}
                className={classNames('absolute fw400 font13', {hide: !showAlreadyReadBtn})}
              >{alreadyReadBtnText}</a>
            </Button>
          </div>
        ) : null
        }
      >
        {visible ? content : null}
      </Modal>
    )
  }
}
