import Fetch from '../common/fetch-final'
import { remoteUrl } from '../constants/interface'
import { setLoading } from './common'

const getProjects = (query) => {
  
  return async dispatch => {
    
    setLoading(dispatch, true)

    let res = await Fetch.get(remoteUrl.GET_PROJECT_LIST, query)
    
    setLoading(dispatch, false)
    
    if (res) {
      let ret = res.result
      if (ret.success) dispatch({ type: 'set_projects', data: ret.model })
    }

    return res

  }
  
}

//actions maptoprops
export { getProjects }
