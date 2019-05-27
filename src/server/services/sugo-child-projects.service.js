import {BaseService} from './base.service'

export default class SugoChildProjectsService extends BaseService {

  static instance = null

  constructor() {
    super('SugoChildProjects')
  }

  static getInstance() {
    if (SugoChildProjectsService.instance === null) {
      SugoChildProjectsService.instance = new SugoChildProjectsService()
    }
    return SugoChildProjectsService.instance
  }
}

