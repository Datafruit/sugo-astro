/**
 * @Author sugo.io<asd>
 * @Date 17-11-1
 */

import Resource from '../resource'

const $resource = {
  // 获取草稿表记录
  list: Resource.create('/app/sdk/get/page-info-paging'),
}

export default {
  /**
   * @param {string} app_id
   * @param {string} app_version
   * @return {Promise.<ResponseStruct<SDKPageInfoDraftModel>>}
   */
  async list(filter) {
    return await $resource.list.get(void 0, filter).json()
  }
}
