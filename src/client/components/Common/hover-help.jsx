import {Popover, Icon, Tooltip} from 'antd'
import classNames from 'classnames'

export default function HoverHelp({
  content, addonBefore, addonAfter,
  type = 'dark', placement, className,
  arrowPointAtCenter,
  icon = 'question-circle',
  link,
  ...rest
}) {
  let iconDom = (
    <Icon
      {...rest}
      type={icon}
      className={classNames('color-blue-grey', className)}
    />
  )
  let linkDom = link
    ? (
      <a
        href={link}
        target="_blank"
        className="color-grey pointer"
      >
        {iconDom}
      </a>
    )
    : iconDom
  if (type === 'dark') {
    return (
      <Tooltip
        overlay={content}
        placement={placement}
        arrowPointAtCenter={arrowPointAtCenter}
      >
        {addonBefore}
        {linkDom}
        {addonAfter}
      </Tooltip>
    )
  }
  return (
    <Popover
      content={content}
      placement={placement}
      arrowPointAtCenter={arrowPointAtCenter}
    >
      {addonBefore}
      {linkDom}
      {addonAfter}
    </Popover>
  )
}

export function HoverHelpWithBox({content, addonBefore, addonAfter, type = 'dark', placement, wrapperProps, className,
                                   arrowPointAtCenter, ...rest}) {
  if (type === 'dark') {
    return (
      <Tooltip
        overlay={content}
        placement={placement}
        arrowPointAtCenter={arrowPointAtCenter}
      >
        <div {...wrapperProps} >
          {addonBefore}
          <Icon
            {...rest}
            type="question-circle"
            className={classNames('color-blue-grey', className)}
          />
          {addonAfter}
        </div>
      </Tooltip>
    )
  }
  return (
    <Popover
      content={content}
      placement={placement}
      arrowPointAtCenter={arrowPointAtCenter}
    >
      <div {...wrapperProps} >
        {addonBefore}
        <Icon
          {...rest}
          type="question-circle"
          className={classNames('color-blue-grey', className)}
        />
        {addonAfter}
      </div>
    </Popover>
  )
}
