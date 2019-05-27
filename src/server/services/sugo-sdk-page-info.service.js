import db from '../models'
import _ from 'lodash'
import { defineTypes, PropTypes } from '../../common/checker'

export default class SugoSdkPageInfoService {
  /**
   * 删除相同版本的页面草稿
   */
  static async deleteAllSameVersionSdkPageInfoDraft(token, appVersion, target){
    return await db.SugoSDKPageInfoDraft.destroy({
      where: {
        appid: token,
        app_version: appVersion
      },
      ...target
    })
  }

  /**
   * 删除页面草稿
   */
  static async deleteSDKPageInfoDraft(pageInfoId){
    return await db.SugoSDKPageInfoDraft.destroy({
      where: {
        id: pageInfoId
      }
    })
  }
}
