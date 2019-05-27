import React, {PropTypes} from 'react-proptypes-proxy'
import _ from 'lodash'
import {ReadLineAsString} from 'next-reader'

const ReadLineType = ReadLineAsString.Type

export const LocalFileLinesReaderStateEnum = {
  idle: 'idle',
  reading: 'reading',
  pause: 'pause',
  done: 'done',
  error: 'error'
}

export default class LocalFileLinesReader extends React.Component {
  static propTypes = {
    file: PropTypes.object.isRequired,
    doRead: PropTypes.bool,
    children: PropTypes.func,
    onData: PropTypes.func,
    onError: PropTypes.func
  }

  static defaultProps = {
    doRead: true,
    children: null
  }

  state = {
    readerState: LocalFileLinesReaderStateEnum.idle,
    readingProgress: 0,
    data: null,
    error: null
  }

  reader = null
  readFileCount = 0

  componentWillMount() {
    let {file, doRead} = this.props
    if (file && doRead) {
      this.reader = this.startToRead(file)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.file, this.props.file) && nextProps.doRead) {
      if (nextProps.file) {
        this.reader = this.startToRead(nextProps.file)
      } else {
        this.readFileCount += 1 // 停止输出数据
        this.reader = null
        this.setState({
          readerState: LocalFileLinesReaderStateEnum.idle,
          readingProgress: 0,
          data: null,
          error: null
        })
      }
    } else if (!this.props.doRead && nextProps.doRead) {
      this.reader = this.startToRead(nextProps.file)
    } else if (this.props.doRead && !nextProps.doRead) {
      this.readFileCount += 1 // 停止输出数据
      this.reader = null
      this.setState({
        readerState: LocalFileLinesReaderStateEnum.idle,
        readingProgress: 0,
        data: null,
        error: null
      })
    }
  }

  componentWillUnmount() {
    this.readFileCount += 1 // 停止输出数据
    this.reader = null
  }

  startToRead(file) {
    let reader = new ReadLineAsString(file)
    this.readFileCount += 1
    const currFileIdx = this.readFileCount

    let totalSize = file.size, readedByte = 0
    reader.subscribe(
      (record) => {
        if (this.readFileCount !== currFileIdx || record.type === ReadLineType.line) {
          return
        }

        let {onData} = this.props
        const {no, size, data} = record
        readedByte += size
        this.setState({data, readerState: LocalFileLinesReaderStateEnum.pause, readingProgress: readedByte / totalSize})
        if (onData) {
          onData(data)
        }
      },
      error => {
        reader.pause()
        if (this.readFileCount !== currFileIdx) {
          return
        }
        let {onError} = this.props
        this.setState({error, readerState: LocalFileLinesReaderStateEnum.error, data: []})
        if (onError) {
          onError(error)
        }
      },
      () => {
        if (this.readFileCount !== currFileIdx) {
          return
        }
        this.setState({readingProgress: 1, readerState: LocalFileLinesReaderStateEnum.done})
      }
    )
    this.setState({
      readerState: LocalFileLinesReaderStateEnum.reading,
      readingProgress: 0,
      data: null,
      error: null
    }, () => {
      reader.read()
      reader.pause()
    })

    return reader
  }

  readNextPart = () => {
    if (this.reader && this.state.readerState === LocalFileLinesReaderStateEnum.pause) {
      this.reader.resume()
      this.reader.pause()
    }
  }

  render() {
    let {children} = this.props
    if (_.isFunction(children)) {
      return children({...this.state, readNextPart: this.readNextPart})
    }
    return children
  }
}
