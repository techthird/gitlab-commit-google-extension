# GitLab提交记录检查器

一款Chrome浏览器插件，用于快速检查GitLab代码仓库指定项目、指定分支的最新提交记录。

## 功能特性

- ✅ 支持一次性检查多个项目
- ✅ 显示最新提交的提交时间、提交备注（当天提交记录绿色标注，非当天提交红色标注）、提交人
- ✅ 自动获取当前网站的cookie和header用于API授权
- ✅ 独立标签页打开
- ✅ 使用Manifest V3开发
![](https://wsrv.nl?url=http%3A%2F%2Fmmbiz.qpic.cn%2Fmmbiz_png%2FRJoMExhibuamfNkylCNBCwsLLpn8xkkXUObdFNibicf2azGKxTsnhGs3b67iaY08sw1riapRGMtaHkECO80wZoKpZqg%2F0%3Ffrom%3Dappmsg)

## 安装方法

1. 打开Chrome浏览器，进入扩展程序管理页面：`chrome://extensions/`
2. 开启"开发者模式"（右上角开关）
3. 点击"加载已解压的扩展程序"
4. 选择本项目文件夹
![加载扩展程序](https://wsrv.nl?url=http%3A%2F%2Fmmbiz.qpic.cn%2Fmmbiz_png%2FRJoMExhibuamfNkylCNBCwsLLpn8xkkXUFCGIx2Niam5ibF3gOFOxhiavXEad6KuDWN3tzvXEtnsw6wcxXnOmNaBVg%2F0%3Ffrom%3Dappmsg)



## 使用方法

1. 在GitLab网站上打开任意页面（用于获取cookie和授权信息）
2. 点击浏览器工具栏中的插件图标
3. 输入GitLab地址（例如：`https://gitlab.com`）
4. 输入项目列表，每行一个，格式：`项目路径/分支名`
   ```
   group/project1/main
   group/project2/develop
   group/project3/master
   ```
   如果不指定分支，默认使用`main`分支
5. 点击"一键检查"按钮
6. 查看结果，包括：
   - 项目名称和分支
   - 提交人
   - 提交时间（相对时间显示）
   - 提交备注

![执行效果](https://wsrv.nl?url=http%3A%2F%2Fmmbiz.qpic.cn%2Fmmbiz_png%2FRJoMExhibuamfNkylCNBCwsLLpn8xkkXU3fJXPPqSnP28FeTYfoFhd48T96c2RM3xOia7wm7yZvfKt1auHQk2sCw%2F0%3Ffrom%3Dappmsg)

## 项目结构

```
gitlab-extension/
├── manifest.json          # 扩展配置文件（Manifest V3）
├── popup.html            # 弹窗界面
├── popup.js              # 前端逻辑
├── background.js         # Service Worker（处理API请求）
├── content.js            # Content Script（获取cookie和header）
├── styles.css            # 样式文件
├── icons/                # 图标文件夹
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # 说明文档
```

## 技术说明

### API接口

插件使用GitLab REST API v4获取提交记录：
```
GET /api/v4/projects/{project_path}/repository/commits?ref_name={branch}&per_page=1
```

### 授权方式

插件会自动获取当前GitLab网站的：
- Cookie信息（用于会话认证）
- 页面中的CSRF Token（如果存在）
- localStorage/sessionStorage中的token（如果存在）

### 权限说明

- `cookies`: 获取当前网站的cookie用于API认证
- `storage`: 存储用户配置（可选）
- `activeTab`: 访问当前活动标签页
- `scripting`: 注入content script
- `host_permissions`: 访问GitLab API

## 注意事项

1. 需要在GitLab网站上已登录，插件才能获取到有效的cookie
2. 确保有权限访问要检查的项目
3. 项目路径格式：`group/project` 或 `namespace/project`
4. 如果项目路径包含特殊字符，会自动进行URL编码

## 开发

本项目使用Manifest V3开发，符合Chrome扩展最新规范。

## 许可证

MIT License

