import { dedent } from 'common/sugo-utils'

/**
 * 包裹类似markdown的样式代码
 * example: <PreCode>{`
            [mysqld]
            log-bin=mysql-bin #添加这一行就ok
            binlog-format=ROW #选择row模式
            server_id=1 #配置mysql replaction需要定义，不能和canal的slaveId重复
          `}</PreCode>
 *  */
const PreCode = ({children}) => {
  // let {highlight} = this.props
  // const _node = <span className="highlight-text">{highlight}</span>
  return <pre className="markdown-pre">{dedent(children)}</pre>
}

export default PreCode
