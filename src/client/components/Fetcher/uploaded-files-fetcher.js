/**
 * Created by heganjie on 16/10/6.
 */

import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal  from '../../common/fetch-final'

// let fileServerUrl = window.sugo.file_server_url || ''
// if (window.location.protocol === 'https:') {
//   fileServerUrl = fileServerUrl.replace(/^http(s?)/, 'https')
// }
const fileServerUrl = '/app/uploaded-files/get-file'

export default class UploadedFileFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    type: PropTypes.number,
    fileId: PropTypes.string,
    doFetch: PropTypes.bool,
    useOpenAPI: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true,
    useOpenAPI: false
  }

  createUploadedFile = ({originalName, fileType, path}) => {
    let record = {
      name: originalName,
      type: fileType,
      path
    }
    return FetchFinal.post('/app/uploaded-files/create', record)
  }

  deleteUploadedFile = id => {
    return FetchFinal.delete(`/app/uploaded-files/delete/${id}`)
  }

  render() {
    let {type, fileId, children, useOpenAPI, doFetch} = this.props

    let url = useOpenAPI
      ? '/api/uploaded-files/get'
      : '/app/uploaded-files/get'
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        body={{type, fileId}}
        headers={recvJSON.headers}
        url={url}
        // eslint-disable-next-line react/no-children-prop
        children={({isFetching, data: codeAndResult, error, fetch}) => {
          let data = codeAndResult && codeAndResult.result || []
          data = data.map(d => {
            if (_.startsWith(d.path, 'http') || _.startsWith(d.path, '/static/')) {
              return d
            } else {
              return {
                ...d,
                path: fileServerUrl + d.path
              }
            }
          })
          return children({
            isFetching,
            data,
            error,
            fetch,
            deleteUploadedFile: this.deleteUploadedFile,
            createUploadedFile: this.createUploadedFile
          })
        }}
      />
    )
  }
}

// eslint-disable-next-line react/display-name
export const withUploadedFiles = (Component, mapPropsToFetcherProps = () => ({})) => props => {
  return (
    <UploadedFileFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, fetch, deleteUploadedFile, createUploadedFile}) => {
        return (
          <Component
            {...props}
            files={data || []}
            isFetchingFiles={isFetching}
            reloadFiles={fetch}
            deleteUploadedFile={deleteUploadedFile}
            createUploadedFile={createUploadedFile}
          />
        )
      }}
    </UploadedFileFetcher>
  )
}
