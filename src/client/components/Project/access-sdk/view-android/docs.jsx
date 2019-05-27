import React from 'react'
import ReactMarkdown from 'react-markdown'
import _ from 'lodash'
import CodeBlock from '../view-web/code-block'


class Docs extends React.Component {
  static propTypes = {
    appid: React.PropTypes.string.isRequired,
    project_id: React.PropTypes.string.isRequired
  }

  static defaultProps = {
    appid: '',
    project_id: ''
  }

  render () {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `
# Sugo Android SDK 最小使用文档

## 1. SDK 集成

### 1.1 Gradle 集成   

\`\`\`Groovy
dependencies {
    compile 'io.sugo.android:sugo-android-sdk:2.0.0'
}
\`\`\`

---

## 2. SDK 配置

> 请先登录您的【数果星盘】管理台，在数据管理-埋点项目-新建项目-新建应用中，创建您的应用，以获取对应的 Token 等。

### 2.1 AndroidManifest.xml 基本配置
\`\`\`xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- 必要的权限 -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
    <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
    <uses-permission android:name="android.permission.BLUETOOTH"/>

  <application>

    <!-- 设置ProjectId -->
    <meta-data
        android:name="io.sugo.android.SGConfig.ProjectId"
        android:value="${project_id}" />
    
    <!-- 设置 Token -->
    <meta-data
        android:name="io.sugo.android.SGConfig.token"
        android:value="${appid}" />

    <!-- 设置埋点配置地址 -->
    <meta-data
        android:name="io.sugo.android.SGConfig.APIHost"
        android:value="${protocol}//${websdk_decide_host}" />
        
    <!-- 设置可视化埋点地址 -->
    <meta-data
        android:name="io.sugo.android.SGConfig.EditorHost"
        android:value="${sdk_ws_url}" />

    <!-- 设置数据上报地址 -->
    <meta-data
        android:name="io.sugo.android.SGConfig.EventsHost"
        android:value="${collectGateway}" />
            
  </application>
</manifest>
\`\`\`


### 2.2 扫码跳转连接可视化配置
扫码跳转页面

在启动的 Activity 上，也就是配置有
\`\`\`xml
  <intent-filter>
      <action android:name="android.intent.action.MAIN" />

      <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>
\`\`\`
的 Activity 下，添加一下配置

\`\`\`
  <intent-filter>
      <data android:scheme="sugo.${appid}"/>
      <action android:name="android.intent.action.VIEW"/>

      <category android:name="android.intent.category.DEFAULT"/>
      <category android:name="android.intent.category.BROWSABLE"/>
  </intent-filter>
\`\`\`

## 3. SDK 使用

标准的使用实例，应该是在 APP 启动的第一个\`Activity\`中，添加以下代码
\`\`\`Java
public class MainActivity extends Activity {

    public void onCreate(Bundle saved) {
        // SDK 将会初始化，此处若设置 Token 、 ProjectId，将覆盖 AndroidManifest 中的设置
        SugoAPI.startSugo(this, SGConfig.getInstance(this));

    }

}
\`\`\`
`

    return (
      <div className="markdown-wrap">
        <div>
          <p className="aligncenter">请按以下步骤进行 Android SDK 安装,如有问题请联系在线客服</p>
          <p>您的项目ID为 : <span className="bold font16">{project_id}</span></p>
          <p>您的应用Token为 : <span className="bold font16">{appid}</span></p>
        </div>
        <ReactMarkdown
          source={docs}
          className="result"
          renderers={_.assign({}, ReactMarkdown.renderers, {
            code: CodeBlock
          })}
        />
      </div>
    )
  }
}

export default Docs
