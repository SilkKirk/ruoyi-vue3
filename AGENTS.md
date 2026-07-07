# RuoYi 前端 — Agent 指令

Vue 3.5 / Vite 8.1 / Element Plus 2.14 / Pinia 3.0 / Vue Router 5.1 / bpmn-js 17.x（流程设计器）。

## 常用命令

```bash
npm install                     # 安装依赖
npm run dev                     # 开发端口 80，/dev-api → localhost:8080
npm run build:prod              # 生产构建（dist/）
npm run build:stage             # 预发布构建
npm run preview                 # 预览构建产物
```

**无 lint/test/formatter 脚本**，项目中无相关配置。

## 配置

| 文件 | 说明 |
|------|------|
| `vite.config.js` | 代理规则、分包、别名 `@→src/` |
| `.env.development` | `VITE_APP_BASE_API=/dev-api` |
| `.env.production` | `VITE_APP_BASE_API=/prod-api`，gzip 压缩 |
| `.env.staging` | `VITE_APP_BASE_API=/stage-api` |
| `nginx.conf` | SPA 回退 + `/prod-api/` → `backend:8080` |

## 开发代理（vite.config.js）

```javascript
'/dev-api': { target: 'http://localhost:8080', rewrite: p => p.replace('/dev-api', '') }
```

**重要**：代理会**剥离** `/dev-api` 前缀后再转发到后端。所以后端接口是 `/workflow/instance/list` 而非 `/dev-api/workflow/instance/list`。

## 启动注意（Windows）

```powershell
# 后台启动（路径由 ruoyi-run skill 定义）
Start-Process -NoNewWindow -FilePath "E:\nodejs\node_global\npm.cmd" -ArgumentList "run dev" -WorkingDirectory "E:\home\ruoyi-vue3"
```

`npm install` 在拉取代码后可能需要重新执行（尤其 `package-lock.json` 变更时）。

## 架构要点

### 入口（src/main.js）
- 全局组件：DictTag、Pagination、FileUpload、ImageUpload、ImagePreview、RightToolbar、Editor
- 全局方法：`useDict`、`download`、`parseTime`、`resetForm`、`handleTree`、`addDateRange`、`getConfigKey`、`selectDictLabel/s`
- `src/permission.js` 被 import 即生效，登录后加载动态路由

### 路由陷阱（src/router/index.js）
- `createWebHistory()` → nginx 需 `try_files` 回退
- 白名单：`/login`、`/register`
- 工作流设计器路由在 `createRouter()` 之后用 `router.addRoute()` 单独添加
- **工作流管理页面（模型/定义/实例/任务）由后端菜单系统动态加载，不在 `dynamicRoutes` 中定义**，否则页面空白

### 网络请求（src/utils/request.js）
- axios 实例，`baseURL` 来自 `import.meta.env.VITE_APP_BASE_API`
- 自动带 `Authorization: Bearer <token>`
- POST/PUT 通过 sessionStorage 防重复提交（间隔 1s）
- 401 弹出重新登录确认框

### 构建分包
- `vendor-element` / `vendor-echarts` / `vendor-bpmn` / `vendor-vue` / `vendor`

## 已知代码缺陷

- **sprintf 崩溃**：`src/utils/ruoyi.js:114` `args[i++]` 的 `args` 未定义，调用即 ReferenceError
- **DictTag 过滤器失效**：`src/components/DictTag/index.vue:22` `{{ unmatchArray | handleArray }}` 是 Vue 2 语法，Vue 3 已删除过滤器
- **selectDictLabels 逻辑错误**：`src/utils/ruoyi.js:98` `Object.keys(value.split(...))` 返回索引字符串
- **html2Text XSS**：`src/utils/index.js:150` 用 `div.innerHTML` 转换，调用方传未清洗数据即 XSS
- **resetForm this 上下文**：`src/utils/ruoyi.js:48` 依赖 `this.$refs`，仅 `proxy.resetForm()` 有效
- **Pagination 静态宽度**：`pagerCount` 在模块导入时计算 `document.body.clientWidth`

## 安全缺陷

- **RSA 私钥暴露**：`src/utils/jsencrypt.js:8` 私钥硬编码在前端源码
- **Token Cookie 无安全标记**：`src/utils/auth.js:10` 未设 `Secure`/`SameSite`
- **v-html XSS**：HeaderSearch 关键词高亮 + HeaderNotice 通知内容
- **dangerouslyUseHTMLString**：register.vue + ExcelImportDialog/index.vue
- **postMessage 通配符**：3 个工作流文件用 `window.parent.postMessage(data, '*')`
- **setTimeout 字符串参数**：2 处 `setTimeout("...", 1000)`（类 eval 风险）
- **console.log 未移除**：request.js、dict.js、permission.js 等遍布，生产可用 `esbuild.drop` 移除

## 提交通知

- 移除生产环境 `console.log`
- 勿用 `v-html` 渲染用户可控数据
- 勿用 `dangerouslyUseHTMLString: true` 拼接用户输入
- 勿在前端源码中包含密钥/凭据
