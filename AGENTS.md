# RuoYi 前端 (v3.9.2) — Agent 指令

## 技术栈

Vue 3 + Vite 8 + Element Plus 2.14 + Pinia + Vue Router 5 + bpmn-js 流程设计器。

## 常用命令

```bash
npm install
npm run dev                           # 开发，端口 80，/dev-api 代理到 localhost:8080
npm run build:prod                    # 生产构建（输出 dist/）
npm run build:stage                   # 预发布构建
npm run preview                       # 预览构建产物
```

## 关键配置文件

| 文件 | 说明 |
|------|------|
| `vite.config.js` | 代理规则、构建分包、路径别名 |
| `.env.development` | 开发环境 API 前缀 `/dev-api` |
| `.env.production` | 生产环境 API 前缀 `/prod-api`，开启 gzip 压缩 |
| `.env.staging` | 预发布环境 API 前缀 `/stage-api` |
| `nginx.conf` | SPA 回退 `try_files` + API 反向代理到 `backend:8080` |

## 架构要点

### 入口与全局注册（src/main.js）
- 全局组件：DictTag、Pagination、FileUpload、ImageUpload、ImagePreview、RightToolbar、Editor
- 全局方法挂载在 `app.config.globalProperties` 上：`useDict`、`download`、`parseTime`、`resetForm`、`handleTree`、`addDateRange`、`getConfigKey`、`selectDictLabel/s`
- `src/permission.js` 在 main.js 中 import（非异步）即生效

### 路由（src/router/index.js）
- `createWebHistory()`（history 模式），需 nginx `try_files` 回退支持
- 白名单：`/login`、`/register`
- 动态路由根据后端菜单权限生成（src/permission.js），登录后通过 `router.addRoute()` 注册
- 工作流设计器路由在 `createRouter()` 之后用 `router.addRoute()` 单独添加（第 192 行），不走 `constantRoutes` / `dynamicRoutes`
- 工作流页面（模型/定义/实例/任务）由后端菜单系统动态加载，**不**在 `dynamicRoutes` 中定义，否则页面空白

### 状态管理（Pinia）
- store/modules：`user`、`settings`、`permission`、`tagsView`、`lock`、`dict`、`app`
- `user` store 包装了 login/getInfo/logOut，内部使用 `new Promise((resolve, reject) => {...})` 包裹 API 调用（可简化）
- `settings` store 的 `isDark` 通过 `@vueuse/core` 的 `useDark()` 管理，在模块顶层调用

### 网络请求（src/utils/request.js）
- axios 实例，自动带 `Authorization: Bearer <token>` 请求头
- 防重复提交：POST/PUT 请求通过 sessionStorage 缓存去重（间隔默认 1s）
- 401 自动弹出重新登录确认框
- 通用下载方法 `download()` 已导出

## 已知问题（来自代码审查）

### 代码缺陷
- **sprintf 崩溃**：`src/utils/ruoyi.js:114` 中 `args[i++]` 的 `args` 未定义，调用即 ReferenceError
- **DictTag Vue 2 过滤器**：`src/components/DictTag/index.vue:22` 的 `{{ unmatchArray | handleArray }}` 是 Vue 2 语法，Vue 3 已删除过滤器，**功能失效**
- **selectDictLabels 逻辑错误**：`src/utils/ruoyi.js:98` 的 `Object.keys(value.split(...))` 返回数组索引字符串而非实际值
- **html2Text XSS 工具**：`src/utils/index.js:150` 使用 `div.innerHTML = val`，调用方如果传入未清洗数据即 XSS
- **resetForm this 上下文**：`src/utils/ruoyi.js:48` 使用 `this.$refs`，仅通过 `proxy.resetForm()` 调用时有效，直接 import 调用会崩溃
- **Pagination 静态默认值**：`src/components/Pagination/index.vue:42` 的 `pagerCount` default 在模块导入时计算（`document.body.clientWidth`），不随窗口变化

### 安全缺陷
- **RSA 私钥暴露**：`src/utils/jsencrypt.js:8` 私钥硬编码在前端源码中，任何人可解密前端"加密"的密码
- **Token Cookie 无安全标记**：`src/utils/auth.js:10` 的 `Cookies.set()` 未设 `Secure`/`SameSite` 属性
- **v-html XSS**：HeaderSearch/index.vue 将用户搜索关键词高亮后 `v-html` 渲染；HeaderNotice/DetailView.vue 通知内容直接 `v-html`
- **dangerouslyUseHTMLString**：register.vue（拼接用户名）和 ExcelImportDialog/index.vue（拼接服务端 msg）均开启此选项
- **postMessage 通配符**：3 个工作流文件使用 `window.parent.postMessage(data, '*')`
- **setTimeout 字符串参数**：2 处使用 `setTimeout("...", 1000)`（类 eval）

### 工程配置
- 无 lint/formatter/test 脚本，`package.json` 中无相关配置
- `console.log`/`warn`/`error` 遍布生产代码（request.js、dict.js、permission.js 等），vite build 未配置 `esbuild.drop` 移除
- Vite 配置中 `baseUrl = 'http://localhost:8080'` 硬编码于 vite.config.js 第 5 行

## 提交通知

- 移除生产环境的 `console.log`
- 不要使用 `v-html` 渲染用户可控数据，改用 `{{ }}` 或 DOMPurify 清洗
- 不要用 `dangerouslyUseHTMLString: true` 拼接用户输入
- 不要在前端源码中包含密钥/凭据