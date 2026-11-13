# Tool Admin Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为新增的 tool 后端模块实现沿用现有管理端风格的工具管理、MCP Server 管理和调用日志页面。

**Architecture:** 新增一个 `tools` API/类型模块和三个独立 Vue 管理视图。工具页只允许手工 HTTP 工具进入编辑表单，MCP 发现工具只展示详情并切换状态；MCP Server 页负责 CRUD 和发现；日志页使用后端分页。路由和侧边栏沿用现有权限元数据与 `auth.hasPermission` 过滤，不引入新的 UI 或请求抽象。

**Tech Stack:** Vue 3 Composition API、TypeScript、Vue Router、Pinia、Element Plus、Axios API client、Vitest、Vue Test Utils。

---

## 文件结构与边界

### 新增

- `src/types/tools.ts`：工具、MCP Server、调用日志、请求体、分页和发现结果类型；不放 API 调用或视图状态。
- `src/api/tools.ts`：只封装 `/admin/tools`、`/admin/tool/mcp-servers` 和 `/admin/tool/invocation-logs` 接口。
- `src/api/__tests__/tools.spec.ts`：验证 API wrapper 的路径、HTTP 方法和参数。
- `src/views/tool/ToolManagementView.vue`：工具列表、筛选、HTTP 工具表单、MCP 工具详情和状态操作。
- `src/views/tool/McpServerManagementView.vue`：MCP Server 列表、表单和发现操作。
- `src/views/tool/ToolInvocationLogView.vue`：调用日志查询、筛选和服务端分页。
- `src/views/tool/__tests__/ToolManagementView.spec.ts`。
- `src/views/tool/__tests__/McpServerManagementView.spec.ts`。
- `src/views/tool/__tests__/ToolInvocationLogView.spec.ts`。

### 修改

- `src/router/index.ts`：注册三个路由和默认可访问路径。
- `src/components/layout/Sidebar.vue`：增加“工具管理”导航分组。
- `src/components/layout/__tests__/Sidebar.spec.ts`：更新导航路由夹具和权限断言。
- `src/router/__tests__/guards.spec.ts`：增加工具路由权限跳转和默认路径覆盖。

---

### Task 1: 建立工具 API 类型和请求封装

**Files:**
- Create: `src/types/tools.ts`
- Create: `src/api/tools.ts`
- Create: `src/api/__tests__/tools.spec.ts`

- [ ] **Step 1: 写 API wrapper 失败测试**

在 `src/api/__tests__/tools.spec.ts` 中沿用 `management.spec.ts` 的 `vi.spyOn(apiClient, ...)` 模式，覆盖以下调用：

```ts
it('maps tool management operations to admin tool endpoints', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue([])
  vi.spyOn(apiClient, 'post').mockResolvedValue({})
  vi.spyOn(apiClient, 'put').mockResolvedValue({})
  vi.spyOn(apiClient, 'patch').mockResolvedValue({})
  vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

  await listTools()
  await getTool(7)
  await createTool({ toolCode: 'weather', toolName: 'Weather', toolType: 'HTTP', authType: 'NONE', status: 1 })
  await updateTool(7, { toolCode: 'weather', toolName: 'Weather', toolType: 'HTTP', authType: 'NONE', status: 1 })
  await deleteTool(7)
  await updateToolStatus(7, 0)

  expect(apiClient.get).toHaveBeenNthCalledWith(1, 'admin/tools')
  expect(apiClient.get).toHaveBeenNthCalledWith(2, 'admin/tools/7')
  expect(apiClient.post).toHaveBeenCalledWith('admin/tools', expect.objectContaining({ toolCode: 'weather' }))
  expect(apiClient.put).toHaveBeenCalledWith('admin/tools/7', expect.objectContaining({ toolCode: 'weather' }))
  expect(apiClient.delete).toHaveBeenCalledWith('admin/tools/7')
  expect(apiClient.patch).toHaveBeenCalledWith('admin/tools/7/status', { status: 0 })
})
```

再增加 MCP Server 和日志断言：

```ts
it('maps MCP server CRUD, discovery, and invocation pagination', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue({ records: [], total: 0, current: 1, size: 20, pages: 0 })
  vi.spyOn(apiClient, 'post').mockResolvedValue({})
  vi.spyOn(apiClient, 'put').mockResolvedValue({})
  vi.spyOn(apiClient, 'patch').mockResolvedValue({})
  vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

  await listMcpServers()
  await getMcpServer(3)
  await createMcpServer({ serverCode: 'maps', serverName: 'Maps', endpointUrl: 'https://example.com/mcp', authType: 'NONE', status: 1 })
  await updateMcpServer(3, { serverCode: 'maps', serverName: 'Maps', endpointUrl: 'https://example.com/mcp', authType: 'NONE', status: 1 })
  await deleteMcpServer(3)
  await updateMcpServerStatus(3, 0)
  await discoverMcpServer(3)
  await listToolInvocationLogs({ page: 2, size: 50, toolId: 7, status: 'FAILED' })

  expect(apiClient.get).toHaveBeenNthCalledWith(1, 'admin/tool/mcp-servers')
  expect(apiClient.get).toHaveBeenNthCalledWith(2, 'admin/tool/mcp-servers/3')
  expect(apiClient.post).toHaveBeenNthCalledWith(2, 'admin/tool/mcp-servers/3/discover')
  expect(apiClient.get).toHaveBeenNthCalledWith(3, 'admin/tool/invocation-logs', {
    params: { page: 2, size: 50, toolId: 7, status: 'FAILED' },
  })
})
```

Use a fixture helper only for test input; do not mock `apiClient` globally in the production module.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test -- src/api/__tests__/tools.spec.ts
```

Expected: FAIL because `@/api/tools` and its exported functions do not exist.

- [ ] **Step 3: Define the shared types**

Create `src/types/tools.ts` with these exact contracts:

```ts
import type { BinaryStatus } from './management'

export type ToolType = 'HTTP' | 'MCP'
export type ToolSource = 'MANUAL' | 'DISCOVERED'
export type ToolAvailability = 'AVAILABLE' | 'STALE'
export type ToolAuthType = 'NONE' | 'BEARER' | 'API_KEY'
export type ToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ToolInvocationStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'
export type ToolDiscoveryStatus = 'SUCCESS' | 'FAILED'
export type JsonObject = Record<string, unknown>

export interface HttpToolConfig {
  url: string
  method: ToolHttpMethod
  headers?: Record<string, string> | null
  queryParams?: Record<string, string> | null
  bodyTemplate?: unknown
}

export interface ToolManagementView {
  id: number
  toolCode: string
  toolName: string
  description: string | null
  toolType: ToolType
  source: ToolSource
  status: BinaryStatus
  availability: ToolAvailability
  mcpServerId: number | null
  remoteToolName: string | null
  httpConfig: HttpToolConfig | null
  inputSchema: unknown | null
  hasCredential: boolean
  credentialVersion: number | null
  createTime: string
  updateTime: string
}

export interface ToolUpsertPayload {
  toolCode: string
  toolName: string
  description?: string
  toolType: 'HTTP'
  httpConfig?: HttpToolConfig
  authType: ToolAuthType
  authHeaderName?: string
  credential?: string
  secretHeaders?: Record<string, string>
  status?: BinaryStatus
}

export interface McpServerManagementView {
  id: number
  serverCode: string
  serverName: string
  endpointUrl: string
  authType: ToolAuthType
  connectTimeout: number
  readTimeout: number
  status: BinaryStatus
  hasCredential: boolean
  credentialVersion: number | null
  lastDiscoveryTime: string | null
  lastDiscoveryStatus: ToolDiscoveryStatus | null
  lastDiscoveryError: string | null
  createTime: string
  updateTime: string
}

export interface McpServerUpsertPayload {
  serverCode: string
  serverName: string
  endpointUrl: string
  authType: ToolAuthType
  authHeaderName?: string
  credential?: string
  secretHeaders?: Record<string, string>
  connectTimeout?: number
  readTimeout?: number
  status?: BinaryStatus
}

export interface ToolDiscoveryResult {
  serverId: number
  discovered: number
  created: number
  updated: number
  stale: number
  tools: ToolManagementView[]
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export interface ToolInvocationView {
  id: number
  requestId: string
  toolId: number | null
  toolCode: string
  userId: number | null
  toolType: ToolType
  status: ToolInvocationStatus
  durationMs: number | null
  errorCode: string | null
  errorMessage: string | null
  startTime: string
  endTime: string | null
  createTime: string
}

export interface ToolInvocationQuery {
  page: number
  size: number
  toolId?: number
  status?: ToolInvocationStatus
}
```

Use `BinaryStatus` instead of a second `0 | 1` declaration. `httpConfig` and `inputSchema` are nullable because MCP records do not carry HTTP configuration and HTTP records do not carry MCP schema.

- [ ] **Step 4: Implement API functions**

Create `src/api/tools.ts` using the existing `apiClient` and these exact paths:

```ts
import { apiClient } from '@/api/client'
import type {
  McpServerManagementView,
  McpServerUpsertPayload,
  PageResult,
  ToolDiscoveryResult,
  ToolInvocationQuery,
  ToolInvocationView,
  ToolManagementView,
  ToolUpsertPayload,
} from '@/types/tools'
import type { BinaryStatus } from '@/types/management'

export function listTools(): Promise<ToolManagementView[]> {
  return apiClient.get<ToolManagementView[]>('admin/tools')
}

export function getTool(id: number): Promise<ToolManagementView> {
  return apiClient.get<ToolManagementView>(`admin/tools/${id}`)
}

export function createTool(payload: ToolUpsertPayload): Promise<ToolManagementView> {
  return apiClient.post<ToolManagementView>('admin/tools', payload)
}

export function updateTool(id: number, payload: ToolUpsertPayload): Promise<ToolManagementView> {
  return apiClient.put<ToolManagementView>(`admin/tools/${id}`, payload)
}

export function deleteTool(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/tools/${id}`)
}

export function updateToolStatus(id: number, status: BinaryStatus): Promise<ToolManagementView> {
  return apiClient.patch<ToolManagementView>(`admin/tools/${id}/status`, { status })
}

export function listMcpServers(): Promise<McpServerManagementView[]> {
  return apiClient.get<McpServerManagementView[]>('admin/tool/mcp-servers')
}

export function getMcpServer(id: number): Promise<McpServerManagementView> {
  return apiClient.get<McpServerManagementView>(`admin/tool/mcp-servers/${id}`)
}

export function createMcpServer(payload: McpServerUpsertPayload): Promise<McpServerManagementView> {
  return apiClient.post<McpServerManagementView>('admin/tool/mcp-servers', payload)
}

export function updateMcpServer(id: number, payload: McpServerUpsertPayload): Promise<McpServerManagementView> {
  return apiClient.put<McpServerManagementView>(`admin/tool/mcp-servers/${id}`, payload)
}

export function deleteMcpServer(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/tool/mcp-servers/${id}`)
}

export function updateMcpServerStatus(id: number, status: BinaryStatus): Promise<McpServerManagementView> {
  return apiClient.patch<McpServerManagementView>(`admin/tool/mcp-servers/${id}/status`, { status })
}

export function discoverMcpServer(id: number): Promise<ToolDiscoveryResult> {
  return apiClient.post<ToolDiscoveryResult>(`admin/tool/mcp-servers/${id}/discover`)
}

export function listToolInvocationLogs(
  query: ToolInvocationQuery,
): Promise<PageResult<ToolInvocationView>> {
  return apiClient.get<PageResult<ToolInvocationView>>('admin/tool/invocation-logs', { params: query })
}
```

Keep optional query properties absent when the caller has not selected a filter; the log view will construct the query accordingly.

- [ ] **Step 5: Run the focused test to verify it passes**

Run:

```bash
npm test -- src/api/__tests__/tools.spec.ts
```

Expected: PASS with all tool, MCP Server, discovery, and log endpoint assertions passing.

---

### Task 2: Register routes and navigation permissions

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/components/layout/Sidebar.vue`
- Modify: `src/router/__tests__/guards.spec.ts`
- Modify: `src/components/layout/__tests__/Sidebar.spec.ts`

- [ ] **Step 1: Extend navigation tests with failing cases**

Add the three tool routes to the Sidebar test router fixture and add these permissions to the default fixture only in tests that need them:

```ts
{ path: '/tools', component: routeComponent },
{ path: '/tools/mcp-servers', component: routeComponent },
{ path: '/tools/invocation-logs', component: routeComponent },
```

Add tests that assert:

```ts
it('shows tool navigation only for the matching read permissions', async () => {
  const wrapper = await mountSidebar([
    'tool:read',
    'tool:mcp-server:read',
    'tool:invocation:read',
  ])

  expect(wrapper.text()).toContain('工具管理')
  expect(wrapper.text()).toContain('MCP Server')
  expect(wrapper.text()).toContain('调用日志')
  expect(wrapper.find('a[href="/tools"]').exists()).toBe(true)
  expect(wrapper.find('a[href="/tools/mcp-servers"]').exists()).toBe(true)
  expect(wrapper.find('a[href="/tools/invocation-logs"]').exists()).toBe(true)
})

it('hides each tool entry without its read permission', async () => {
  const wrapper = await mountSidebar(['tool:read'])

  expect(wrapper.find('a[href="/tools"]').exists()).toBe(true)
  expect(wrapper.find('a[href="/tools/mcp-servers"]').exists()).toBe(false)
  expect(wrapper.find('a[href="/tools/invocation-logs"]').exists()).toBe(false)
})
```

Add router guard cases for `/tools`, `/tools/mcp-servers`, and `/tools/invocation-logs`: an unauthenticated user is redirected to login, a user without the corresponding permission is redirected to `/forbidden`, and `getFirstAccessiblePath` returns `/tools` when `tool:read` is the first available tool permission.

- [ ] **Step 2: Run navigation tests to verify they fail**

Run:

```bash
npm test -- src/components/layout/__tests__/Sidebar.spec.ts src/router/__tests__/guards.spec.ts
```

Expected: FAIL because the routes and navigation entries do not exist.

- [ ] **Step 3: Register the three route records**

In `src/router/index.ts`:

1. Import `ToolManagementView`, `McpServerManagementView`, and `ToolInvocationLogView`.
2. Add children under the root `AdminLayout` record:

```ts
{
  path: 'tools',
  component: ToolManagementView,
  meta: { requiresAuth: true, permission: 'tool:read', title: '工具管理' },
},
{
  path: 'tools/mcp-servers',
  component: McpServerManagementView,
  meta: { requiresAuth: true, permission: 'tool:mcp-server:read', title: 'MCP Server' },
},
{
  path: 'tools/invocation-logs',
  component: ToolInvocationLogView,
  meta: { requiresAuth: true, permission: 'tool:invocation:read', title: '调用日志' },
},
```

Add these entries to `accessibleEntries` in the same order:

```ts
['/tools', 'tool:read'],
['/tools/mcp-servers', 'tool:mcp-server:read'],
['/tools/invocation-logs', 'tool:invocation:read'],
```

- [ ] **Step 4: Add the sidebar group**

In `Sidebar.vue`, append a group after “AI 配置”:

```ts
{
  label: '工具管理',
  items: [
    { label: '工具管理', path: '/tools', permission: 'tool:read' },
    { label: 'MCP Server', path: '/tools/mcp-servers', permission: 'tool:mcp-server:read' },
    { label: '调用日志', path: '/tools/invocation-logs', permission: 'tool:invocation:read' },
  ],
},
```

Keep the existing `visibleGroups` filtering unchanged.

- [ ] **Step 5: Run navigation tests to verify they pass**

Run:

```bash
npm test -- src/components/layout/__tests__/Sidebar.spec.ts src/router/__tests__/guards.spec.ts
```

Expected: PASS, including existing knowledge-base and AI navigation cases.

---

### Task 3: Implement the tool management page

**Files:**
- Create: `src/views/tool/ToolManagementView.vue`
- Create: `src/views/tool/__tests__/ToolManagementView.spec.ts`

- [ ] **Step 1: Write view tests for the required behaviors**

Mock `@/api/tools` with functions for tool list, CRUD, status update, and mock `@/stores/auth` with `hasPermission: () => true`. Mount with Element Plus. Use a fixture that contains one HTTP tool and one discovered MCP tool.

Add these tests:

```ts
it('loads and filters tools by keyword and type', async () => {
  const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  expect(toolsApi.listTools).toHaveBeenCalledWith()
  expect(wrapper.text()).toContain('天气查询')
  expect(wrapper.text()).toContain('远程搜索')

  await wrapper.get('input[placeholder="搜索工具名称或编码"]').setValue('天气')
  expect(wrapper.text()).toContain('天气查询')
  expect(wrapper.text()).not.toContain('远程搜索')
})

it('submits an HTTP tool with parsed JSON configuration', async () => {
  const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.get('[data-test="tool-create"]').trigger('click')

  await wrapper.get('[data-test="tool-code"]').setValue('weather_query')
  await wrapper.get('[data-test="tool-name"]').setValue('天气查询')
  await wrapper.get('[data-test="tool-url"]').setValue('https://example.com/weather')
  await wrapper.get('[data-test="tool-headers"]').setValue('{"Accept":"application/json"}')
  await wrapper.get('[data-test="tool-query-params"]').setValue('{"city":"{{city}}"}')
  await wrapper.get('[data-test="tool-body-template"]').setValue('')
  await wrapper.get('[data-test="tool-credential"]').setValue('secret')
  await wrapper.get('[data-test="tool-submit"]').trigger('click')
  await flushPromises()

  expect(toolsApi.createTool).toHaveBeenCalledWith(expect.objectContaining({
    toolCode: 'weather_query',
    toolType: 'HTTP',
    httpConfig: expect.objectContaining({
      url: 'https://example.com/weather',
      headers: { Accept: 'application/json' },
      queryParams: { city: '{{city}}' },
    }),
    credential: 'secret',
  }))
})

it('blocks submission when a JSON field is invalid', async () => {
  const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.get('[data-test="tool-create"]').trigger('click')
  await wrapper.get('[data-test="tool-code"]').setValue('weather_query')
  await wrapper.get('[data-test="tool-name"]').setValue('天气查询')
  await wrapper.get('[data-test="tool-url"]').setValue('https://example.com/weather')
  await wrapper.get('[data-test="tool-headers"]').setValue('{invalid')
  await wrapper.get('[data-test="tool-submit"]').trigger('click')
  await flushPromises()

  expect(toolsApi.createTool).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Headers JSON 格式不正确')
})

it('does not offer edit for discovered MCP tools and shows their schema', async () => {
  const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  expect(wrapper.find('[data-test="tool-edit-2"]').exists()).toBe(false)
  await wrapper.get('[data-test="tool-detail-2"]').trigger('click')
  expect(wrapper.text()).toContain('远端搜索')
  expect(wrapper.text()).toContain('inputSchema')
})

it('updates status and deletes an HTTP tool after confirmation', async () => {
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
  const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.get('[data-test="tool-status-1"]').trigger('click')
  await flushPromises()
  expect(toolsApi.updateToolStatus).toHaveBeenCalledWith(1, 0)

  await wrapper.get('[data-test="tool-delete-1"]').trigger('click')
  await flushPromises()
  expect(toolsApi.deleteTool).toHaveBeenCalledWith(1)
})

it('does not render credential values from the API response', async () => {
  const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  expect(wrapper.text()).not.toContain('secret')
  expect(wrapper.text()).toContain('已配置')
})
```

- [ ] **Step 2: Run the view tests to verify they fail**

Run:

```bash
npm test -- src/views/tool/__tests__/ToolManagementView.spec.ts
```

Expected: FAIL because the view file and API mock target do not exist.

- [ ] **Step 3: Implement loading, filtering, and permission state**

In `ToolManagementView.vue`:

- Import `computed`, `onMounted`, `reactive`, and `ref`.
- Import `ElMessage`, `ElMessageBox`, `getApiErrorMessage`, `toolsApi`, `PageHeader`, `StatusTag`, `useAuthStore`, and tool types.
- Keep refs for `tools`, `loading`, `error`, `keyword`, `typeFilter`, `sourceFilter`, `availabilityFilter`, `statusFilter`, form visibility/id/session/submitting, and selected detail tool.
- Define `canCreate`, `canUpdate`, and `canDelete` using `tool:create`, `tool:update`, and `tool:delete`.
- Build `filteredTools` from trimmed, case-insensitive tool code/name/remote name matching plus all four filters.
- `loadTools` sets loading/error, calls `toolsApi.listTools()`, stores the result, and displays `getApiErrorMessage` on failure.
- Use `onMounted(() => void loadTools())`.

Use labels:

```ts
const toolTypeLabels = { HTTP: 'HTTP', MCP: 'MCP' } as const
const sourceLabels = { MANUAL: '手工', DISCOVERED: '发现' } as const
const availabilityLabels = { AVAILABLE: '可用', STALE: '已过期' } as const
const authTypeLabels = { NONE: '无认证', BEARER: 'Bearer', API_KEY: 'API Key' } as const
```

Render `StatusTag` for binary status, `el-tag` for type/source/availability, and `hasCredential` as “已配置/未配置”. Do not render any response credential field.

- [ ] **Step 4: Implement HTTP form JSON parsing and CRUD**

Define the form with string fields for JSON input:

```ts
interface ToolForm {
  toolCode: string
  toolName: string
  description: string
  url: string
  method: ToolHttpMethod
  headers: string
  queryParams: string
  bodyTemplate: string
  authType: ToolAuthType
  authHeaderName: string
  credential: string
  secretHeaders: string
  status: boolean
}
```

Initialize new forms with method `GET`, auth type `NONE`, empty JSON fields, and enabled status. When editing, only accept `tool.toolType === 'HTTP'`; stringify `httpConfig.headers`, `httpConfig.queryParams`, and `httpConfig.bodyTemplate` with two-space indentation.

Implement a local `parseJsonObjectField(value, label)` helper that returns `undefined` for blank input, parses the value, rejects arrays/null/non-object values, and throws `Error(`${label} JSON 格式不正确`)`. For `bodyTemplate`, allow any valid JSON value because the backend field is `JsonNode`.

`submitTool` must:

1. Parse Headers, Query 参数, Body 模板, and Secret Headers independently;
2. Build `ToolUpsertPayload` with `toolType: 'HTTP'`, trimmed text fields, `httpConfig`, auth fields, and `status: form.status ? 1 : 0`;
3. Add `credential` only when trimmed and add `secretHeaders` only when present;
4. Call `createTool` when no form ID, otherwise `updateTool` with the ID;
5. Show success, close the drawer only for the active form session, and reload the list;
6. Show the thrown JSON error with `ElMessage.warning` and skip the API call;
7. Always clear submitting state for the active form session.

Add `deleteTool` with the existing confirmation wording and `updateToolStatus` using the switch value. Reload after successful mutation; show `getApiErrorMessage` on failures.

- [ ] **Step 5: Implement the template and detail drawer**

Use the existing management page structure:

- `PageHeader` title “工具管理”, description “配置 HTTP 工具与管理 MCP 发现工具”;
- refresh and permission-gated “新建 HTTP 工具” actions;
- toolbar with `el-input` placeholder “搜索工具名称或编码”, type/source/availability/status selects;
- `el-table` with a stable `row-key="id"`, loading state, empty slot, and a fixed action column;
- HTTP rows show edit/delete actions according to permission;
- all rows show a status switch when `canUpdate`; discovered MCP rows show a detail action;
- detail drawer renders tool metadata and `<pre>` of `inputSchema` using `JSON.stringify`, without an edit or submit control;
- form drawer uses `data-test` attributes from the tests and a footer with cancel/save buttons.

The form must show auth header and credential inputs for non-`NONE` auth types, and use `type="password"`, `show-password`, and `autocomplete="new-password"` for credential. Use `textarea` inputs for JSON fields with short hints explaining accepted object/JSON syntax.

Use the compact styles already present in `ProviderManagementView.vue` and `ModelManagementView.vue`: `management-page`, `management-panel`, `toolbar`, `table-scroll`, `inline-error`, `empty-state`, and `drawer-footer`. Do not add a new global stylesheet.

- [ ] **Step 6: Run tool view tests to verify they pass**

Run:

```bash
npm test -- src/views/tool/__tests__/ToolManagementView.spec.ts
```

Expected: PASS for list/filter, JSON parsing, discovered-tool restrictions, status/delete operations, and credential redaction.

---

### Task 4: Implement MCP Server management page

**Files:**
- Create: `src/views/tool/McpServerManagementView.vue`
- Create: `src/views/tool/__tests__/McpServerManagementView.spec.ts`

- [ ] **Step 1: Write MCP Server view tests**

Mock all MCP API functions and mount with Element Plus. Use a server fixture with `hasCredential: true`, successful discovery metadata, and one failed-discovery fixture. Cover:

```ts
it('loads and renders MCP servers with credential status', async () => {
  const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  expect(toolsApi.listMcpServers).toHaveBeenCalledWith()
  expect(wrapper.text()).toContain('地图服务')
  expect(wrapper.text()).toContain('已配置')
  expect(wrapper.text()).not.toContain('secret')
})

it('creates an MCP server with parsed secret headers and timeout fields', async () => {
  const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.get('[data-test="mcp-server-create"]').trigger('click')

  await wrapper.get('[data-test="mcp-server-code"]').setValue('maps')
  await wrapper.get('[data-test="mcp-server-name"]').setValue('地图服务')
  await wrapper.get('[data-test="mcp-server-endpoint"]').setValue('https://example.com/mcp')
  await wrapper.get('[data-test="mcp-server-secret-headers"]').setValue('{"X-Tenant":"demo"}')
  await wrapper.get('[data-test="mcp-server-connect-timeout"]').setValue(20)
  await wrapper.get('[data-test="mcp-server-read-timeout"]').setValue(90)
  await wrapper.get('[data-test="mcp-server-submit"]').trigger('click')
  await flushPromises()

  expect(toolsApi.createMcpServer).toHaveBeenCalledWith(expect.objectContaining({
    serverCode: 'maps',
    endpointUrl: 'https://example.com/mcp',
    secretHeaders: { 'X-Tenant': 'demo' },
    connectTimeout: 20,
    readTimeout: 90,
  }))
})

it('preserves an existing credential when editing with an empty credential', async () => {
  const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.get('[data-test="mcp-server-edit-3"]').trigger('click')
  await wrapper.get('[data-test="mcp-server-submit"]').trigger('click')
  await flushPromises()

  expect(toolsApi.updateMcpServer).toHaveBeenCalledWith(3, expect.not.objectContaining({ credential: expect.any(String) }))
})

it('discovers tools and shows the synchronization counts', async () => {
  const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.get('[data-test="mcp-server-discover-3"]').trigger('click')
  await flushPromises()

  expect(toolsApi.discoverMcpServer).toHaveBeenCalledWith(3)
  expect(wrapper.text()).toContain('发现 2')
  expect(wrapper.text()).toContain('新增 1')
  expect(toolsApi.listMcpServers).toHaveBeenCalledTimes(2)
})

it('does not submit invalid Secret Headers JSON', async () => {
  const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.get('[data-test="mcp-server-create"]').trigger('click')
  await wrapper.get('[data-test="mcp-server-secret-headers"]').setValue('{invalid')
  await wrapper.get('[data-test="mcp-server-submit"]').trigger('click')
  await flushPromises()

  expect(toolsApi.createMcpServer).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('Secret Headers JSON 格式不正确')
})
```

Also cover delete confirmation, status PATCH, API error retry, and hiding create/update/delete/discover actions when the corresponding permission is false.

- [ ] **Step 2: Run MCP view tests to verify they fail**

Run:

```bash
npm test -- src/views/tool/__tests__/McpServerManagementView.spec.ts
```

Expected: FAIL because the view file does not exist.

- [ ] **Step 3: Implement list, status, CRUD, and form state**

Use refs for `servers`, `loading`, `error`, form visibility/id/session/submitting, and a reactive `McpServerForm`:

```ts
interface McpServerForm {
  serverCode: string
  serverName: string
  endpointUrl: string
  authType: ToolAuthType
  authHeaderName: string
  credential: string
  secretHeaders: string
  connectTimeout: number
  readTimeout: number
  status: boolean
}
```

Use `canCreate`, `canUpdate`, `canDelete`, and `canDiscover` for `tool:mcp-server:create`, `tool:mcp-server:update`, `tool:mcp-server:delete`, and `tool:mcp-server:discover`.

`loadServers` follows the existing list-page loading/error pattern. `openEdit` populates all non-secret fields and clears credential. `submitServer` parses Secret Headers as a JSON object, trims text, sends `status` as `0 | 1`, omits blank credential, calls create/update, closes the active drawer, and reloads. `deleteServer` confirms before calling delete. `toggleServerStatus` calls the PATCH endpoint and reloads on success.

- [ ] **Step 4: Implement discovery result and template**

`discoverServer` sets a per-row or global discovery loading state, calls `discoverMcpServer`, shows an Element Plus success message containing all four counts (`发现 N，新增 N，更新 N，过期 N`), then reloads. On failure it shows `getApiErrorMessage` and leaves the row available for retry.

Render a table with columns for server name/code, endpoint, auth type, credential state, discovery state/time/error, status, update time, and permission-gated actions. Use `StatusTag` for binary status and `el-tag` for discovery status. Render `lastDiscoveryError` only as backend-provided text in the table; do not render credentials.

The form drawer uses `data-test` attributes from the tests, `el-input-number` with `min="1"` and `max="600"` for both timeout fields, a password credential input, and the same compact management styles as the existing AI pages.

- [ ] **Step 5: Run MCP view tests to verify they pass**

Run:

```bash
npm test -- src/views/tool/__tests__/McpServerManagementView.spec.ts
```

Expected: PASS for CRUD, credential preservation, JSON parsing, discovery counts, status, confirmation, and permission-gated actions.

---

### Task 5: Implement the invocation log page

**Files:**
- Create: `src/views/tool/ToolInvocationLogView.vue`
- Create: `src/views/tool/__tests__/ToolInvocationLogView.spec.ts`

- [ ] **Step 1: Write log page tests**

Mock `listToolInvocationLogs` and `listTools`. Use a page fixture with one successful and one failed record. Cover:

```ts
it('loads a paginated log page and renders audit fields', async () => {
  const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  expect(toolsApi.listToolInvocationLogs).toHaveBeenCalledWith({ page: 1, size: 20 })
  expect(wrapper.text()).toContain('weather_query')
  expect(wrapper.text()).toContain('TOOL_REMOTE_ERROR')
  expect(wrapper.text()).not.toContain('Authorization')
})

it('reloads logs with selected tool and status filters', async () => {
  const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  const toolSelect = wrapper.findComponent({ name: 'ElSelect' })
  await toolSelect.vm.$emit('change', 7)
  const statusSelect = wrapper.findAllComponents({ name: 'ElSelect' })[1]
  await statusSelect.vm.$emit('change', 'FAILED')
  await flushPromises()

  expect(toolsApi.listToolInvocationLogs).toHaveBeenLastCalledWith({
    page: 1,
    size: 20,
    toolId: 7,
    status: 'FAILED',
  })
})

it('requests a new page and page size from the backend', async () => {
  const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  const pagination = wrapper.findComponent({ name: 'ElPagination' })

  await pagination.vm.$emit('current-change', 2)
  await flushPromises()
  expect(toolsApi.listToolInvocationLogs).toHaveBeenLastCalledWith({ page: 2, size: 20 })

  await pagination.vm.$emit('size-change', 50)
  await flushPromises()
  expect(toolsApi.listToolInvocationLogs).toHaveBeenLastCalledWith({ page: 1, size: 50 })
})
```

Add tests for API error with retry and for the case where the account has `tool:invocation:read` but not `tool:read`: logs still load, while the tool selector is replaced by a numeric tool ID filter or omitted rather than causing an unauthorized tools request.

- [ ] **Step 2: Run log tests to verify they fail**

Run:

```bash
npm test -- src/views/tool/__tests__/ToolInvocationLogView.spec.ts
```

Expected: FAIL because the view file does not exist.

- [ ] **Step 3: Implement query and pagination state**

Use refs for `logs`, `tools`, `loading`, `error`, `page`, `pageSize`, `total`, `toolFilter`, and `statusFilter`. On mount:

- always call `loadLogs()`;
- call `listTools()` only when `auth.hasPermission('tool:read')` is true;
- if the optional tool list fails, retain the logs page and show a non-blocking tool-filter error rather than replacing the log error.

`loadLogs` builds a `ToolInvocationQuery` with `page` and `size`, adds `toolId` only when selected, and adds `status` only when selected. It updates `page`, `pageSize`, and `total` from the response. Changing either filter resets `page` to `1` and calls `loadLogs`; changing pagination calls `loadLogs` with the new values.

- [ ] **Step 4: Implement template and formatting**

Use `PageHeader` title “调用日志” and description “查询工具执行状态与基础审计信息”, with refresh action. Render a toolbar with a tool `el-select` when `tool:read` is available, otherwise an `el-input-number` labeled “工具 ID”, plus status select with all/running/success/failed options.

Render an `el-table` with request ID, tool code/type, tool ID, user ID, status, duration (`N ms`), start/end time, error code, and error message. Use `el-tag` for invocation status and a helper that replaces `T` with a space for timestamps. Do not include arguments, response data, or credential fields in the template.

Use `el-pagination` with `[20, 50, 100]`, `total`, `current-page`, and `page-size`, and handle `current-change`/`size-change`. Reuse the existing management styles, table overflow, inline error retry, and empty slot.

- [ ] **Step 5: Run log tests to verify they pass**

Run:

```bash
npm test -- src/views/tool/__tests__/ToolInvocationLogView.spec.ts
```

Expected: PASS for initial loading, optional tool filter, status filter, pagination, empty data, retry, and audit-field redaction.

---

### Task 6: Run the complete frontend verification

**Files:**
- Verify: `src/api/tools.ts`
- Verify: `src/types/tools.ts`
- Verify: `src/router/index.ts`
- Verify: `src/components/layout/Sidebar.vue`
- Verify: `src/views/tool/ToolManagementView.vue`
- Verify: `src/views/tool/McpServerManagementView.vue`
- Verify: `src/views/tool/ToolInvocationLogView.vue`
- Verify: all new and modified tests

- [ ] **Step 1: Run all unit tests**

Run:

```bash
npm test
```

Expected: PASS for the complete existing and new Vitest suite.

- [ ] **Step 2: Run type checking**

Run:

```bash
npm run type-check
```

Expected: `vue-tsc --build` exits with code 0 and reports no errors for route components, Element Plus event types, request payloads, or nullable backend fields.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: type checking and Vite build both complete successfully.

- [ ] **Step 4: Exercise the pages in the browser**

Start the app with:

```bash
npm run dev
```

Using an account with the relevant permissions, verify:

1. The Tool Management, MCP Server, and Invocation Logs entries appear in the sidebar and route to the correct pages.
2. Tool filters update the visible list; HTTP create/edit sends parsed JSON; MCP discovered tools have no edit action.
3. MCP Server create/edit preserves a credential when the credential input is blank; discovery displays counts and refreshes state.
4. Invocation logs load, filter, paginate, and display no credentials or request/response payloads.
5. A failed API request shows an inline retry or message without leaving a stale submitting/loading state.

- [ ] **Step 5: Run whitespace and working-tree checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Review that only the design document, implementation files, and tests for this feature are present. Do not create a Git commit unless the user explicitly requests one.
