import { BaseService } from './base.service'

export default class SugoGlobalConfig extends BaseService {

  /** @type {SugoGlobalConfig} */
  static instance = null

  constructor() {
    super('SugoGlobalConfig')
  }

    /**
   * @return {SugoGlobalConfig}
   */
  static getInstance() {
    if (SugoGlobalConfig.instance === null) {
      SugoGlobalConfig.instance = new SugoGlobalConfig()
    }
    return SugoGlobalConfig.instance
  }
}