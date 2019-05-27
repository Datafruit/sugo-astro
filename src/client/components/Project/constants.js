/**
 * Created by asd on 17-7-6.
 */

import {
  AccessDataOriginalType,
  AccessDataTableType,
  DIMENSION_TYPES,
  DIMENSION_MAP,
  PLATFORM,
  ProjectState,
  APP_VERSION_STATUS,
  AccessDataType
} from '../../../common/constants'


const namespace = {
  create: 'namespace-project-create',
  access: 'namespace-project-access'
}

const DefaultDataAnalysisName = 'default-data-analysis'

const FileAccessType = [
  AccessDataOriginalType.Csv,
  AccessDataOriginalType.Text,
  AccessDataOriginalType.Excel
]

const CollectorAccessType = [
  AccessDataOriginalType.Log
]

const SDKAccessType = [
  AccessDataOriginalType.Android,
  AccessDataOriginalType.Ios,
  AccessDataOriginalType.Web
]

/**
 * 数据接入类型
 * @see {ACCESS_TYPES}
 */
const AccessTypes = {
  Web: 'web',
  Android: 'android',
  Ios: 'ios',
  Csv: 'CSV',
  Excel: 'excel',                         // 待定
  Text: 'TEXT',
  MySQL: 'MYSQL',
  Log: 'LOG'
}

/** 接入文件扩展名 */
const AccessFileExtName = {
  Csv: 'csv',
  Text: 'txt',
  Excel: 'xsl'
}

export {
  namespace,
  AccessDataType,
  AccessDataTableType,
  AccessDataOriginalType,
  DIMENSION_TYPES,
  DIMENSION_MAP,
  PLATFORM,
  FileAccessType,
  SDKAccessType,
  DefaultDataAnalysisName,
  AccessFileExtName,
  AccessTypes,
  ProjectState as PROJECT_STATE,
  APP_VERSION_STATUS
}
