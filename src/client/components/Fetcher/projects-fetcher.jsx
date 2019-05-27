import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'


export default class ProjectsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let {doFetch} = this.props

    let url = '/app/project/list'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        body={{includeChild: 1}}
        headers={recvJSON.headers}
        url={url}
      >
        {({isFetching, data: resultAndCode, error}) => {
          let projects = _.get(resultAndCode, 'result.model')  || []
          return this.props.children({isFetching, data: projects, error})
        }}
      </Fetch>
    )
  }
}

export const withProjectsFetcher = (Component, mapPropsToFetcherProps = ()=>({})) => props => {
  return (
    <ProjectsFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data}) => {
        return (
          <Component
            {...props}
            dbProjects={data || []}
            isFetchingDbProjects={isFetching}
          />
        )
      }}
    </ProjectsFetcher>
  )
}
