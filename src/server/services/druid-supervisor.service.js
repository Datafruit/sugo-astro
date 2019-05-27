import FetchKit from '../utils/fetch-kit'
import CONFIG from '../config'
import { SDK_DEFAULT_DIMENSIONS } from '../../common/sdk-access-dimensions'
import { convertTypeToDruid } from '../../common/sugo-utils'
import _ from 'lodash'
import AccessDataService from './sugo-access-data-task'

const supervisorHost = CONFIG.druid.supervisorHost
const timeout = 30000

/**
 * druid 创建supervisor服务类
 * @export
 * @class SupervisorService
 */
export default class SupervisorService {

  static getActiveSupervisor () {
    return FetchKit.get(`${supervisorHost}/druid/indexer/v1/supervisor`)
  }

  /**
   * @param {Object} supervisorSpec
   * @return {Promise.<*>}
   */
  static async createSupervisor (supervisorSpec) {
    if (!supervisorSpec) {
      return Error('supervisorSpec is null')
    }
    let { dataSource } = supervisorSpec
    let activeSuperVisors = await this.getActiveSupervisor()
    let activeTasks = await AccessDataService.getActiveTasks()
    let active = _.find(activeTasks, t => t.id.includes(dataSource))
    if (active && !activeSuperVisors.includes(dataSource)) {
      throw new Error('项目正在关闭中，无法启动，请稍后尝试')
    }
    if (active) return { id: dataSource }
    console.log('supervisorSpec => ' + JSON.stringify(supervisorSpec, null, 2))
    const host = await this.getLeaderHost()
    //先请求leader返回supervisor地址
    // http://druid.io/docs/0.9.1.1/development/extensions-core/kafka-ingestion.html
    // 调用kafka indexing service 返回taskid
    // debug(supervisorUrl)
    return FetchKit.post(`http://${host}/druid/indexer/v1/supervisor`, supervisorSpec).then(json => json) //// json => {"id": "mysql_Hy4wdhofx"}
  }

  /**
   * 指定维度的静态列数据源
   * @param {DataSourceModel} dataSource 数据源名称
   * @param {Array<Object>} dimensions
   */
  static async createDefaultSupervisor (dataSource, dimensions) {
    if (!dataSource) {
      throw new Error('createDefaultSupervisor Error: 缺少必要参数.')
    }
    // https://github.com/Datafruit/sugo-analytics/issues/1989
    // 加载维度表的维度组装 dimensionsSpec
    if (!dimensions || dimensions.length === 0) {
      throw new Error('createDefaultSupervisor Error: 缺少维度参数.')
    }

    let supervisorSpec = {
      type: 'default_supervisor',
      dataSource: dataSource.name,
      dimensionsSpec: {
        dimensions
      },
      platform: 'single'
    }

    let supervisorJson = dataSource.supervisorJson

    // 如果是手动导入数据模式//////////////////////////////////////////
    if (supervisorJson) {
      if (typeof supervisorJson === 'string') {
        supervisorJson = JSON.parse(supervisorJson)
      }

      if (_.keys(supervisorJson).length > 0) {
        //重新赋值dataSource和dimensionsSpec熟悉
        if (supervisorJson.dataSchema) { //这种是原始的spec结构可查看 "src/server/config/supervisor.js"
          supervisorJson.dataSchema.dataSource = dataSource //数据源名称跟druid数据源名称对应
          supervisorJson.dataSchema.parser.parseSpec.dimensionsSpec.dimensions = dimensions
        } else {
          supervisorJson.dataSource = dataSource //数据源名称跟druid数据源名称对应
          if (!supervisorJson.dimensionsSpec) supervisorJson.dimensionsSpec = {}
          supervisorJson.dimensionsSpec.dimensions = dimensions
        }
        supervisorSpec = supervisorJson
      }
    }

    return this.createSupervisor(supervisorSpec)
  }

  /**
   * 创建动态维度类型的 supervisor
   * @param {String} dataSource
   * @param {Object} [configUrl]
   * @param {boolean} [withSDKDefaultDimensions]
   * @return {Promise<{id:String}|String>}
   */
  static createSupervisorForDynamicDimension (dataSource, configUrl, withSDKDefaultDimensions) {
    if (!dataSource) {
      throw new Error('createSupervisor Error: 缺少必要参数.')
    }
    if (!configUrl) {
      configUrl = CONFIG.site.collectGateway
    }

    const suffix = CONFIG.ioConfig_Suffix || ''

    // https://github.com/Datafruit/sugo-analytics/issues/1989
    // 动态列方式时候把默认的SDK初始化维度设置到dimensionsSpec 保证不受后面传入参数污染
    //
    // 如果项目中已经有了sdk埋点项目，那么需要将sdk预定义维度传入
    const dimensions = withSDKDefaultDimensions
      ? SDK_DEFAULT_DIMENSIONS.map((dim) => {
        const name = dim[0]
        // 维度类型：0=Long; 1=Float; 2=String; 3=DateString; 4=Date; 5=Int;
        const numType = dim[2] === undefined ? 2 : dim[2] //default is string
        const type = convertTypeToDruid(numType)
        return { name, type }
      }) : []
    // 是否启用ip库解析默认为none=不启用，ip=启用
    const { ipLibSpec = 'none', ipLibPath = undefined, excludeHead = false } = CONFIG.druid
    let defaultSupervisorSpec = {
      type: 'default_supervisor',
      dataSource,
      excludeHead, // 数据接入=>排除接入多余维度： sugo_user_agent,sugo_http_refer,sugo_http_refer,sugo_http_refer,sugo_args
      dimensionsSpec: {
        dynamicDimension: true,
        dimensions
      },
      ipLibSpec: {
        type: ipLibSpec
      },
      // configUrl
      //************** 无限极分支特有功能，他们加了清洗后的topic。 start ********************************
      ioConfig: { // 清洗后真正消费的topic fix #https://github.com/Datafruit/sugo-analytics/issues/1825
        topic: dataSource + suffix, // 默认以’_ETL‘结尾
        consumerProperties: {
          'bootstrap.servers': `${CONFIG.kafka.kafkaServerHost}`
        } // ,
        // taskCount: 1,
        // replicas: 1,
        // taskDuration: 'PT86400S',
        // useEarliestOffset: false
      }
      //************** 无限极分支特有功能，他们加了清洗后的topic。 end  ********************************
    }
    if (ipLibPath) { // 可配置ip库文件地址
      defaultSupervisorSpec.ipLibSpec.path = ipLibPath
    }
    return this.createSupervisor(defaultSupervisorSpec)
  }

  static async getLeaderHost() {
    return await FetchKit.get(`${supervisorHost}/druid/indexer/v1/leader`, null, {
      timeout,
      handleResponse: async res => {
        let host = supervisorHost  //如果leader未返回host用原配置文件的host
        try {
          host = await res.text()
        } catch (e) {
          console.log(`请求${supervisorHost}/druid/indexer/v1/leader错误`)
        }
        return host.indexOf('http') > -1 ? host.replace(/^(http|https)\:\/\//, '') : host
      }
    })
  }

  /**
   * 关闭supervisor task
   * @param supervisorId supervisor task id
   * */
  static async shutdownSupervisor (supervisorId) {
    //先请求leader在找到supervisorHost再 发送请求shutdown
    const host = await this.getLeaderHost()
    const res = await FetchKit.post(`http://${host}/druid/indexer/v1/supervisor/${supervisorId}/shutdown`, null, {
      timeout
    }).catch (e => {
      if (e.message.indexOf('Cannot find any supervisor with id')) { // 说明已经关闭了supervisor
        return { id: supervisorId }
      }
      throw e
    })
    console.log('shutdownSupervisor', res)
    // if (!res.id) {
    //   throw new Error(`操作失败了: ${res}`)
    // }
    return res.id || supervisorId
  }

  /**
   * 获取supervisor的spec信息
   * @param {string} supervisorId 数据源名称(datasouce_name)
   */
  static async getSupervisorSpecInfo(supervisorId) {
    try {
      const host = await this.getLeaderHost()
      return await FetchKit.get(`http://${host}/druid/indexer/v1/supervisor/${supervisorId}/history`, null, {
        timeout
      })
    } catch (error) {
      if(error.message.match(/404:No history for/)){
        throw new Error('此supervisor不存在, 没有历史启动记录')
      }
      throw error
    }
  }

  /**
   * 根据每日估计数据量，取得 supervisor 的 SegmentGranularity 配置
   * <=50000000 DAY PT2H
   * <=100000000 HOUR PT1H
   * <=500000000 HOUR PT20M
   * <=1000000000 HOUR PT20M taskCount: 2
   * > 1000000000 HOUR PT10M taskCount: 2
   *
   * default HOUR PT1H
   *
   * @param dailyLogAmount
   * @returns {string}
   */
  static getSegmentGranularity (dailyLogAmount) {
    if (dailyLogAmount <= 50000000) {
      return 'DAY'
    }
    return 'HOUR'
  }

  /**
   * 根据每日估计数据量，取得 supervisor 的 TaskDuration 配置
   * @param dailyLogAmount
   * @returns {string}
   */
  static getTaskDuration (dailyLogAmount) {
    if (dailyLogAmount <= 50000000) {
      return 'PT2H'
    } else if (dailyLogAmount <= 100000000) {
      return 'PT1H'
    } else if (dailyLogAmount <= 500000000) {
      return 'PT20M'
    } else if (dailyLogAmount <= 1000000000) {
      return 'PT20M'
    } else if (1000000000 < dailyLogAmount) {
      return 'PT10M'
    }
  }

  /**
   * 根据每日估计数据量，取得 supervisor 的 TaskDuration 配置
   * @param dailyLogAmount
   * @returns {number}
   */
  static getTaskCount (dailyLogAmount) {
    if (dailyLogAmount <= 50000000) {
      return 1
    } else if (dailyLogAmount <= 100000000) {
      return 1
    } else if (dailyLogAmount <= 500000000) {
      return 1
    } else if (dailyLogAmount <= 1000000000) {
      return 2
    } else if (1000000000 < dailyLogAmount) {
      return 2
    }
  }

  /**
   * 生成 lucene_supervisor 类型的 supervisor JSON
   * @param {string} dataSourceName
   * @param {{dimSpecs: Object.<{name:string, type:string, format:string?}>[], timeDimensionName: string, dailyLogAmount: number}} opts
   * @returns {Object}
   */
  static generateLuceneSupervisorSpec (dataSourceName, opts) {
    const { ipLibSpec = 'none', ipLibPath = undefined } = CONFIG.druid
    let { dimSpecs, timeDimensionName, dailyLogAmount } = opts

    if (!_.isNumber(dailyLogAmount)) {
      dailyLogAmount = 100000000
    }
    let segmentGranularity = SupervisorService.getSegmentGranularity(dailyLogAmount)
    let taskDuration = SupervisorService.getTaskDuration(dailyLogAmount)
    let taskCount = SupervisorService.getTaskCount(dailyLogAmount)

    const def = {
      type: 'lucene_supervisor',
      dataSchema: {
        dataSource: dataSourceName,
        parser: {
          type: 'string',
          parseSpec: {
            format: 'json',
            timestampSpec: {
              column: timeDimensionName,
              format: 'millis'
            },
            dimensionsSpec: {
              dimensions: dimSpecs,
              spatialDimensions: [],
              dimensionExclusions: []
            }
          }
        },
        metricsSpec: [],
        granularitySpec: {
          type: 'uniform',
          segmentGranularity,
          queryGranularity: {
            type: 'none'
          },
          rollup: false,
          intervals: null
        }
      },
      tuningConfig: {
        type: 'kafka',
        maxRowsInMemory: 500000,
        maxRowsPerSegment: 20000000,
        intermediatePersistPeriod: 'PT10M',
        basePersistDirectory: '/data1/druid/var/tmp',
        basePersistDirectoryStr: null,
        maxPendingPersists: 0,
        indexSpec: {
          bitmap: {
            type: 'concise'
          },
          dimensionCompression: null,
          metricCompression: null
        },
        buildV9Directly: false,
        reportParseExceptions: false,
        handoffConditionTimeout: 0,
        workerThreads: null,
        chatThreads: null,
        chatRetries: 8,
        httpTimeout: 'PT10S',
        shutdownTimeout: 'PT80S',
        maxWarmCount: 1,
        consumerThreadCount: 1
      },
      ioConfig: {
        topic: dataSourceName,
        replicas: 1,
        taskCount,
        taskDuration,
        useEarliestOffset: true,
        period: 'PT30S',
        consumerProperties: {
          'bootstrap.servers': _.get(CONFIG, 'kafka.kafkaServerHost')
        }
      },
      ipLibSpec: {
        type: ipLibSpec
      }
    }

    if (ipLibPath) { // 可配置ip库文件地址
      def.ipLibSpec.path = ipLibPath
    }

    return def
  }

  /**
   * 生成supervisor配置，如果没有指定一些配置项
   * @param {String} dataSource
   * @param {Object} [config]
   * @return {Object}
   */
  static generateDynamicSupervisorSpec (dataSource, config = {}) {
    const { ipLibSpec = 'none', ipLibPath = undefined } = CONFIG.druid

    const def = {
      type: 'default_supervisor',
      dataSchema: {
        dataSource,
        parser: {
          parseSpec: {
            format: 'json',
            dimensionsSpec: {
              dynamicDimension: true,
              dimensions: []
            },
            timestampSpec: {
              column: 'd|sugo_timestamp',
              format: 'millis'
            }
          },
          type: 'standard'
        },
        metricsSpec: [],
        granularitySpec: {
          type: 'uniform',
          segmentGranularity: 'DAY',
          queryGranularity: {
            type: 'none'
          },
          rollup: false,
          intervals: null
        }
      },
      ioConfig: {
        topic: dataSource,
        replicas: 1,
        taskCount: 1,
        taskDuration: 'P1D',
        useEarliestOffset: 'true',
        consumerProperties: {
          'bootstrap.servers': _.get(CONFIG, 'kafka.kafkaServerHost')
        }
      },
      ipLibSpec: {
        type: ipLibSpec
      }
    }

    if (ipLibPath) { // 可配置ip库文件地址
      def.ipLibSpec.path = ipLibPath
    }

    return _.merge({}, def, config)
  }

  /**
   * 生成带时间列的动态列 supervisor 配置
   * @param datasource_name
   * @param time_column
   * @param {object} granularity
   * @param [format]
   * @return {Object}
   */
  static generateSupervisorSpecWithTimeColumn (datasource_name, time_column, granularity, format = 'millis') {
    const timestampSpec = {
      dataSchema: {
        parser: {
          parseSpec: {
            timestampSpec: {
              column: `d|${time_column}`,
              format
            }
          }
        },
        granularitySpec: granularity
      }
    }
    return this.generateDynamicSupervisorSpec(datasource_name, timestampSpec)
  }
}
