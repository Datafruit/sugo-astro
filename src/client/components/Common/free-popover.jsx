import React from 'react'
import ReactDOM from 'react-dom'
import {Popover} from 'antd'

function renderFloatingDiv(rect, popOverContent, cleanUp, extraPopoverProps, overlayExtraStyle) {
  return (
    <Popover
      trigger="click"
      content={popOverContent}
      visible={true}
      onVisibleChange={visible => {
        if (!visible) {
          cleanUp()
        }
      }}
      {...extraPopoverProps}
    >
      <div
        style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: 99,
          ...overlayExtraStyle
        }}
      >{'\u00a0'}
      </div>
    </Popover>
  )
}

export default function showPopover(dom, popOverContent, extraPopoverProps = {}, overlayExtraStyle = {}) {
  let div = document.createElement('div')
  div.setAttribute('style', 'pointer-events: none;')
  let body = document.getElementsByTagName('body')[0]

  body.appendChild(div)
  function cleanUp() {
    ReactDOM.unmountComponentAtNode(div)
    body.removeChild(div)
  }

  let rect = dom.getBoundingClientRect()
  let rect0 = {
    top: rect.top + (window.scrollY || 0), // fix ie11 window.scrollY === undefined
    left: rect.left,
    width: rect.width,
    height: rect.height
  }
  ReactDOM.render(renderFloatingDiv(rect0, popOverContent, cleanUp, extraPopoverProps, overlayExtraStyle), div)
  return cleanUp
}