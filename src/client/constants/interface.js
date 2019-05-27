const base = '/app'

const remoteUrl = {
  LOGIN: '/login',
  LOGOUT: '/logout',

  GET_USERS: `${base}/user/get`,
  ADD_USER: `${base}/user/create`,
  EDIT_USER: `${base}/user/update`,
  DELETE_USER: `${base}/user/delete`,

  GET_ROLES: `${base}/role/get`,
  ADD_ROLE: `${base}/role/create`,
  EDIT_ROLE: `${base}/role/update`,
  DELETE_ROLE: `${base}/role/delete`,

  GET_PERMISSIONS: `${base}/role/get/permissions`,

  GET_DATASOURCES: `${base}/datasource/get`,
  ADD_DATASOURCE: `${base}/datasource/create`,
  EDIT_DATASOURCE: `${base}/datasource/update`,
  DELETE_DATASOURCE: `${base}/datasource/delete`,
  GET_RES: `${base}/datasource/get-all-res`,

  GET_DIMENSIONS: '/app/dimension/get',
  ADD_DIMENSION: `${base}/dimension/create`,
  EDIT_DIMENSION: `${base}/dimension/update`,
  DELETE_DIMENSION: `${base}/dimension/delete`,
  SYNC_DIMENSIONS: `${base}/dimension/sync`,
  GET_DRUID_DIMS: `${base}/dimension/getDruidDims`,
  VALID_DIMENSION_FORMULA: `${base}/dimension/get/valid/formula`,
  AUTHORIZE_DIMENSION: `${base}/dimension/authorize`,
  
  ADD_USER_TAG: `${base}/tag-dict/create`,
  EDIT_USER_TAG: `${base}/tag-dict/update`,
  DELETE_USER_TAG: `${base}/tag-dict/delete`,
  SYNC_USER_TAG: `${base}/tag-dict/sync`,
  AUTHORIZE_USER_TAG: `${base}/tag-dict/authorize`,

  GET_MEASURES: '/app/measure/get',
  ADD_MEASURE: `${base}/measure/create`,
  EDIT_MEASURE: `${base}/measure/update`,
  DELETE_MEASURE: `${base}/measure/delete`,
  VALID_FORMULA: `${base}/measure/get/valid/formula`,
  AUTHORIZE_MEASURE: `${base}/measure/authorize`,

  GET_TAGS: `${base}/tag/get`,
  EDIT_TAG: `${base}/tag/update`,
  ADD_TAG: `${base}/tag/create`,
  DELETE_TAG: `${base}/tag/delete`,

  GET_SLICES: `${base}/slices/get/slices`,
  CREATE_SLICES: `${base}/slices/create/slices`,
  UPDATE_SLICES: `${base}/slices/update/slices`,
  DELETE_SLICES: `${base}/slices/delete/slices`,

  GET_RENTENTIONS: `${base}/retention/get`,

  GET_SUGO_FUNNELS: `${base}/funnel/get`,
  CREATE_SUGO_FUNNELS: `${base}/funnel/create`,
  UPDATE_SUGO_FUNNELS: `${base}/funnel/update`,
  DELETE_SUGO_FUNNELS: `${base}/funnel/delete`,

  GET_DASHBOARD: `${base}/dashboards/get`,
  ADD_DASHBOARD: `${base}/dashboards/create`,
  EDIT_DASHBOARD: `${base}/dashboards/update`,
  DELETE_DASHBOARD: `${base}/dashboards/delete`,

  GET_SUBSCRIBE: `${base}/subscribe/get`,
  ADD_SUBSCRIBE: `${base}/subscribe/create`,
  DELETE_SUBSCRIBE: `${base}/subscribe/delete`,

  GET_OVERVIEW: `${base}/overview/get`,
  ADD_OVERVIEW: `${base}/overview/create`,
  DELETE_OVERVIEW: `${base}/overview/delete`,

  GET_USERGROUP: `${base}/usergroup/get`,
  EDIT_USERGROUP: `${base}/usergroup/update`,
  ADD_USERGROUP: `${base}/usergroup/create`,
  DELETE_USERGROUP: `${base}/usergroup/delete`,
  QUERY_USERGROUP: `${base}/usergroup/info`,

  GET_PATHANALYSIS: `${base}/path-analysis/get`,
  EDIT_PATHANALYSIS: `${base}/path-analysis/update`,
  ADD_PATHANALYSIS: `${base}/path-analysis/create`,
  DELETE_PATHANALYSIS: `${base}/path-analysis/delete`,
  QUERY_PATHANALYSIS: `${base}/path-analysis/chart`,

  GET_PROJECT_LIST: `${base}/project/list`,
  MONITOR_ALARMS: `${base}/monitor-alarms`,
  EDIT_PROJECT_ROLES: `${base}/Project/updateProjectRoles`,

  GET_SEGMENTEXPAND: `${base}/segment-expand/get`,
  EDIT_SEGMENTEXPAND: `${base}/segment-expand/update`,
  ADD_SEGMENTEXPAND: `${base}/segment-expand/create`,
  DELETE_SEGMENTEXPAND: `${base}/segment-expand/delete`,
  STATUS_SEGMENTEXPAND: `${base}/segment-expand/status`,
  DOWNLOAD_SEGMENTEXPAND: `${base}/segment-expand/info`,
  SAVEAS_USERGROUP: `${base}/segment-expand/save-as`,

  GET_COMPANY: `${base}/company/get`,
  EDIT_COMPANY: `${base}/company/update`,
  ADD_COMPANY: `${base}/company/create`,
  DELETE_COMPANY: `${base}/company/delete`,

  GET_LIVESCREENS: `${base}/livescreen/get`,
  ADD_LIVESCREENTHEME: `${base}/livescreen/createTheme`,
  ADD_LIVESCREEN: `${base}/livescreen/create`,
  UPDATE_LIVESCREEN: `${base}/livescreen/update`,
  DELETE_LIVESCREEN: `${base}/livescreen/delete`,
  COPY_LIVESCREEN: `${base}/livescreen/copy`,

  GET_TAGTYPE: `${base}/tag-type/get`,
  EDIT_TAGTYPE: `${base}/tag-type/update`,
  ADD_TAGTYPE: `${base}/tag-type/create`,
  DELETE_TAGTYPE: `${base}/tag-type/delete`,

  GET_TAGGROUP: `${base}/tag-group/get`,
  EDIT_TAGGROUP: `${base}/tag-group/update`,
  ADD_TAGGROUP: `${base}/tag-group/create`,
  DELETE_TAGGROUP: `${base}/tag-group/delete`
}

export { remoteUrl }
