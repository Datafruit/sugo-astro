/**
 * 扩展的图标
 * props.type 图标类型,列表如下,注意不可省略 `sugo-`,
 * 没有`sugo-`前缀，自动使用antd图标
 */

/**
align-center
align-right
align-left
vertical-bottom
vertical-top
move-down
move-up
setting
vertical-middle
move-bottom
move-top
help
user
edit
save
trash
close
team
path
retention
note
filter
chart
detail
loss-predict
segment-expand
warn
download
measure
nail
add
gear
tab
tag
invisible
down
visible
back
refresh
phone
qq
up
time
number
selection
text
chart-dist_bar
chart-multi_dim_bar
chart-horizontal_bar
chart-multi_dim_ratio_line
chart-table_flat
chart-multi_dim_line
chart-multi_dim_ratio_bar
chart-map
chart-heat_map
chart-balance_bar
chart-multi_dim_stacked_line
chart-line
chart-number
chart-multi_dim_stacked_bar
chart-table
sugo-weidu
 */

import {Icon, Button} from 'antd'
import _ from 'lodash'

export default function Icon2 (props) {
  if (_.startsWith(props.type, 'sugo-')){
    let {type, className, ...rest} = props
    let cls = `sugoicon ${type} ${className || ''}`
    return <i className={cls} {...rest} />
  }
  return <Icon {...props} />
}

export function Button2(props) {
  let {icon, children, ...rest} = props
  if (_.startsWith(icon, 'sugo-')) {
    return (
      <Button {...rest}>
        <Icon2 type={icon} className="font-inherit itbblock-force" />
        {children}
      </Button>
    )
  }
  return <Button icon={icon} {...rest} >{children}</Button>
}
