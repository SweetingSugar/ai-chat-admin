# Agent 管理查看界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Vue 3 管理后台中新增一个沿用原有样式的只读 Agent 管理页面，接入后端分页查询、详情展示和 `agent:read` 权限。

**Architecture:** 新增独立的 Agent API/类型模块和 `AgentManagementView.vue`。页面通过服务端分页加载 `/api/admin/agents`，使用列表记录直接打开详情抽屉；路由和 Sidebar 使用现有权限守卫与 `auth.hasPermission`，不新增状态管理或请求封装。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Vue Router 4、Element Plus 2、Pinia、Axios API client、Vitest、Vue Test Utils。

---

## 文件结构与职责

实现前保持以下边界：

- Create `src/types/agents.ts`：定义后端 `AgentAdminVO` 和分页查询/响应类型。
- Create `src/api/agents.ts`：只封装 `listAgents` 和 `getAgent` 两个 GET 请求。
- Create `src/views/AgentManagementView.vue`：负责列表分页、刷新、错误状态和详情抽屉；不负责权限判断，权限由路由和 Sidebar 控制。
- Create `src/api/__tests__/agents.spec.ts`：验证 API wrapper 的路径和分页参数。
- Create `src/views/__tests__/AgentManagementView.spec.ts`：验证页面加载、分页、详情、空字段和重试。
- Modify `src/router/index.ts`：注册 `/agents` 路由、权限元数据和默认入口路径。
- Modify `src/components/layout/Sidebar.vue`：在“AI 配置”分组增加 Agent 菜单项。
- Modify `src/router/__tests__/guards.spec.ts`：验证 Agent 权限的入口选择、访问和拒绝。
- Modify `src/components/layout/__tests__/Sidebar.spec.ts`：验证 Agent 菜单按权限显示或隐藏。

所有实现使用现有 `apiClient`、`PageHeader`、`StatusTag`、`getApiErrorMessage` 和 CSS 变量；不要引入新的依赖或改动后端项目。

### Task 1: 建立 Agent 类型与 API wrapper

**Files:**
- Create: `src/types/agents.ts`
- Create: `src/api/agents.ts`
- Test: `src/api/__tests__/agents.spec.ts`

- [ ] **Step 1: 先写 API wrapper 的失败测试**

创建 `src/api/__tests__/agents.spec.ts`，先验证分页列表和详情路径：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { getAgent, listAgents } from '@/api/agents'

const page = {
  records: [],
  total: 0,
  current: 1,
  size: 20,
  pages: 0,
}

afterEach(() => vi.restoreAllMocks())

describe('agent management API wrappers', () => {
  it('requests the administrator agent page with pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listAgents({ page: 2, size: 50 })

    expect(apiClient.get).toHaveBeenCalledWith('admin/agents', {
      params: { page: 2, size: 50 },
    })
  })

  it('requests one administrator agent by id', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ id: 9 })

    await getAgent(9)

    expect(apiClient.get).toHaveBeenCalledWith('admin/agents/9')
  })
})
```

- [ ] **Step 2: 运行测试，确认它因模块尚未存在而失败**

运行：

```bash
npm test -- src/api/__tests__/agents.spec.ts
```

预期：FAIL，错误指向 `@/api/agents` 尚未创建；此时不要为了让测试通过而修改测试断言。

- [ ] **Step 3: 添加类型定义和最小 API 实现**

创建 `src/types/agents.ts`：

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

创建 `src/api/agents.ts`：

```ts
import { apiClient } from '@/api/client'
import type { AgentAdmin, AgentPage, AgentPageQuery } from '@/types/agents'

export function listAgents(query: AgentPageQuery): Promise<AgentPage> {
  return apiClient.get<AgentPage>('admin/agents', { params: query })
}

export function getAgent(id: number): Promise<AgentAdmin> {
  return apiClient.get<AgentAdmin>(`admin/agents/${id}`)
}
```

API 路径不写 `/api` 前缀，因为现有 `apiClient` 的 base URL 已经是 `/api`。

- [ ] **Step 4: 运行 API 测试和类型检查**

运行：

```bash
npm test -- src/api/__tests__/agents.spec.ts
npm run type-check
```

预期：API 测试 2 个用例 PASS，类型检查 PASS。

- [ ] **Step 5: 提交 API 和类型契约**

```bash
git add src/types/agents.ts src/api/agents.ts src/api/__tests__/agents.spec.ts
git commit -m "feat: add admin agent api types"
```

### Task 2: 接入侧边栏权限入口

**Files:**
- Modify: `src/components/layout/Sidebar.vue`
- Test: `src/components/layout/__tests__/Sidebar.spec.ts`

- [ ] **Step 1: 先写 Sidebar 的失败测试**

在 `src/components/layout/__tests__/Sidebar.spec.ts` 中将 `/agents` 加入测试路由数组：

```ts
{ path: '/agents', component: routeComponent },
```

然后增加以下两个用例：

```ts
it('shows Agent management with agent-read permission', async () => {
  const wrapper = await mountSidebar(['agent:read'])

  expect(wrapper.text()).toContain('Agent 管理')
  expect(wrapper.get('a[href="/agents"]')).toBeTruthy()
  expect(wrapper.findAll('.nav-item')).toHaveLength(8)

  wrapper.unmount()
})

it('hides Agent management without agent-read permission', async () => {
  const wrapper = await mountSidebar()

  expect(wrapper.text()).not.toContain('Agent 管理')
  expect(wrapper.find('a[href="/agents"]').exists()).toBe(false)

  wrapper.unmount()
})
```

- [ ] **Step 2: 运行 Sidebar 测试，确认它们失败**

运行：

```bash
npm test -- src/components/layout/__tests__/Sidebar.spec.ts
```

预期：新增 Agent 相关断言 FAIL，原因是 Sidebar 导航数组尚未添加 Agent 项。

- [ ] **Step 3: 添加 Agent 菜单项**

在 `src/components/layout/Sidebar.vue` 的“AI 配置”分组中，在模型管理后增加：

```ts
{ label: 'Agent 管理', path: '/agents', permission: 'agent:read' },
```

不要修改现有分组过滤逻辑、折叠行为或导航样式。

- [ ] **Step 4: 重新运行 Sidebar 测试**

运行：

```bash
npm test -- src/components/layout/__tests__/Sidebar.spec.ts
```

预期：Sidebar 测试全部 PASS。

- [ ] **Step 5: 提交 Sidebar 权限入口**

```bash
git add src/components/layout/Sidebar.vue src/components/layout/__tests__/Sidebar.spec.ts
git commit -m "feat: add admin agent sidebar entry"
```

### Task 3: 以 TDD 实现 Agent 列表和详情抽屉

**Files:**
- Create: `src/views/AgentManagementView.vue`
- Test: `src/views/__tests__/AgentManagementView.spec.ts`
- Modify: `src/router/index.ts`
- Test: `src/router/__tests__/guards.spec.ts`

- [ ] **Step 1: 先写页面行为测试**

创建 `src/views/__tests__/AgentManagementView.spec.ts`：

```ts
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgentManagementView from '@/views/AgentManagementView.vue'
import * as agentsApi from '@/api/agents'

vi.mock('@/api/agents', () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
}))

const agent = {
  id: 9,
  userId: 100,
  name: '客服 Agent',
  description: '处理客户咨询',
  systemPrompt: '你是一个客服助手。\n请简洁回答。',
  modelId: 30,
  knowledgeBaseIds: [12, 13],
  toolCodes: ['weather', 'search'],
  status: 1 as const,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-06T11:30:00',
}

const page = {
  records: [agent],
  total: 1,
  current: 1,
  size: 20,
  pages: 1,
}

beforeEach(() => {
  vi.mocked(agentsApi.listAgents).mockResolvedValue(page)
  vi.mocked(agentsApi.getAgent).mockResolvedValue(agent)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('AgentManagementView', () => {
  it('loads and renders the paged agent list', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(agentsApi.listAgents).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('客服 Agent')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('30')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('2026-11-06 11:30:00')
  })

  it('requests the next page and a new page size', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    await pagination.vm.$emit('current-change', 2)
    await flushPromises()
    expect(agentsApi.listAgents).toHaveBeenLastCalledWith({ page: 2, size: 20 })

    await pagination.vm.$emit('size-change', 50)
    await flushPromises()
    expect(agentsApi.listAgents).toHaveBeenLastCalledWith({ page: 1, size: 50 })
  })

  it('reloads the current page when refresh is clicked', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    await wrapper.get('[data-test="agents-refresh"]').trigger('click')
    await flushPromises()

    expect(agentsApi.listAgents).toHaveBeenLastCalledWith({ page: 1, size: 20 })
    expect(agentsApi.listAgents).toHaveBeenCalledTimes(2)
  })

  it('opens the detail drawer with the selected agent data', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    await wrapper.get('[data-test="agent-detail-9"]').trigger('click')

    expect(wrapper.text()).toContain('你是一个客服助手。')
    expect(wrapper.text()).toContain('12、13')
    expect(wrapper.text()).toContain('weather、search')
    expect(agentsApi.getAgent).not.toHaveBeenCalled()
  })

  it('shows the empty state when the page has no records', async () => {
    vi.mocked(agentsApi.listAgents).mockResolvedValue({
      ...page,
      records: [],
      total: 0,
      pages: 0,
    })
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无 Agent 数据')
  })

  it('shows placeholders when optional values and resource bindings are empty', async () => {
    vi.mocked(agentsApi.listAgents).mockResolvedValue({
      ...page,
      records: [{
        ...agent,
        description: null,
        modelId: null,
        knowledgeBaseIds: [],
        toolCodes: [],
      }],
    })
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无关联知识库')
    expect(wrapper.text()).toContain('暂无关联工具')
    expect(wrapper.text()).toContain('—')
  })

  it('shows a retry action after list loading fails', async () => {
    vi.mocked(agentsApi.listAgents)
      .mockRejectedValueOnce(new Error('加载失败'))
      .mockResolvedValueOnce(page)
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('请求失败，请稍后重试')
    await wrapper.get('[data-test="agents-retry"]').trigger('click')
    await flushPromises()

    expect(agentsApi.listAgents).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('客服 Agent')
  })
})
```

- [ ] **Step 2: 运行页面测试，确认它因页面尚未创建而失败**

运行：

```bash
npm test -- src/views/__tests__/AgentManagementView.spec.ts
```

预期：FAIL，错误指向 `@/views/AgentManagementView.vue` 尚未创建。

- [ ] **Step 3: 编写页面的状态和数据加载逻辑**

创建 `src/views/AgentManagementView.vue` 的 `<script setup lang="ts">`，使用以下状态和函数结构：

```ts
import { onMounted, ref } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import * as agentsApi from '@/api/agents'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import type { AgentAdmin } from '@/types/agents'

const agents = ref<AgentAdmin[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const detailVisible = ref(false)
const selectedAgent = ref<AgentAdmin | null>(null)
let requestId = 0

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

function formatValues(values: Array<number | string>, emptyLabel: string): string {
  return values.length === 0 ? emptyLabel : values.join('、')
}

async function loadAgents(): Promise<void> {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await agentsApi.listAgents({ page: page.value, size: pageSize.value })
    if (currentRequestId !== requestId) return
    agents.value = result.records
    total.value = result.total
    page.value = result.current
    pageSize.value = result.size
  } catch (reason) {
    if (currentRequestId === requestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

function changePage(value: number): void {
  page.value = value
  void loadAgents()
}

function changePageSize(value: number): void {
  page.value = 1
  pageSize.value = value
  void loadAgents()
}

function openDetail(agent: AgentAdmin): void {
  selectedAgent.value = agent
  detailVisible.value = true
}

function clearDetail(): void {
  detailVisible.value = false
  selectedAgent.value = null
}

onMounted(() => {
  void loadAgents()
})
```

列表接口已经返回详情字段，所以 `openDetail` 直接保存当前行，不调用 `getAgent`；保留 API wrapper 供后续懒加载使用。

- [ ] **Step 4: 添加列表、分页和详情抽屉模板**

在同一个 Vue 文件中使用现有管理页结构，关键模板如下：

```vue
<template>
  <section class="management-page">
    <PageHeader title="Agent 管理" description="查看系统中的 Agent 配置与资源关联">
      <template #actions>
        <el-button data-test="agents-refresh" :loading="loading" @click="loadAgents">刷新</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button data-test="agents-retry" text type="danger" size="small" @click="loadAgents">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="agents" row-key="id" class="management-table">
          <el-table-column label="Agent" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.name }}</strong>
              <small>{{ row.description || '—' }}</small>
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="所属用户" width="100" />
          <el-table-column label="模型" width="100">
            <template #default="{ row }">{{ row.modelId ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="知识库" width="100">
            <template #default="{ row }">{{ row.knowledgeBaseIds.length }}</template>
          </el-table-column>
          <el-table-column label="工具" width="90">
            <template #default="{ row }">{{ row.toolCodes.length }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="90">
            <template #default="{ row }">
              <el-button :data-test="`agent-detail-${row.id}`" text type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无 Agent 数据</span></template>
        </el-table>
      </div>
      <div class="pagination-row">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </article>

    <el-drawer
      v-model="detailVisible"
      :title="selectedAgent?.name ?? 'Agent 详情'"
      size="620px"
      :append-to-body="false"
      @close="clearDetail"
    >
      <div v-if="selectedAgent" class="detail-panel">
        <section>
          <h3>基本信息</h3>
          <dl class="detail-list">
            <div><dt>Agent ID</dt><dd>{{ selectedAgent.id }}</dd></div>
            <div><dt>所属用户 ID</dt><dd>{{ selectedAgent.userId }}</dd></div>
            <div><dt>描述</dt><dd>{{ selectedAgent.description || '—' }}</dd></div>
            <div><dt>状态</dt><dd><StatusTag :status="selectedAgent.status" /></dd></div>
            <div><dt>创建时间</dt><dd>{{ formatDateTime(selectedAgent.createTime) }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatDateTime(selectedAgent.updateTime) }}</dd></div>
          </dl>
        </section>
        <section>
          <h3>运行配置</h3>
          <dl class="detail-list">
            <div><dt>模型 ID</dt><dd>{{ selectedAgent.modelId ?? '—' }}</dd></div>
          </dl>
          <pre class="prompt-content">{{ selectedAgent.systemPrompt }}</pre>
        </section>
        <section>
          <h3>关联资源</h3>
          <dl class="detail-list">
            <div><dt>知识库 ID</dt><dd>{{ formatValues(selectedAgent.knowledgeBaseIds, '暂无关联知识库') }}</dd></div>
            <div><dt>工具编码</dt><dd>{{ formatValues(selectedAgent.toolCodes, '暂无关联工具') }}</dd></div>
          </dl>
        </section>
      </div>
    </el-drawer>
  </section>
</template>
```

`formatValues` 统一将数字 ID 或字符串编码用 `、` 连接；只对空数组显示明确的中文占位文本。

- [ ] **Step 5: 添加与现有后台一致的页面样式**

在 Vue 文件中添加 scoped CSS，至少包含以下规则，确保表格可横向滚动、抽屉长文本可换行：

```css
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 980px; }
.management-table small { display: block; color: var(--color-text-muted); font-size: 11px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.empty-state { color: var(--color-text-muted); }
.detail-panel { display: grid; gap: 22px; }
.detail-panel section { display: grid; gap: 12px; }
.detail-panel h3 { margin: 0; font-size: 14px; }
.detail-list { display: grid; gap: 10px; margin: 0; }
.detail-list div { display: grid; grid-template-columns: 110px 1fr; gap: 12px; }
.detail-list dt { color: var(--color-text-muted); }
.detail-list dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.prompt-content { max-height: 36vh; margin: 0; padding: 14px; overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-background); white-space: pre-wrap; overflow-wrap: anywhere; }
```

不要增加新的颜色、圆角或阴影值；全部复用现有 CSS 变量和管理页面间距。

- [ ] **Step 6: 先写 Agent 路由守卫的失败测试**

在 `src/router/__tests__/guards.spec.ts` 的现有入口测试之后增加：

```ts
it('chooses agent management when agent-read is the first available entry', () => {
  expect(getFirstAccessiblePath(['agent:read'])).toBe('/agents')
})

it('allows a user with only agent-read permission to enter agent management', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: ['agent:read'] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/agents')

  expect(router.currentRoute.value.fullPath).toBe('/agents')
})

it('redirects an authenticated user without agent-read permission to forbidden', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: [] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/agents')

  expect(router.currentRoute.value.fullPath).toBe('/forbidden')
})
```

- [ ] **Step 7: 运行 Agent 路由测试，确认它们失败**

运行：

```bash
npm test -- src/router/__tests__/guards.spec.ts
```

预期：新增三个 Agent 测试 FAIL，因为 `/agents` 路由和 `accessibleEntries` 尚未注册。

- [ ] **Step 8: 注册 Agent 路由和默认入口**

在 `src/router/index.ts` 中添加页面导入：

```ts
import AgentManagementView from '@/views/AgentManagementView.vue'
```

在 `AdminLayout` 的 children 中增加：

```ts
{
  path: 'agents',
  component: AgentManagementView,
  meta: { requiresAuth: true, permission: 'agent:read', title: 'Agent 管理' },
},
```

在 `accessibleEntries` 的 AI 相关入口附近增加：

```ts
['/agents', 'agent:read'],
```

路由的 `meta.permission` 和默认入口必须使用同一个 `agent:read` 字符串。

- [ ] **Step 9: 运行 Agent 页面、路由和 Sidebar 测试**

运行：

```bash
npm test -- src/views/__tests__/AgentManagementView.spec.ts src/router/__tests__/guards.spec.ts src/components/layout/__tests__/Sidebar.spec.ts
```

预期：页面、路由和 Sidebar 相关测试全部 PASS。

- [ ] **Step 10: 提交 Agent 页面、路由和权限守卫**

```bash
git add src/views/AgentManagementView.vue src/views/__tests__/AgentManagementView.spec.ts src/router/index.ts src/router/__tests__/guards.spec.ts
git commit -m "feat: add admin agent management view"
```

### Task 4: 完成全量验证并检查交付范围

**Files:**
- No new source files.
- Review: all files changed by Tasks 1–3.

- [ ] **Step 1: 运行完整自动化验证**

```bash
npm test
npm run type-check
npm run build
```

预期：所有 Vitest 测试 PASS，`vue-tsc --build` PASS，Vite production build PASS。

- [ ] **Step 2: 检查最终差异和未跟踪文件**

```bash
git status --short
git diff HEAD~4 --check
git diff --stat HEAD~4
```

确认结果中只包含 Agent 类型/API、页面测试、路由、Sidebar、对应测试以及本次功能需要的文档变更；不包含 Token、API Key、凭证或无关格式化修改。

- [ ] **Step 3: 手动检查主流程**

启动前端开发服务器：

```bash
npm run dev
```

使用拥有 `agent:read` 的账号检查：

1. 侧边栏“AI 配置”下显示“Agent 管理”；
2. `/agents` 首次加载显示分页列表；
3. 切换页码和每页条数时请求参数改变；
4. 点击“刷新”重新加载当前页；
5. 点击“详情”打开抽屉，系统提示词保留换行，知识库 ID 和工具编码正确显示；
6. 空描述、空模型、空关联资源显示占位文本；
7. 模拟请求失败时显示错误和“重试”；
8. 无 `agent:read` 权限的账号看不到菜单，直接访问 `/agents` 会进入无权限页面。

- [ ] **Step 4: 在提交最终结果前确认工作树状态**

```bash
git status --short --branch
```

预期：工作树干净，当前分支包含 Task 1、Task 2、Task 3 的提交和已验证的实现。
