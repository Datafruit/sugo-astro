/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   08/12/2017
 * @description
 */

import { BaseService } from './base.service'
import { Response } from '../utils/Response'

export class UserService extends BaseService {
  static instance = null

  constructor () {
    /** @see {UserModel} */
    super('SugoUser')
    this.instance = null
  }

  /**
   * @return {UserService}
   */
  static getInstance () {
    if (UserService.instance === null) {
      UserService.instance = new UserService()
    }
    return UserService.instance
  }

  resetPassword (id, password, prevPassword) {
    
  }
}


