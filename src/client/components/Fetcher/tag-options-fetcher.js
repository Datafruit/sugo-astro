/**
 * 查询标签预设过滤条件
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {getTagChildren, getUserTotal} from '../../actions'

export default class TagOptionFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    dimension: PropTypes.object,
    datasourceCurrent: PropTypes.object,
    projectCurrent: PropTypes.object,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  state = {
    data: null,
    isFetching: false,
    userTotal: -1
  }

  componentWillMount() {
    if (this.props.doFetch) {
      this.getData()
    }
  }

  componentWillReceiveProps(nextProps) {
    let props = [
      'dimension',
      'datasourceCurrent',
      'projectCurrent'
    ]
    if (!this.props.doFetch && nextProps.doFetch) {
      this.getData()
    } else if (
      !_.isEqual(
        _.pick(this.props, props),
        _.pick(nextProps, props)
      )
    ) {
      this.getData(nextProps)
    }
  }

  getUserCount = async (projectCurrent) => {
    let { userTotal } = this.state
    if (userTotal === -1) {
      userTotal = await getUserTotal(projectCurrent)
    }
    return userTotal
  }

  getData = async (props = this.props) => {
    this.setState({
      isFetching: true
    })
    let data = null
    let userTotal = -1
    try {
      const { dimension, projectCurrent, datasourceCurrent } = props
      if (dimension.id && !_.isEmpty(datasourceCurrent)) {
        userTotal = await this.getUserCount(projectCurrent)
        data = await getTagChildren(dimension, projectCurrent, datasourceCurrent, userTotal)
        data = data.children.map(c => _.pick(c, ['title', 'value', 'percent', 'exculdValue']))
      }
    } catch (e) {
      console.log(e.stack)
    }
    this.setState({
      isFetching: false,
      data,
      userTotal
    })
  }

  render() {
    let {data, isFetching} = this.state
    return this.props.children({data, isFetching})
  }
}

export const withTagOptionFetcher = (Component, mapPropsToFetcherProps = ()=>({})) => props => {
  return (
    <TagOptionFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data}) => {
        return (
          <Component
            {...props}
            tagOptions={data || []}
            isFetchingTagOptions={isFetching}
          />
        )
      }}
    </TagOptionFetcher>
  )
}
