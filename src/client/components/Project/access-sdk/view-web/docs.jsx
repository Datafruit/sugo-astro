import React from 'react'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import _ from 'lodash'
import CodeBlock from './code-block'

export default class Docs extends React.Component {

  static propTypes = {
    appid: PropTypes.string.isRequired,
    project_id: PropTypes.string.isRequired
  }

  static defaultProps = {
    appid: '',
    project_id: ''
  }

  generateDocs () {
    const { appid, project_id } = this.props
    const { websdk_js_cdn, cdn, collectGateway, websdk_app_host, websdk_decide_host } = window.sugo
    const websitePath = websdk_js_cdn || cdn.split('//')[1]
    const protocol = `${window.location.protocol}`
    // let hostname = cdn.split('//')[1] + '/_bc/sugo-sdk-js/libs'
    // 注意这里的 xxx.match(/^\\/\\//)是双\\因为 PreCode标签会转义一遍，最终结果要为：xxx.match(/^\/\//)

    const docs = `
# 异步载入
\`\`\`javascript
<head>
...
<!-- start sugoio -->
  <script type='text/javascript'>
  
    var SUGOIO_LIB_URL="\/\/${websitePath}/_bc/sugo-sdk-js/libs/sugoio-latest.min.js";
    !function(e,o){function t(e,o){for(var t=0,n=e.length;t<n;t++)o(e[t],t,e)}if(!o.__SV){var n,r,s,c=window,i="sugoio";c[i]=o;try{!function(o){var t=c.atob(o),n=JSON.parse(t).state,r={accessToken:n.access_token,accessTokenExpiresAt:Date.now()+1e3*Number(n.expires_in),projectToken:n.token,projectId:n.project_id,userId:n.user_id,choosePage:n.choose_page,viewType: n.viewType, heatmapType: n.heatmapType,};c.sessionStorage.setItem("editorParams",JSON.stringify(r)),n.hash?c.location.hash=n.hash:c.history?c.history.replaceState("",e.title,c.location.pathname+c.location.search):c.location.hash=""}(c.location.hash.replace("#",""))}catch(a){}finally{!function(o){var n={},r=e,s="blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" ");o.proxy={proxy:function(e,t){return(n[e]||(n[e]=[])).push(t),o.proxy},off:function(e,r){var s=n[e]||[],c=[];return t(s,function(e){e!==r&&c.push(e)}),s[e]=c,o.proxy}},t(s,function(e){n[e]=[],function(e,o,t){"function"==typeof e.addEventListener?e.addEventListener(o,t,!0):e.attachEvent("on"+o,t)}(r,e,function(o){try{t(n[e],function(e){e(o)})}catch(a){console&&"function"==typeof console.error&&console.error(a.stack)}})})}(o)}o._i=[],o.init=function(e,n,r){var c=o;void 0!==r?c=o[r]=[]:r=i,c.people=c.people||[],c.toString=function(e){var o=i;return r!==i&&(o+="."+r),e||(o+=" (stub)"),o},c.people.toString=function(){return c.toString(1)+".people (stub)"},t(s="time_event track track_pageview register register_once unregister set_config".split(" "),function(e){!function(e,o){var t=o.split(".");2===t.length&&(e=e[t[0]],o=t[1]),e[o]=function(){e.push([o].concat(Array.prototype.slice.call(arguments,0)))}}(c,e)}),o._i.push([e,n,r])},o.__SV=1.2,(n=e.createElement("script")).type="text/javascript",n.async=!0,"undefined"!=typeof SUGOIO_CUSTOM_LIB_URL?n.src=SUGOIO_CUSTOM_LIB_URL:"file:"===c.location.protocol&&SUGOIO_LIB_URL.match(/^\\/\\//)?n.src="https:"+SUGOIO_LIB_URL:n.src=SUGOIO_LIB_URL,(r=e.getElementsByTagName("script")[0]).parentNode.insertBefore(n,r)}}(document,window.sugoio||[]);
    sugoio.init('${appid}', {'project_id': '${project_id}'});
  </script>
<!-- end sugoio -->
...
</head>
\`\`\`

以上片段将异步方式加载我们库到页面，并提供了一个全局变量名为sugoio，你可以用它来代码埋点上报数据。 成功加载SDK后数果智能会自动采集页面浏览量。我们还提供一些高级设置：用户属性、页面属性、代码注入等。具体设置方法请参考下面的详细说明。

# init参数配置

\`\`\`javascript
  sugoio.init('${appid}', { // 项目TOKEN
    project_id: '${project_id}', // 项目ID
    api_host: '${collectGateway}', // 数据上报的地址
    app_host: '${protocol}//${websdk_app_host}', // sugoio-latest.min.js文件以及可视化配置时服务端地址
    decide_host: '${protocol}//${websdk_decide_host}', // 加载已埋点配置地址
    loaded: function(lib) { }, // **sugoio** **sdk** 加载完成回调函数
    debug: false // 是否启用debug
  });
\`\`\`

- **${appid}：** 为应用TOKEN。
- **${project_id}：** 为项目ID。
- **api_host：** 数据上报的地址(网关)。
- **app_host：** sugoio-latest.min.js文件以及可视化配置时服务端地址。
- **decide_host：** 加载已埋点配置地址。
- **loaded：** sugoio sdk 加载完成回调函数。
- **enable_hash** 单页应用页面设置开启hash配置(默认false)。
- **duration_track** 是否自动上报停留事件(默认true)。
- **heatmap** 是否开启热图分析功能(默认false)。
- **heatmap_grid_track：** 是否开启网格热图事件上报功能(默认false)。
- **debug** 是否启用debug。

## 用户自定义维度

数果智能 的多维分析工具本身提供了例如 “访问来源”，“城市”,“操作系统"，”浏览器“等等这些维度。这些维度都可以和用户创建的指标进行多维的分析。但是往往不能满足用户对数据多维度分析的要求，因为每个公司的产品都有各自的用户维度，比如客户所服务的公司，用户正在使用的产品版本等等。 数果智能 为了能够让数据分析变得更加的灵活，我们在 JS SDK 中提供了用户自定义维度的API接口:

### **自定义事件上报(代码埋点上报)**

第一次接入 数果智能时，建议先追踪 3~5 个关键的事件，只需要几行代码，便能体验 数果智能 的分析功能。例如：

* 图片社交产品，可以追踪用户浏览图片和评论事件。
* 电商产品，可以追踪用户注册、浏览商品和下订单等事件。

数果智能 SDK 初始化成功后，即可以通过 sugoio.track\(event\_name, \[properties\], \[callback\]\) 记录事件：

* **event_name**: string，必选。表示要追踪的事件名。
* **properties**: object，可选。表示这个事件的属性。
* **callback**: function，可选。表示已经发送完数据之后的回调。

\`\`\`javascript
  // 追踪浏览商品事件
  sugoio.track('ViewProduct', {
    'ProductId': 123456，
    'ProductCatalog': "Laptop Computer",
    'ProductName': 'MacBook Pro',
    'ProductPrice': 888.88,
    'ViewDateTime': +new Date()
  });
\`\`\`

### 数据类型说明

* **object:** 上面 properties 是 object 类型，但是里面必须是 key: value 格式。


# 事件公共属性(超级属性)

\`\`\`javascript
  // sugoio.register 提供全局设置为每条上报记录都设置共有属性，在 Cookie 中永久保存属性，永久有效，如果存在这个属性了则覆盖
  sugoio.register({
    Custom1: 'Custom1',
    Custom2: 'Custom2'
    ...
  });
\`\`\`

# 页面停留事件

\`\`\`javascript
  sugoio.init('${appid}', {
    project_id: '${project_id}',
    loaded: function(lib) {
      sugoio.time_event('停留')
      sugoio._.register_event(window, 'beforeunload', function(){
      sugoio.track('停留', {path_name: location.pathname})
    }, false, true)
  }
  ....
  });
\`\`\`

## sugoio.register_once(object)

在 Cookie 中永久保存属性，如果存在这个属性了则不覆盖

`
    return docs
  }

  render () {
    const { appid, project_id } = this.props
    return (
      <div className="markdown-wrap">
        <div>
          <p className="aligncenter">请按以下步骤进行 JS SDK 安装,如有问题请联系在线客服</p>
          <p>您的项目ID为 : <span className="bold font16">{project_id}</span></p>
          <p>您的应用Token为 : <span className="bold font16">{appid}</span></p>
          <p>请将以下代码放置于您的页面<b>{'<head>'}</b>标签和<b>{'</head>'}</b>标签之间</p>
        </div>
        <ReactMarkdown
          source={this.generateDocs()}
          className="result"
          skipHtml={false}
          escapeHtml={false}
          renderers={{
            code: CodeBlock
          }}
        />
      </div>
    )
  }
}
