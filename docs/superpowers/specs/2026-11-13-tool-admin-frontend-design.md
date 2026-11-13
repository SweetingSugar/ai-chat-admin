# 工具模块管理界面设计

## 背景

后端新增 `ai-platform-tool` 模块，并由 `ai-platform-admin` 暴露工具、MCP Server 和调用日志管理接口。前端管理端需要在不改变现有视觉和交互风格的前提下提供对应的管理界面。

## 目标与范围

本次前端 P0 包含：

- HTTP/MCP 工具列表、筛选、HTTP 工具新增/编辑/删除和状态切换；
- MCP 发现工具的详情展示和状态切换；
- MCP Server 新增、编辑、删除、状态切换和工具发现；
- 工具调用日志分页查询、筛选和错误信息展示；
- 侧边栏入口、路由权限守卫、API 类型定义和页面测试；
- 复用现有 Element Plus、`PageHeader`、管理表格、抽屉表单和消息提示模式。

不在本次范围内：

- 在线调用或调试工具；
- 聊天模型自动 Tool Calling；
- 新增视觉设计系统或第三方代码编辑器；
- 修改后端接口、权限或数据模型。

## 页面组织

新增“工具管理”导航分组，按权限动态显示三个独立入口：

| 页面 | 路由 | 读取权限 |
| --- | --- | --- |
| 工具管理 | `/tools` | `tool:read` |
| MCP Server | `/tools/mcp-servers` | `tool:mcp-server:read` |
| 调用日志 | `/tools/invocation-logs` | `tool:invocation:read` |

路由沿用现有 `meta.permission` 和全局导航守卫，并将三个入口加入默认可访问路径计算。侧边栏权限过滤继续使用 `auth.hasPermission`。

## 工具管理页

### 列表与筛选

页面沿用 `PageHeader`，提供刷新和“新建 HTTP 工具”按钮。表格展示：

- 工具名称和编码；
- 工具类型（HTTP/MCP）；
- 来源（手工/发现）；
- MCP Server ID 或远端工具名；
- 凭证状态；
- 可用性（可用/已过期）；
- 启用状态；
- 更新时间；
- 与当前权限匹配的操作。

工具栏支持关键字、类型、来源、可用性和启用状态筛选。前端列表接口返回完整列表，因此这些筛选在前端计算；刷新和写操作后重新加载数据。

### 操作边界

- HTTP 工具支持新建、编辑、删除和状态切换；
- MCP 发现工具只支持查看详情和状态切换，不提供编辑按钮，避免覆盖远端发现快照；
- MCP 工具详情展示远端工具名和 `inputSchema`；
- 删除操作使用现有确认弹窗；
- 状态切换调用 `PATCH /api/admin/tools/{id}/status`，请求体为 `{ status: 0 | 1 }`；
- 工具管理响应中的 `hasCredential` 仅渲染为“已配置/未配置”，不渲染 credential 或 secret header 内容。

### HTTP 工具抽屉

新建和编辑使用抽屉表单，字段对应 `ToolUpsertRequest`：

- 工具编码、工具名称、描述；
- URL、HTTP 方法；
- 普通 Headers JSON；
- Query 参数 JSON；
- Body 模板 JSON；
- 认证类型（NONE、BEARER、API_KEY）；
- 认证 Header 名称；
- credential 密码输入；
- Secret Headers JSON；
- 启用状态。

Headers、Query、Body 和 Secret Headers 在表单中以多行文本保存，提交前用 `JSON.parse` 转换为对象。空字段省略或发送为空值；非法 JSON 阻止提交并提示具体字段。编辑时 credential 为空则从 payload 中省略，利用后端保留原凭证的语义。MCP 工具不进入该表单。

## MCP Server 管理页

表格展示：

- Server 名称和编码；
- Endpoint URL；
- 认证类型和凭证状态；
- 启用状态；
- 最近发现状态、时间和错误信息；
- 更新时间；
- 编辑、删除、状态切换和发现操作。

新建/编辑抽屉字段对应 `McpServerUpsertRequest`：编码、名称、Endpoint URL、认证类型、认证 Header 名称、credential、Secret Headers、连接超时、读取超时和状态。超时单位为秒，范围为 1–600。编辑时空 credential 不发送。

点击“发现工具”后：

1. 按钮进入 loading 状态，避免重复提交；
2. 请求 `POST /api/admin/tool/mcp-servers/{id}/discover`；
3. 成功时提示 `discovered`、`created`、`updated`、`stale` 统计，并刷新 Server 列表；
4. 失败时展示 API 错误并允许重试。

## 调用日志页

请求 `GET /api/admin/tool/invocation-logs` 并使用服务端分页。筛选项：

- 工具下拉列表；
- 调用状态（全部、运行中、成功、失败）；
- 刷新。

表格展示请求 ID、工具编码、工具类型、用户 ID、调用状态、耗时、开始时间、结束时间、错误码和错误信息。分页参数变化时重新请求。页面不展示请求参数、响应内容或任何认证信息。

## 前端模块拆分

新增：

- `src/api/tools.ts`：工具、MCP Server、发现和调用日志 API 函数；
- `src/types/tools.ts`：记录、请求、查询、枚举和分页类型；
- `src/views/tool/ToolManagementView.vue`；
- `src/views/tool/McpServerManagementView.vue`；
- `src/views/tool/ToolInvocationLogView.vue`；
- 三个视图对应的测试文件。

修改：

- `src/router/index.ts`；
- `src/components/layout/Sidebar.vue`；
- 现有 Sidebar 和路由测试。

API 函数统一通过现有 `apiClient`，不新增请求封装。类型直接对应后端字段和枚举：`HTTP/MCP`、`MANUAL/DISCOVERED`、`AVAILABLE/STALE`、`NONE/BEARER/API_KEY`、`RUNNING/SUCCESS/FAILED` 和 `SUCCESS/FAILED` 发现状态。

## 错误处理和状态

- 列表加载错误显示行内错误和“重试”按钮；
- 写操作失败通过 `getApiErrorMessage` 显示 Element Plus 错误消息；
- 提交期间禁用对应提交或发现操作；
- 空列表使用现有管理页面 empty slot；
- 所有日期沿用当前页面的 `T` 替换格式；
- 所有敏感字段只在请求期间存在于表单状态，不从响应或列表内容中回显；
- 视图卸载或关闭抽屉时清理表单、错误和加载状态。

## 测试策略

使用 Vitest、Vue Test Utils 和 Element Plus，覆盖：

- API 模块的请求方法、路径、请求体和查询参数；
- 工具页加载、筛选、HTTP 工具新建/编辑/删除、状态切换；
- 非法 JSON 阻止提交，空 credential 编辑时不会覆盖旧凭证；
- MCP 发现工具不显示编辑操作；
- MCP Server CRUD、状态切换、发现统计、错误重试和凭证状态展示；
- 调用日志筛选和分页请求；
- 无权限时隐藏导航入口和操作按钮；
- 空数据、加载中、API 错误和重试状态；
- 页面不渲染 credential 或 secret header 内容。

完成前运行：

```bash
npm test
npm run type-check
npm run build
```

并启动开发服务器，在浏览器中检查三个页面的主流程、抽屉、筛选、分页和错误状态。
