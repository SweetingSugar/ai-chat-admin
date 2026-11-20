# Agent 管理查看界面设计

## 背景

后端 `ai-platform-admin` 已提供管理员查看 Agent 的只读接口。前端管理端需要新增独立的 Agent 管理页面，在不改变现有视觉和交互风格的前提下展示 Agent 配置及其知识库、工具关联关系。

后端接口为：

- `GET /api/admin/agents?page={page}&size={size}`：分页查询 Agent；
- `GET /api/admin/agents/{id}`：查询单个 Agent 详情；
- 权限码：`agent:read`。

后端当前未提供管理员新增、编辑、删除或修改 Agent 状态的接口，因此本次只实现查看能力。

## 目标与范围

本次前端工作包含：

- 新增独立的 Agent 管理路由和侧边栏入口；
- 按服务端分页展示 Agent 列表；
- 查看 Agent 基础信息、运行配置和关联资源；
- 接入 `agent:read` 路由权限和菜单权限；
- 复用现有 Element Plus、`PageHeader`、管理表格、状态标签和详情抽屉样式；
- 增加 API、类型、页面和权限相关测试。

不在本次范围内：

- Agent 新增、编辑、删除和状态切换；
- Agent 在线调试或对话测试；
- 修改后端接口、权限定义或数据模型；
- 新增用户、模型或知识库名称查询接口；
- 引入新的视觉设计系统或第三方组件。

## 页面组织

新增独立页面“Agent 管理”，归入侧边栏的“AI 配置”分组：

| 页面 | 路由 | 权限 |
| --- | --- | --- |
| Agent 管理 | `/agents` | `agent:read` |

路由沿用现有 `meta.permission` 和全局导航守卫。`/agents` 同时加入默认可访问路径计算，使拥有该权限但没有更早菜单权限的用户能够正确进入 Agent 页面。侧边栏继续通过 `auth.hasPermission` 过滤菜单项；无 `agent:read` 权限时不显示入口，直接访问路由时跳转到无权限页面。

## Agent 列表页

页面使用现有 `PageHeader`，标题为“Agent 管理”，描述为“查看系统中的 Agent 配置与资源关联”。右上角提供“刷新”按钮，不提供新增或编辑按钮。

列表请求使用服务端分页：

```ts
{
  page: number
  size: number
}
```

默认页码为 1，默认每页 20 条；分页组件变化时重新请求对应页码和页大小，不在前端把当前页数据伪造成全量分页。

表格展示：

- Agent：名称，下一行展示描述；
- 所属用户：`userId`；
- 模型：`modelId`，为空时显示 `—`；
- 知识库：`knowledgeBaseIds.length`；
- 工具：`toolCodes.length`；
- 状态：复用现有 `StatusTag`；
- 更新时间：沿用现有日期格式，将 `T` 替换为空格；
- 操作：`详情`。

列表接口返回的 `AgentAdminVO` 已包含详情字段。打开详情时可先使用当前行数据，避免重复请求；前端仍保留 `getAgent` API 函数，便于以后改为懒加载或在详情打开时刷新数据。

## Agent 详情抽屉

点击“详情”后打开右侧抽屉，复用工具管理页面的详情展示方式。抽屉内容分为三部分：

### 基本信息

- Agent ID；
- Agent 名称；
- 所属用户 ID；
- 描述；
- 状态；
- 创建时间；
- 更新时间。

### 运行配置

- 模型 ID；
- 系统提示词。

系统提示词使用保留换行的代码块或预格式文本展示，并允许长文本换行和滚动，不能撑破抽屉布局。

### 关联资源

- 知识库 ID 列表；
- 工具编码列表。

没有关联资源时分别显示“暂无关联知识库”和“暂无关联工具”。由于后端只返回 ID 和工具编码，页面不显示未经接口提供的名称，不额外拼接或猜测资源信息。

## API 与类型设计

新增 `src/types/agents.ts`，类型直接对应后端 `AgentAdminVO`：

```ts
import type { BinaryStatus } from './management'

export interface AgentAdmin {
  id: number
  userId: number
  name: string
  description: string | null
  systemPrompt: string
  modelId: number | null
  knowledgeBaseIds: number[]
  toolCodes: string[]
  status: BinaryStatus
  createTime: string
  updateTime: string
}

export interface AgentPage {
  records: AgentAdmin[]
  total: number
  current: number
  size: number
  pages: number
}

export interface AgentPageQuery {
  page: number
  size: number
}
```

新增 `src/api/agents.ts`：

- `listAgents(query)` 调用 `GET admin/agents` 并传递分页参数；
- `getAgent(id)` 调用 `GET admin/agents/{id}`。

API 函数统一使用现有 `apiClient`，不新增请求封装。

## 前端模块拆分

新增：

- `src/api/agents.ts`；
- `src/types/agents.ts`；
- `src/views/AgentManagementView.vue`；
- `src/views/__tests__/AgentManagementView.spec.ts`；
- `src/api/__tests__/agents.spec.ts`。

修改：

- `src/router/index.ts`：注册 `/agents`、权限元数据和默认可访问路径；
- `src/components/layout/Sidebar.vue`：增加 AI 配置分组中的 Agent 管理入口；
- 相关路由、侧边栏测试：覆盖权限可见性和守卫行为。

页面应遵循现有管理页面的命名、请求竞态保护、错误处理和 CSS 变量约定，不抽取与本功能无关的公共组件。

## 加载、错误与边界状态

列表页：

- 首次加载和刷新时显示表格 loading；
- 请求成功后更新 records、total、current 和 size；
- 请求失败时在表格上方显示行内错误和“重试”按钮；
- 空列表使用现有表格 empty slot 显示空状态；
- 刷新保留当前页，分页参数变化后请求对应页码；
- 使用请求序号或等价方式，避免较早的响应覆盖较新的分页请求。

详情抽屉：

- 打开时清理上一次选择状态；
- 关闭时清理选中 Agent 和详情错误状态；
- 对空描述、空模型 ID、空资源列表使用明确的占位文本；
- 长系统提示词、工具编码和 ID 列表允许换行并在必要时滚动；
- 若后续使用 `getAgent` 懒加载，详情请求需独立显示 loading、错误和重试状态。

本次页面不渲染任何凭证、密钥或其他敏感字段。

## 测试策略

使用 Vitest、Vue Test Utils 和现有测试约定，覆盖：

- API 模块使用正确的 HTTP 方法、路径和分页参数；
- 页面挂载后加载 Agent 列表并展示名称、用户 ID、模型 ID、资源数量和状态；
- 分页切换请求正确的页码和页大小；
- 点击详情展示系统提示词、知识库 ID 和工具编码；
- 空资源列表、空描述和空模型 ID 的占位展示；
- API 失败时显示错误和重试入口；
- 刷新按钮重新加载当前页；
- 没有 `agent:read` 权限时隐藏侧边栏入口并阻止路由访问；
- 有权限时路由和菜单可访问。

## 验证

实现完成后运行：

```bash
npm test
npm run type-check
npm run build
```

并启动开发服务器，检查 Agent 菜单、分页列表、刷新、详情抽屉、长文本展示、空状态和错误重试流程。
