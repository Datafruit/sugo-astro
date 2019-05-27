import React, {PropTypes} from 'react-proptypes-proxy'

export default class AsyncHref extends React.Component {
  static propTypes = {
    initFunc: PropTypes.func.isRequired,
    lazy: PropTypes.bool,
    component: PropTypes.any
  }

  static defaultProps = {
    lazy: true,
    component: 'a'
  }

  state = {
    isPending: false,
    alreadyRun: false, // 避免 initFunc 返回 javascript: 而导致重复运行
    href: 'javascript:'
  }

  componentWillMount() {
    let {initFunc, lazy} = this.props
    if (lazy) {
      return
    }
    this.setState({ isPending: true }, async () => {
      this.setState({
        href: await initFunc(),
        isPending: false,
        alreadyRun: true
      })
    })
  }

  work = async () => {
    let {href, isPending, alreadyRun} = this.state
    if (href === 'javascript:' && !isPending && !alreadyRun) {
      this.setState({ isPending: true }, async () => {
        this.setState({
          href: await this.props.initFunc(),
          isPending: false,
          alreadyRun: true
        })
      })
    }
  }

  render() {
    let {children, initFunc, lazy, component: Component, ...rest} = this.props
    let {isPending, href} = this.state
    return (
      <Component
        {...(Component === 'a' ? {href} : {to: href})}
        onMouseOver={lazy ? this.work : undefined}
        {...rest}
      >
        {_.isFunction(children)
          ? children({isPending})
          : href === 'javascript:' ? <span className="ignore-mouse">{children}</span> : children }
      </Component>
    )
  }
}
