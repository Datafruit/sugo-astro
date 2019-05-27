/**
 * 用户分群的选择组件
 * 可以通过参数，启用跨项目切换分群功能
 */
import React, {PropTypes} from 'react-proptypes-proxy'
import classNames from 'classnames'
import {Select} from 'antd'
import {withUserGroupLookupsDec} from '../Fetcher/usergroup-lookups-fetcher'
import {getUserGroupReadyRemainTimeInSeconds} from '../../common/usergroup-helper'
import _ from 'lodash'
import Loading from './loading'
import {withUserGroupsDec} from '../Fetcher/data-source-compare-user-group-fetcher'
import {isDiffByPath} from '../../../common/sugo-utils'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {BuiltinUserGroup, UserGroupBuildInTagEnum} from '../../../common/constants'

const {Option, OptGroup} = Select

@withUserGroupsDec(({datasourceCurrent, value, allowCrossProject}) => ({
  dataSourceId: allowCrossProject ? '' : (datasourceCurrent && datasourceCurrent.id || ''),
  doFetch: !!value, // select 聚焦时才加载，或者用户选择过分群才加载
  cleanDataWhenFetching: true,
  query: {
    where: {
      $not: {
        tags: { $contains: UserGroupBuildInTagEnum.UserGroupWithoutLookup }
      }
    }
  }
}))
@withUserGroupLookupsDec(({dataSourceCompareUserGroups, datasourceCurrent}) => ({
  dataSourceId: datasourceCurrent && datasourceCurrent.id,
  doFetch: !_.isEmpty(dataSourceCompareUserGroups),
  exportNameDict: true
}))
export default class UserGroupSelector extends React.Component {
  static propTypes = {
    datasourceCurrent: PropTypes.object.isRequired,
    projectList: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    value: PropTypes.string,
    allowCrossProject: PropTypes.bool,
    showBuildInUserGroups: PropTypes.bool,
    userGroupFilter: PropTypes.func
  }

  static defaultProps = {
    allowCrossProject: false,
    showBuildInUserGroups: true
  }

  projectDsIdDict = {}

  componentWillMount() {
    this.projectDsIdDict = _.keyBy(this.props.projectList, 'datasource_id')
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(nextProps, this.props, 'projectList')) {
      this.projectDsIdDict = _.keyBy(nextProps.projectList, 'datasource_id')
    }
  }

  ugToOption = ug => {
    let {
      isFetchingUserGroupLookups, tIndexLookupNameDict, uIndexLookupNameDict, datasourceCurrent
    } = this.props

    let dataSourceId = datasourceCurrent && datasourceCurrent.id || ''

    // 如果当前项目是 uIndex 项目，则检查 uIndexLookupNameDict 否则检查 tIndexLookupNameDict
    let currProjectIsUindexProject = !!_.get(this.projectDsIdDict[dataSourceId], 'reference_tag_name')

    let {id, title} = ug
    let lookupId = `usergroup_${ug.id}`
    // 创建30s内不许使用
    let remainTime = getUserGroupReadyRemainTimeInSeconds(ug)
    let isCreating = 0 < remainTime
    let isOutDate = !isFetchingUserGroupLookups && !(lookupId in (currProjectIsUindexProject ? uIndexLookupNameDict : tIndexLookupNameDict))

    if (isCreating) {
      title = `分群"${title}"数据创建中，${remainTime} 秒后刷新页面可以使用`
    } else if (isOutDate) {
      title = `分群 "${title}" 已过期，请重新计算`
    }
    return (
      <Option
        key={id}
        value={id}
        disabled={isCreating || isOutDate}
        title={title}
      >{title}</Option>)
  }

  render() {
    let {
      value, dataSourceCompareUserGroups, isFetchingDataSourceCompareUserGroups, onChange, reloadUserGroups,
      className, datasourceCurrent, allowCrossProject, showBuildInUserGroups, userGroupFilter
    } = this.props

    if (_.isFunction(userGroupFilter)) {
      dataSourceCompareUserGroups = dataSourceCompareUserGroups.filter(userGroupFilter)
    }

    let dataSourceId = datasourceCurrent && datasourceCurrent.id || ''
    let ugsGroupByDataSource = allowCrossProject ? _.groupBy(dataSourceCompareUserGroups, 'druid_datasource_id') : {}

    let {firstVisitTimeDimName, firstLoginTimeDimName, loginId} = _.get(datasourceCurrent, 'params') || {}
    let extraOps = showBuildInUserGroups ? [
      <Option key="all" value="" >全部访问用户</Option>,
      <Option
        key={BuiltinUserGroup.newVisitUsers}
        value={BuiltinUserGroup.newVisitUsers}
        disabled={!firstVisitTimeDimName}
        title={firstVisitTimeDimName ? undefined : '使用此分群前需先到“场景数据设置”设置“首次访问时间”维度'}
      >
        新访问用户
      </Option>,
      <Option
        key={BuiltinUserGroup.allLoginUsers}
        value={BuiltinUserGroup.allLoginUsers}
        disabled={!loginId}
        title={loginId ? undefined : '使用此分群前需先到“场景数据设置”设置“登录ID”维度'}
      >
        全部登录用户
      </Option>,
      <Option
        key={BuiltinUserGroup.newLoginUsers}
        value={BuiltinUserGroup.newLoginUsers}
        disabled={!firstLoginTimeDimName || !loginId}
        title={firstLoginTimeDimName && loginId ? undefined : '使用此分群前需先到“场景数据设置”设置“首次登录时间”和“登录ID”维度'}
      >
        新登录用户
      </Option>,
      <Option className="ant-dropdown-menu-item-divider pd0 ignore-mouse" disabled key="divider" />
    ] : []

    let checkedVal = value && (_.includes(value, 'builtin') || _.some(dataSourceCompareUserGroups, ug => ug.id === value))
      ? value : ''
    return (
      <Loading
        isLoading={isFetchingDataSourceCompareUserGroups}
        indicatePosition="right"
        className={classNames(className, 'iblock')}
        indicatorWrapperStyle={{marginRight: '15px'}}
      >
        <Select
          value={checkedVal}
          onChange={nId => {
            if (nId && _.includes(nId, 'builtin')) {
              // 构造假的 userGroup，如果选择全部登录用户，就用 登录ID 作为统计字段（主要用于路径、留存、漏斗）
              onChange(getUsergroupByBuiltinId(nId, datasourceCurrent))
              return
            }
            let group = nId && _.find(dataSourceCompareUserGroups, g => g.id === nId) || undefined
            onChange(group)
          }}
          onFocus={() => {
            if (_.some(dataSourceCompareUserGroups, ug => ug.druid_datasource_id === dataSourceId)) {
              return
            }
            reloadUserGroups()
          }}
          dropdownMatchSelectWidth={false}
          className="width-100"
          placeholder="全部用户"
          {...enableSelectSearch}
        >
          {allowCrossProject
            ? [
              ...extraOps,
              ..._(ugsGroupByDataSource).keys().orderBy(dsId => dsId === dataSourceId ? 0 : 1).map(dsId => {
                let proj = this.projectDsIdDict[dsId]
                let ugs = ugsGroupByDataSource[dsId]
                return (
                  <OptGroup key={dsId} label={proj && proj.name || dsId}>
                    {ugs.map(this.ugToOption)}
                  </OptGroup>
                )
              }).value()
            ]
            : [
              ...extraOps,
              ...dataSourceCompareUserGroups.map(this.ugToOption)
            ]}
        </Select>
      </Loading>
    )
  }
}

export function getUsergroupByBuiltinId(ugId, datasourceCurrent) {
  if (!isBuiltinUsergroupId(ugId) || !datasourceCurrent) {
    throw new Error('Incorrect args')
  }
  return {
    id: ugId,
    params: {
      groupby: _.endsWith(ugId, 'login-users')
        ? _.get(datasourceCurrent, 'params.loginId')
        : _.get(datasourceCurrent, 'params.commonMetric[0]')
    }
  }
}

export function isBuiltinUsergroupId(ugId) {
  return _.includes(ugId, 'builtin')
}
