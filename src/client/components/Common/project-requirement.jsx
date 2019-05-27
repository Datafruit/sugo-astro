/**
 * 项目需求UI组件
 * 检查项目属性，比如是否设定了用户id等
 * 如果符合条件，返回false，否则返回提示信息UI，提醒用户前往设定
 * @param {object} project 项目
 * @param {datasource} datasource 数据源
 * @param {array} props 验证方法 (project, datasource) => ...
 */
import {Button} from 'antd'
import Link from './link-nojam'
import _ from 'lodash'
import {Auth} from '../../common/permission-control'

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const dsSettingPath = '/console/project/datasource-settings'
const allProps = {
  'datasource.params.titleDimension': '路径分析维度',
  'datasource.params.commonSession': 'SessionID',
  'datasource.params.commonMetric': '用户ID',
  'datasource.params.commonDimensions': '用户行为维度'
}

/**
 * 获取所有需要设定的属性名称
 * @param {obj} obj
 */
const checkProps = (obj, props) => {
  return props.reduce((prev, k) => {
    if (!_.get(obj, k)) {
      let v = allProps[k]
      prev.push(v)
    }
    return prev
  }, [])
}

/**
 * 项目需求UI组件
 * @param {object} project 项目
 * @param {object} datasource 数据源
 * @param {string} title 标题
 * @param {array} props 需要验证的属性，见上面的 allProps, 可以按需要补充新的
 */
export default ({
  project,
  datasource,
  title,
  props = allProps
}) => {
  let datasourceSettingsNeeded = checkProps({project, datasource}, props)
  if (!datasourceSettingsNeeded.length) {
    return false
  }
  return (
    <div
      className="relative"
      style={{height: 'calc(100vh - 200px)'}}
    >
      <div className="center-of-relative aligncenter">
        <p>
          <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
        </p>
        <div className="pd2t">
          要使用{title}, 请到
          <Auth
            auth={dsSettingPath}
            alt={<b>场景数据设置</b>}
          >
            <Link
              className="pointer bold mg1x"
              to={`${dsSettingPath}?id=${project.id}`}
            >场景数据设置</Link>
          </Auth>
          设定这个项目的
          {
            datasourceSettingsNeeded.map(d => {
              return <b className="color-red mg1x" key={d}>[{d}]</b>
            })
          }
        </div>
        <div className="pd2t">
          <Auth
            auth={dsSettingPath}
            alt={<b>场景数据设置</b>}
          >
            <Link to={`${dsSettingPath}?id=${project.id}`}>
              <Button type="primary">马上设置</Button>
            </Link>
          </Auth>
        </div>
      </div>
    </div>
  )
}
