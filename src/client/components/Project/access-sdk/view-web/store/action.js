/**
 * Created by asd on 17-7-12.
 */

import { namespace } from '../../../constants'

function create (mark) {
  return `${namespace.access}-sdk-web-edit-${mark}`
}

export default {
  change: create('change'),
  check: create('check'),
  createAppVersion: create('create-app-version'),
  queryProjectsList: create('query-projects-list'),
  queryAppVersion: create('query-app-version'),
  toggleAppVersionStatus: create('toggle-app-version-status'),
  updateAppVersion: create('update-app-version'),
  downloadEvents: create('download-events'),
  batchExport: create('batch-export'),
  batchImport: create('batch-import'),
  saveDataImport: create('save-data-import'),
  showDocs: create('show-docs'),
  searchKey: create('search-key'),
  deployAppEvents: create('deploy-app-events'),
  flushEvents: create('flush-events'),
  filterEvents: create('filter-events'),
  flushPages: create('flush-pages'),
  filterPages: create('filter-pages'),
  filterCategories: create('filter-categories'),
  queryAppCategories: create('query-app-categories'),
  pagesForFilterEvents: create('query-app-apges-for-event-filter')
}
