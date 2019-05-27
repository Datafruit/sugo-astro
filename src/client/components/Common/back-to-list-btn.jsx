import {Link} from 'react-router'
import {Button} from 'antd'

export default function AddBtn(props) {
  let {to, title, className = '', type = 'ghost', icon = 'arrow-left'} = props
  return (
    <Link to={to}>
      <Button
        type={type}
        className={className}
        icon={icon}
      >
        {title}
      </Button>
    </Link>
  )
}
