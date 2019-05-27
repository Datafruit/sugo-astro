import NProgress from 'nprogress'

NProgress.configure({showSpinner: false, color: '#f00'})

//进度条
const AsyncLoading = {
  componentWillMount() {
    NProgress.start()
  },
  componentDidMount() {
    NProgress.done()
  }
}

export default AsyncLoading
