import React from 'react'
import { Breadcrumb, Tooltip } from 'antd'
import { Link } from 'react-router'
import _ from 'lodash'
import classNames from 'classnames'
import {Helmet} from 'react-helmet'
import {isEqualWithReactObj} from '../../../common/sugo-utils'

const {siteName} = window.sugo

function getChildrenTextInComponent(comp) {
  if (_.isString(comp) || !comp) {
    return comp
  }
  if (_.isArray(comp)) {
    return getChildrenTextInComponent(comp[0])
  }
  return getChildrenTextInComponent(_.get(comp, 'props.children'))
}

export function renderPageTitle(title) {
  return (
    <Helmet>
      <title>{title ? `${title}-${siteName}` : siteName}</title>
    </Helmet>
  )
}

export default class Bread extends React.Component {
  
  shouldComponentUpdate(nextProps) {
    return !isEqualWithReactObj(this.props, nextProps)
  }
  
  render() {
    let {path, children, extra, style} = this.props
    let pathTitle = path.map(v => v.name).map(getChildrenTextInComponent).filter(_.identity).join('-')
    return (
      <div className="nav-bar" style={style}>
        {renderPageTitle(pathTitle)}
        <div className="fix">
          <div className="itblock">
            <div className="iblock">
              <Breadcrumb>
                {
                  path.map((item, index) => {
                    let {name = '', link} = item
                    let inner = name.length > 10
                      ? <Tooltip title={name}><b>{name}</b></Tooltip>
                      : <b>{name}</b>
                    return (
                      <Breadcrumb.Item
                        key={index}
                        className={classNames('itblock elli', {mw200: index < path.length - 1})}
                      >
                        {
                          link
                            ? <Link style={{color: '#1890ff'}} to={item.link}>{inner}</Link>
                            : inner
                        }
                      </Breadcrumb.Item>)
                  })
                }
              </Breadcrumb>
            </div>
            <div className="itblock mg1l">{extra}</div>
          </div>
          <div className="fright line-height42">
            {children || null}
          </div>
        </div>
      </div>
    )
  }

}

