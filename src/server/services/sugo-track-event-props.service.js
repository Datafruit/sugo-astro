/*
 * 用户标签分类服务
 */
import _ from 'lodash'
import { BaseService } from './base.service'

/**
 * 标签类型分类树服务层-CRUD
 */
export default class SugoTrackEventPropsService extends BaseService {
  constructor() {
    super('TrackEventProps')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTrackEventPropsService()
    }
    return this._instance
  }
}
