import React, {PropTypes} from 'react-proptypes-proxy'
import {findDOMNode} from 'react-dom'
import {DragSource, DropTarget, DragDropContext} from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'

// http://gaearon.github.io/react-dnd/examples-sortable-simple.html
const dragSource = {
  beginDrag(props) {
    return {
      id: props.id,
      index: props.index
    }
  }
}

const dragTarget = {
  hover(props, monitor, component) {
    const dragIndex = monitor.getItem().index
    const hoverIndex = props.index

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return
    }

    // Determine rectangle on screen
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect()

    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

    // Determine mouse position
    const clientOffset = monitor.getClientOffset()

    // Get pixels to the top
    const hoverClientY = clientOffset.y - hoverBoundingRect.top

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return
    }

    // Time to actually perform the action
    props.move(dragIndex, hoverIndex)

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex
  }
}

const listItemStyle = {
  border: '1px dashed gray',
  cursor: 'move'
}

@DropTarget('customOrderListItem', dragTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))
@DragSource('customOrderListItem', dragSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
}))
class CustomOrderListItem extends React.Component {
  static propTypes = {
    children: PropTypes.object.isRequired
  }

  render() {
    let {style, connectDragSource, connectDropTarget, isDragging, children: originalChild} = this.props

    const opacity = isDragging ? 0 : 1

    let {
      type: Child,
      props: {
        style: originalStyle,
        ...rest
      }
    } = originalChild

    let dom = (
      <Child
        style={{
          ...listItemStyle,
          ...originalStyle,
          ...style,
          opacity: opacity
        }}
        {...rest}
      />
    )
    return connectDragSource(connectDropTarget(dom))
  }
}

@DragDropContext(HTML5Backend)
export default class CustomOrderList extends React.Component {
  static propTypes = {
    children: PropTypes.array.isRequired,
    onChildrenMove: PropTypes.func.isRequired
  }

  static defaultProps = {}

  state = {}

  render() {
    let {onChildrenMove, children, ...rest} = this.props

    return (
      <div {...rest}>
        {children.map((c, i) => {
          return (
            <CustomOrderListItem
              id={c.key}
              key={c.key}
              index={i}
              move={onChildrenMove}
            >{c}</CustomOrderListItem>
          )
        })}
      </div>
    )
  }
}
