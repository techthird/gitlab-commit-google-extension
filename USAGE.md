# 使用说明

## 快速开始

### 1. 安装插件

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目文件夹

### 2. 使用插件

#### 步骤1：登录GitLab
在浏览器中打开GitLab网站并登录（例如：https://gitlab.com）

#### 步骤2：打开插件
点击浏览器工具栏中的插件图标，打开弹窗

#### 步骤3：配置
- **GitLab地址**：输入你的GitLab实例地址
  - 公共GitLab：`https://gitlab.com`
  - 私有GitLab：`https://gitlab.yourcompany.com`

- **项目列表**：输入要检查的项目，每行一个
  ```
  group/project1/main
  group/project2/develop
  namespace/project3/master
  ```

#### 步骤4：检查
点击"一键检查"按钮，等待结果

## 项目路径格式说明

### 标准格式
```
项目路径/分支名
```

### 示例

**示例1：指定分支**
```
mygroup/myproject/main
mygroup/myproject/develop
```

**示例2：不指定分支（默认使用main）**
```
mygroup/myproject
```

**示例3：嵌套项目组**
```
parent-group/child-group/project/main
```

**示例4：用户项目**
```
username/project-name/master
```

## 常见问题

### Q: 提示"未授权"或"401错误"
**A:** 请确保：
1. 已在GitLab网站上登录
2. 当前标签页在GitLab网站上
3. 登录状态未过期

### Q: 提示"项目不存在"或"404错误"
**A:** 请检查：
1. 项目路径是否正确（区分大小写）
2. 是否有权限访问该项目
3. GitLab地址是否正确

### Q: 提示"无权限访问"
**A:** 请确保：
1. 你的账户有该项目的访问权限
2. 项目不是私有的或者你已被添加为成员

### Q: 如何检查多个分支？
**A:** 将同一项目的不同分支作为不同的条目输入：
```
mygroup/myproject/main
mygroup/myproject/develop
mygroup/myproject/feature-branch
```

### Q: 支持私有GitLab实例吗？
**A:** 支持！只需在"GitLab地址"中输入你的私有GitLab地址即可。

## 技术细节

### API端点
插件使用GitLab REST API v4：
```
GET /api/v4/projects/{project_path}/repository/commits?ref_name={branch}&per_page=1
```

### 认证方式
插件会自动使用：
- 当前GitLab网站的Cookie（会话认证）
- 页面中的CSRF Token（如果存在）
- localStorage/sessionStorage中的Token（如果存在）

### 数据展示
- **提交人**：从commit的`author_name`字段获取
- **提交时间**：从commit的`committed_date`或`created_at`字段获取，显示为相对时间
- **提交备注**：从commit的`message`字段获取

## 注意事项

1. ⚠️ 需要在GitLab网站上保持登录状态
2. ⚠️ 确保有权限访问要检查的项目
3. ⚠️ 项目路径区分大小写
4. ⚠️ 如果项目路径包含特殊字符，会自动进行URL编码

