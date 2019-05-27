
import React, {PropTypes} from 'react-proptypes-proxy'
import Fetch from '../Common/fetch.jsx'
import {sendJSON, includeCookie} from '../../common/fetch-utils'
import _ from 'lodash'

// 主要是为了封装 isFetching 状态，减少界面组件的状态，以便做成无状态组件
export default class Poster extends React.Component {
  static propTypes = {
    url: PropTypes.string.isRequired,
    children: PropTypes.func.isRequired,
    doFetch: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  render() {
    let {doFetch, ...rest} = this.props

    return (
      <Fetch
        ref={ref => this._fetcher = ref}
        lazy={!doFetch}
        method="post"
        params={includeCookie}
        headers={sendJSON.headers}
        {...rest}
      />
    )
  }
}

export function withPoster(mapPropsToFetcherProps = _.constant({})) {
  return function dec(Component) {
    return function (props) {
      let fetcherProps = mapPropsToFetcherProps(props)
      return (
        <Poster {...fetcherProps} >
          {(inject) => {
            return (
              <Component
                {...props}
                {...inject}
              />
            )
          }}
        </Poster>
      )
    }
  }
}
