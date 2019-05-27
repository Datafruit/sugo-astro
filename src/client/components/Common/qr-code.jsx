import React from 'react'

export default class QrCode extends React.Component {
  render() {
    let {url, ...rest} = this.props
    return (
      <img src={`/app/qr-image?url=${encodeURIComponent(url)}`} alt="" {...rest} />
    )
  }
}
