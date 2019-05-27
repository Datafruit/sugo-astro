import React from 'react'
import { Radio } from 'antd'
import ReactMarkdown from 'react-markdown'
import _ from 'lodash'
import CodeBlock from '../view-web/code-block'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

class Docs extends React.Component {
  static propTypes = {
    appid: React.PropTypes.string.isRequired,
    project_id: React.PropTypes.string.isRequired
  }

  static defaultProps = {
    appid: '',
    project_id: ''
  }

  state = {
    value: 1 //1 = Obj-c, 2 = Swift
  }

  renderObjCContent () {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `
## 1. 集成

### 1.1 CocoaPods

**现时我们的发布版本只能通过Cocoapods 1.1.0及以上的版本进行集成**

通过[CocoaPods](https://cocoapods.org)，可方便地在项目中集成此SDK。

#### 1.1.1 配置\`Podfile\`

请在项目根目录下的\`Podfile\`
（如无，请创建或从我们提供的SugoDemo目录中[获取](https://github.com/Datafruit/sugo-objc-sdk/blob/master/SugoDemo/Podfile)并作出相应修改）文件中添加以下字符串：

\`\`\`nginx
pod 'sugo-objc-sdk'
\`\`\`

#### 1.1.2 执行集成命令

关闭Xcode，并在\`Podfile\`目录下执行以下命令：
\`\`\`cmake
pod install
\`\`\`

#### 1.1.3 完成

运行完毕后，打开集成后的\`xcworkspace\`文件即可。

### 1.2 手动安装

为了帮助开发者集成最新且稳定的SDK，我们建议通过Cocoapods来集成，这不仅简单而且易于管理。
然而，为了方便其他集成状况，我们也提供手动安装此SDK的方法。

#### 1.2.1 以子模块的形式添加
以子模块的形式把\`sugo-objc-sdk\`添加进本地仓库中:

\`\`\`nginx
git submodule add git@github.com:Datafruit/sugo-objc-sdk.git
\`\`\`

现在在仓库中能看见Sugo项目文件\`Sugo.xcodeproj\`了。 

#### 1.2.2 把\`Sugo.xcodeproj\`拖到你的项目（或工作空间）中

把\`Sugo.xcodeproj\`拖到需要被集成使用的项目文件中。

#### 1.2.3 嵌入框架（Embed the framework）

选择需要被集成此SDK的项目target，把\`Sugo.framework\`以embeded binary形式添加进去。

## 2. SDK的基础调用

### 2.1 获取SDK配置信息

登陆数果星盘后，可在平台界面中创建项目和数据接入方式，创建数据接入方式时，即可获得项目ID与Token。

### 2.2 配置并获取SDK对象

#### 2.2.1 添加头文件

在集成了SDK的项目中，打开\`AppDelegate.m\`，在文件头部添加：
\`\`\`objectivec
@import Sugo;
\`\`\`
#### 2.2.2 添加SDK对象初始化代码

把以下代码复制到\`AppDelegate.m\`中，并填入已获得的项目ID与Token：
\`\`\`objectivec
- (void)initSugo {
    NSString *projectID = @"${project_id}"; // 项目ID
    NSString *appToken = @"${appid}"; // 应用Token
    SugoBindingsURL = @"${protocol}//${websdk_decide_host}"; // 设置获取绑定事件配置的URL，端口默认为8000
    SugoCollectionURL = @"${collectGateway}"; // 设置传输绑定事件的网管URL，端口默认为80
    SugoCodelessURL = @"${sdk_ws_url}"; // 设置连接可视化埋点的URL，端口默认为8887
    [Sugo sharedInstanceWithID:projectID token:appToken launchOptions:nil];
    [[Sugo sharedInstance] setEnableLogging:YES]; // 如果需要查看SDK的Log，请设置为true
    [[Sugo sharedInstance] setFlushInterval:5]; // 被绑定的事件数据往服务端上传的事件间隔，单位是秒，如若不设置，默认时间是60秒
    [[Sugo sharedInstance] setCacheInterval:60]; // 从服务端拉取绑定事件配置的时间间隔，单位是秒，如若不设置，默认时间是1小时
}
\`\`\`
#### 2.2.3 调用SDK对象初始化代码
添加\`initSugo\`后，在\`AppDelegate\`方法中调用，如下：
\`\`\`objectivec
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    // Override point for customization after application launch.
    [self initSugo];	//调用 \`initSugo\`
    return YES;
}
\`\`\`
`
    return docs
      .replace(/YOUR_TOKEN/gm, appid)
      .replace(/YOUR_PROJECT_ID/gm, project_id)
  }

  renderSwiftContent () {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `
## 1. 集成

### 1.1 CocoaPods

**现时我们的发布版本只能通过Cocoapods 1.1.0及以上的版本进行集成**

通过[CocoaPods](https://cocoapods.org)，可方便地在项目中集成此SDK。

#### 1.1.1 配置\`Podfile\`

请在项目根目录下的\`Podfile\`
（如无，请创建或从我们提供的SugoDemo目录中[获取](https://github.com/Datafruit/sugo-swift-sdk/blob/master/SugoDemo/Podfile)并作出相应修改）文件中添加以下字符串：

\`\`\`nginx
pod 'sugo-swift-sdk'
\`\`\`

#### 1.1.2 执行集成命令

关闭Xcode，并在\`Podfile\`目录下执行以下命令：

\`\`\`cmake
pod install
\`\`\`

#### 1.1.3 完成

运行完毕后，打开集成后的\`xcworkspace\`文件即可。

### 1.2 手动安装

为了帮助开发者集成最新且稳定的SDK，我们建议通过Cocoapods来集成，这不仅简单而且易于管理。
然而，为了方便其他集成状况，我们也提供手动安装此SDK的方法。

#### 1.2.1 以子模块的形式添加
以子模块的形式把\`sugo-swift-sdk\`添加进本地仓库中:

\`\`\`nginx
git submodule add git@github.com:Datafruit/sugo-swift-sdk.git
\`\`\`

现在在仓库中能看见Sugo项目文件（\`Sugo.xcodeproj\`）了。 

#### 1.2.2 把\`Sugo.xcodeproj\`拖到你的项目（或工作空间）中

把\`Sugo.xcodeproj\`拖到需要被集成使用的项目文件中。

#### 1.2.3 嵌入框架（Embed the framework）

选择需要被集成此SDK的项目target，把\`Sugo.framework\`以embeded binary形式添加进去。

## 2. SDK的基础调用

### 2.1 获取SDK配置信息

登陆数果星盘后，可在平台界面中创建项目和数据接入方式，创建数据接入方式时，即可获得项目ID与Token。

### 2.2 配置并获取SDK对象

#### 2.2.1 添加头文件

在集成了SDK的项目中，打开\`AppDelegate.swift\`，在文件头部添加：

\`\`\`swift
import Sugo
\`\`\`

#### 2.2.2 添加SDK对象初始化代码

把以下代码复制到\`AppDelegate.swift\`中，并填入已获得的项目ID与Token：

\`\`\`swift
func initSugo() {
    let id: String = "${project_id}" // 项目ID
    let token: String = "${appid}" // 应用ID
    Sugo.BindingsURL = "${protocol}//${websdk_decide_host}" // 设置获取绑定事件配置的URL，端口默认为8000
    Sugo.CollectionURL = "${collectGateway}" // 设置传输绑定事件的网管URL，端口默认为80
    Sugo.CodelessURL = "${sdk_ws_url}" // 设置连接可视化埋点的URL，端口默认为8887
    Sugo.initialize(id: id, token: token)
    Sugo.mainInstance().loggingEnabled = true // 如果需要查看SDK的Log，请设置为true
    Sugo.mainInstance().flushInterval = 5 // 被绑定的事件数据往服务端上传的时间间隔，单位是秒，如若不设置，默认时间是60秒
    Sugo.mainInstance().cacheInterval = 60 // 从服务端拉取绑定事件配置的时间间隔，单位是秒，如若不设置，默认时间是1小时
}
\`\`\`
#### 2.2.3 调用SDK对象初始化代码

添加\`initSugo\`后，在\`AppDelegate\`方法中调用，如下：

\`\`\`swift
func application(_ application: UIApplication, 
  didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    initSugo()
    return true
}
\`\`\`    
`
    return docs
  }

  renderContent () {
    return (
      this.state.value === 1
        ? this.renderObjCContent()
        : this.renderSwiftContent()
    )
  }

  render () {
    const { appid, project_id } = this.props

    return (
      <div className="markdown-wrap">
        <div>
          <div className="pd1b">
            <p className="aligncenter">请按以下步骤进行 iOS SDK 安装,如有问题请联系在线客服</p>
            <p>您的项目ID为 : <span className="bold font16">{project_id}</span></p>
            <p>您的应用Token为 : <span className="bold font16">{appid}</span></p>
          </div>
        </div>
        <RadioGroup
          onChange={e => {
            this.setState({
              value: e.target.value
            })
          }}
          defaultValue={1}
        >
          <RadioButton value={1}>Objective-C</RadioButton>
          <RadioButton value={2}>Swift</RadioButton>
        </RadioGroup>
        <ReactMarkdown
          source={this.renderContent()}
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
