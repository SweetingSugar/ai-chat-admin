# 管理员知识库与文档查看前端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Vue 3 管理后台中增加受 `knowledge:read` 权限保护的知识库分页列表、文档抽屉、文本文档内容查看和文件文档预览。

**Architecture:** 新增独立的知识库类型与 API wrapper，新增一个沿用现有管理页样式的 `KnowledgeBaseManagementView`。知识库和文档在同一页面中通过右侧抽屉查看；文本内容调用知识库内容接口，文件内容复用现有管理员文件详情和预签名 URL API。路由和侧边栏沿用现有权限元数据与 `useAuthStore` 规则，不增加通用组件或后端改动。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Pinia、Element Plus、Vitest、Vue Test Utils、Vite。

---

## 文件变更总览

- Create: `src/types/knowledge.ts` — 知识库、文档、内容和分页类型。
- Create: `src/api/knowledge.ts` — 三个管理员知识库 API wrapper。
- Create: `src/api/__tests__/knowledge.spec.ts` — API 路径和参数测试。
- Modify: `src/router/index.ts` — 注册知识库路由和首个可访问路径。
- Modify: `src/router/__tests__/guards.spec.ts` — 路由元数据、权限访问和首个入口测试。
- Modify: `src/components/layout/Sidebar.vue` — 在系统管理分组增加权限过滤的知识库入口。
- Create: `src/components/layout/__tests__/Sidebar.spec.ts` — 入口显示权限测试。
- Create: `src/views/system/KnowledgeBaseManagementView.vue` — 知识库列表、文档抽屉、文本内容和文件预览。
- Create: `src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts` — 页面交互、并发请求和预览分支测试。

不修改后端项目、现有文件 API wrapper 或公共管理组件。

---

### Task 1: Add knowledge-base types and API wrappers

**Files:**
- Create: `src/types/knowledge.ts`
- Create: `src/api/knowledge.ts`
- Test: `src/api/__tests__/knowledge.spec.ts`

- [ ] **Step 1: Write the failing API wrapper tests**

Create `src/api/__tests__/knowledge.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import {
  getKnowledgeDocumentContent,
  listKnowledgeBases,
  listKnowledgeDocuments,
} from '@/api/knowledge'

const page = {
  records: [],
  total: 0,
  current: 1,
  size: 20,
  pages: 0,
}

afterEach(() => vi.restoreAllMocks())

describe('knowledge API wrappers', () => {
  it('requests the administrator knowledge-base page', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listKnowledgeBases({ page: 2, size: 50 })

    expect(apiClient.get).toHaveBeenCalledWith('admin/knowledge-bases', {
      params: { page: 2, size: 50 },
    })
  })

  it('requests documents for a knowledge base with pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listKnowledgeDocuments(12, { page: 3, size: 10 })

    expect(apiClient.get).toHaveBeenCalledWith('admin/knowledge-bases/12/documents', {
      params: { page: 3, size: 10 },
    })
  })

  it('requests text content for a document in its knowledge base', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      documentId: 21,
      title: '制度',
      content: '第一条',
    })

    await getKnowledgeDocumentContent(12, 21)

    expect(apiClient.get).toHaveBeenCalledWith(
      'admin/knowledge-bases/12/documents/21/content',
    )
  })
})
```

- [ ] **Step 2: Run the focused API test and verify it fails**

Run:

```bash
npm test -- src/api/__tests__/knowledge.spec.ts
```

Expected: FAIL because `@/api/knowledge` and its exported functions do not exist.

- [ ] **Step 3: Add the knowledge domain types**

Create `src/types/knowledge.ts`:

```ts
export type KnowledgeBaseStatus = 'ACTIVE' | 'DISABLED' | 'DELETED'
export type KnowledgeDocumentSourceType = 'FILE' | 'TEXT'
export type KnowledgeDocumentStatus = 'PENDING' | 'INDEXING' | 'READY' | 'FAILED' | 'DELETED'

export interface KnowledgePage<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export interface KnowledgePageQuery {
  page: number
  size: number
}

export interface KnowledgeBaseAdmin {
  id: number
  userId: number
  name: string
  description: string | null
  embeddingModelId: number | null
  embeddingModelVersion: number | null
  pendingEmbeddingModelId: number | null
  pendingEmbeddingModelVersion: number | null
  activeIndexVersion: number | null
  reindexing: boolean
  status: KnowledgeBaseStatus
  createTime: string
  updateTime: string
}

export interface KnowledgeDocument {
  id: number
  title: string
  sourceType: KnowledgeDocumentSourceType
  fileId: number | null
  status: KnowledgeDocumentStatus
  indexVersion: number | null
  activeIndexVersion: number | null
  chunkCount: number | null
  errorCode: string | null
  errorMessage: string | null
  createTime: string
  updateTime: string
}

export interface KnowledgeDocumentContent {
  documentId: number
  title: string
  content: string
}
```

Use `null` for nullable Java `Long`, `Integer`, and `String` fields. Keep the `DELETED` union members because they are valid backend enum values even though the administrator endpoints filter deleted records.

- [ ] **Step 4: Implement the API wrappers**

Create `src/api/knowledge.ts`:

```ts
import { apiClient } from '@/api/client'
import type {
  KnowledgeBaseAdmin,
  KnowledgeDocument,
  KnowledgeDocumentContent,
  KnowledgePage,
  KnowledgePageQuery,
} from '@/types/knowledge'

export function listKnowledgeBases(
  query: KnowledgePageQuery,
): Promise<KnowledgePage<KnowledgeBaseAdmin>> {
  return apiClient.get<KnowledgePage<KnowledgeBaseAdmin>>('admin/knowledge-bases', {
    params: query,
  })
}

export function listKnowledgeDocuments(
  knowledgeBaseId: number,
  query: KnowledgePageQuery,
): Promise<KnowledgePage<KnowledgeDocument>> {
  return apiClient.get<KnowledgePage<KnowledgeDocument>>(
    `admin/knowledge-bases/${knowledgeBaseId}/documents`,
    { params: query },
  )
}

export function getKnowledgeDocumentContent(
  knowledgeBaseId: number,
  documentId: number,
): Promise<KnowledgeDocumentContent> {
  return apiClient.get<KnowledgeDocumentContent>(
    `admin/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/content`,
  )
}
```

- [ ] **Step 5: Run the API tests and verify they pass**

Run:

```bash
npm test -- src/api/__tests__/knowledge.spec.ts
```

Expected: all three wrapper tests PASS.

- [ ] **Step 6: Commit the API contract**

```bash
git add src/types/knowledge.ts src/api/knowledge.ts src/api/__tests__/knowledge.spec.ts
git commit -m "feat: add admin knowledge base API contract"
```

---

### Task 2: Add the permission-aware sidebar entry

**Files:**
- Modify: `src/components/layout/Sidebar.vue`
- Test: `src/components/layout/__tests__/Sidebar.spec.ts`

The route registration and route-guard tests are intentionally completed in Task 3, after the new view exists. This keeps each task runnable without importing a missing route component.

- [ ] **Step 1: Add failing sidebar tests**

Create `src/components/layout/__tests__/Sidebar.spec.ts`:

```ts
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from '@/components/layout/Sidebar.vue'

const permissionState = vi.hoisted(() => ({ values: new Set<string>() }))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => permissionState.values.has(permission),
  }),
}))

async function mountSidebar() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', component: { template: '<div />' } },
      { path: '/system/knowledge-bases', component: { template: '<div />' } },
    ],
  })
  await router.push('/dashboard')
  await router.isReady()
  return mount(Sidebar, { global: { plugins: [router] } })
}

describe('Sidebar knowledge-base entry', () => {
  beforeEach(() => {
    permissionState.values = new Set()
  })

  it('shows knowledge-base management with knowledge-read permission', async () => {
    permissionState.values.add('knowledge:read')

    const wrapper = await mountSidebar()

    expect(wrapper.text()).toContain('知识库管理')
    expect(wrapper.get('a[href="/system/knowledge-bases"]')).toBeTruthy()
  })

  it('hides knowledge-base management without knowledge-read permission', async () => {
    const wrapper = await mountSidebar()

    expect(wrapper.text()).not.toContain('知识库管理')
    expect(wrapper.find('a[href="/system/knowledge-bases"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the sidebar test and verify it fails**

Run:

```bash
npm test -- src/components/layout/__tests__/Sidebar.spec.ts
```

Expected: FAIL because the knowledge-base navigation entry is not registered.

- [ ] **Step 3: Add the sidebar item**

In the `系统管理` group in `src/components/layout/Sidebar.vue`, add this item after 文件管理:

```ts
{ label: '知识库管理', path: '/system/knowledge-bases', permission: 'knowledge:read' },
```

Do not add a second permission check in the template; `visibleGroups` already filters all entries using `auth.hasPermission`.

- [ ] **Step 4: Run the sidebar test and verify it passes**

Run:

```bash
npm test -- src/components/layout/__tests__/Sidebar.spec.ts
```

Expected: both sidebar permission tests PASS.

- [ ] **Step 5: Commit the permission-aware sidebar entry**

```bash
git add src/components/layout/Sidebar.vue src/components/layout/__tests__/Sidebar.spec.ts
git commit -m "feat: add knowledge base sidebar entry"
```

---

### Task 3: Add the knowledge-base list, route, and document/text drawers

**Files:**
- Create: `src/views/system/KnowledgeBaseManagementView.vue`
- Test: `src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts`
- Modify: `src/router/index.ts`
- Modify: `src/router/__tests__/guards.spec.ts`

- [ ] **Step 1: Write failing list, document, text-content, and stale-response tests**

Create `src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts` with these fixtures and mocks:

```ts
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KnowledgeBaseManagementView from '@/views/system/KnowledgeBaseManagementView.vue'
import * as knowledgeApi from '@/api/knowledge'

vi.mock('@/api/knowledge', () => ({
  listKnowledgeBases: vi.fn(),
  listKnowledgeDocuments: vi.fn(),
  getKnowledgeDocumentContent: vi.fn(),
}))

vi.mock('@/api/files', () => ({
  getFile: vi.fn(),
  getAdminFilePresignedUrl: vi.fn(),
}))

const base = {
  id: 12,
  userId: 100,
  name: '产品手册',
  description: '产品相关资料',
  embeddingModelId: 30,
  embeddingModelVersion: 1,
  pendingEmbeddingModelId: null,
  pendingEmbeddingModelVersion: null,
  activeIndexVersion: 1,
  reindexing: false,
  status: 'ACTIVE' as const,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-05T10:00:00',
}

const textDocument = {
  id: 21,
  title: '制度',
  sourceType: 'TEXT' as const,
  fileId: null,
  status: 'READY' as const,
  indexVersion: 1,
  activeIndexVersion: 1,
  chunkCount: 3,
  errorCode: null,
  errorMessage: null,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-05T10:00:00',
}

const basePage = { records: [base], total: 1, current: 1, size: 20, pages: 1 }
const documentPage = { records: [textDocument], total: 1, current: 1, size: 20, pages: 1 }

beforeEach(() => {
  vi.mocked(knowledgeApi.listKnowledgeBases).mockResolvedValue(basePage)
  vi.mocked(knowledgeApi.listKnowledgeDocuments).mockResolvedValue(documentPage)
  vi.mocked(knowledgeApi.getKnowledgeDocumentContent).mockResolvedValue({
    documentId: 21,
    title: '制度',
    content: '第一条',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('KnowledgeBaseManagementView', () => {
  it('loads and renders the knowledge-base page', async () => {
    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(knowledgeApi.listKnowledgeBases).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('产品手册')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('2026-11-05 10:00:00')
  })

  it('opens the document drawer and loads text content', async () => {
    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
    await flushPromises()

    expect(knowledgeApi.listKnowledgeDocuments).toHaveBeenCalledWith(12, { page: 1, size: 20 })
    expect(wrapper.text()).toContain('制度')

    await wrapper.get('[data-test="knowledge-document-content-21"]').trigger('click')
    await flushPromises()

    expect(knowledgeApi.getKnowledgeDocumentContent).toHaveBeenCalledWith(12, 21)
    expect(wrapper.text()).toContain('第一条')
  })

  it('requests document pages when the document pagination changes', async () => {
    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
    await flushPromises()

    const documentPagination = wrapper.findAllComponents({ name: 'ElPagination' })[1]
    await documentPagination.vm.$emit('current-change', 2)
    await flushPromises()
    expect(knowledgeApi.listKnowledgeDocuments).toHaveBeenLastCalledWith(12, { page: 2, size: 20 })

    await documentPagination.vm.$emit('size-change', 50)
    await flushPromises()
    expect(knowledgeApi.listKnowledgeDocuments).toHaveBeenLastCalledWith(12, { page: 1, size: 50 })
  })

  it('keeps the newest document response after switching knowledge bases', async () => {
    const secondBase = { ...base, id: 13, name: '第二知识库', userId: 101 }
    vi.mocked(knowledgeApi.listKnowledgeBases).mockResolvedValue({
      ...basePage,
      records: [base, secondBase],
      total: 2,
    })
    let resolveFirst: (value: typeof documentPage) => void = () => undefined
    let resolveSecond: (value: typeof documentPage) => void = () => undefined
    vi.mocked(knowledgeApi.listKnowledgeDocuments)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
    await wrapper.get('[data-test="knowledge-documents-13"]').trigger('click')

    const newestDocument = { ...textDocument, id: 22, title: '新制度' }
    resolveSecond({ ...documentPage, records: [newestDocument] })
    await flushPromises()
    resolveFirst(documentPage)
    await flushPromises()

    expect(wrapper.text()).toContain('新制度')
    expect(wrapper.text()).not.toContain('制度')
  })
})
```

- [ ] **Step 2: Run the view tests and verify they fail**

Run:

```bash
npm test -- src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
```

Expected: FAIL because the view file and its list/document/content behavior do not exist.

- [ ] **Step 3: Implement the list and text/document state**

Create `src/views/system/KnowledgeBaseManagementView.vue`. Start the `<script setup lang="ts">` with these state variables and helpers:

```ts
import { computed, onMounted, ref } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import * as knowledgeApi from '@/api/knowledge'
import PageHeader from '@/components/management/PageHeader.vue'
import type {
  KnowledgeBaseAdmin,
  KnowledgeBaseStatus,
  KnowledgeDocument,
  KnowledgeDocumentContent,
  KnowledgeDocumentSourceType,
  KnowledgeDocumentStatus,
} from '@/types/knowledge'

const knowledgeBases = ref<KnowledgeBaseAdmin[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const basePage = ref(1)
const basePageSize = ref(20)
const baseTotal = ref(0)

const documentsVisible = ref(false)
const selectedBase = ref<KnowledgeBaseAdmin | null>(null)
const documents = ref<KnowledgeDocument[]>([])
const documentsLoading = ref(false)
const documentsError = ref<string | null>(null)
const documentPage = ref(1)
const documentPageSize = ref(20)
const documentTotal = ref(0)

const contentVisible = ref(false)
const contentLoading = ref(false)
const contentError = ref<string | null>(null)
const contentDocument = ref<KnowledgeDocument | null>(null)
const selectedContent = ref<KnowledgeDocumentContent | null>(null)

let baseRequestId = 0
let documentRequestId = 0
let contentRequestId = 0

const baseStatusLabels: Record<KnowledgeBaseStatus, string> = {
  ACTIVE: '启用',
  DISABLED: '停用',
  DELETED: '已删除',
}
const sourceTypeLabels: Record<KnowledgeDocumentSourceType, string> = {
  TEXT: '文本',
  FILE: '文件',
}
const documentStatusLabels: Record<KnowledgeDocumentStatus, string> = {
  PENDING: '待处理',
  INDEXING: '索引中',
  READY: '就绪',
  FAILED: '失败',
  DELETED: '已删除',
}

const documentsTitle = computed(() => selectedBase.value
  ? `文档：${selectedBase.value.name}`
  : '知识库文档')

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

function formatIndexState(row: KnowledgeBaseAdmin): string {
  if (row.reindexing) return '重建中'
  return row.activeIndexVersion === null ? '未建立' : `版本 ${row.activeIndexVersion}`
}

async function loadKnowledgeBases(): Promise<void> {
  const requestId = ++baseRequestId
  loading.value = true
  error.value = null
  try {
    const result = await knowledgeApi.listKnowledgeBases({
      page: basePage.value,
      size: basePageSize.value,
    })
    if (requestId !== baseRequestId) return
    knowledgeBases.value = result.records
    baseTotal.value = result.total
    basePage.value = result.current
    basePageSize.value = result.size
  } catch (reason) {
    if (requestId === baseRequestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === baseRequestId) loading.value = false
  }
}

function openDocuments(row: KnowledgeBaseAdmin): void {
  documentRequestId += 1
  selectedBase.value = row
  documents.value = []
  documentsError.value = null
  documentPage.value = 1
  documentPageSize.value = 20
  documentsVisible.value = true
  void loadDocuments()
}

async function loadDocuments(): Promise<void> {
  const base = selectedBase.value
  if (!base) return
  const requestId = ++documentRequestId
  documentsLoading.value = true
  documentsError.value = null
  try {
    const result = await knowledgeApi.listKnowledgeDocuments(base.id, {
      page: documentPage.value,
      size: documentPageSize.value,
    })
    if (requestId !== documentRequestId || selectedBase.value?.id !== base.id) return
    documents.value = result.records
    documentTotal.value = result.total
    documentPage.value = result.current
    documentPageSize.value = result.size
  } catch (reason) {
    if (requestId === documentRequestId) documentsError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === documentRequestId) documentsLoading.value = false
  }
}

function clearDocuments(): void {
  documentRequestId += 1
  documentsVisible.value = false
  selectedBase.value = null
  documents.value = []
  documentsError.value = null
}

async function openTextContent(row: KnowledgeDocument): Promise<void> {
  const base = selectedBase.value
  if (!base || row.sourceType !== 'TEXT') return
  const requestId = ++contentRequestId
  contentDocument.value = row
  contentVisible.value = true
  contentLoading.value = true
  contentError.value = null
  selectedContent.value = null
  try {
    const result = await knowledgeApi.getKnowledgeDocumentContent(base.id, row.id)
    if (requestId === contentRequestId && selectedBase.value?.id === base.id) {
      selectedContent.value = result
    }
  } catch (reason) {
    if (requestId === contentRequestId) contentError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === contentRequestId) contentLoading.value = false
  }
}

async function retryTextContent(): Promise<void> {
  if (contentDocument.value) await openTextContent(contentDocument.value)
}

function clearContent(): void {
  contentRequestId += 1
  contentVisible.value = false
  contentDocument.value = null
  selectedContent.value = null
  contentError.value = null
  contentLoading.value = false
}

function changeBasePage(value: number): void {
  basePage.value = value
  void loadKnowledgeBases()
}

function changeBasePageSize(value: number): void {
  basePage.value = 1
  basePageSize.value = value
  void loadKnowledgeBases()
}

function changeDocumentPage(value: number): void {
  documentPage.value = value
  void loadDocuments()
}

function changeDocumentPageSize(value: number): void {
  documentPage.value = 1
  documentPageSize.value = value
  void loadDocuments()
}

onMounted(() => {
  void loadKnowledgeBases()
})
```

Add the template using existing management-page conventions. The base table must include the `data-test="knowledge-documents-${row.id}"` action. The document drawer must use `size="720px"`, `:append-to-body="false"`, `v-loading`, the `documentsError` retry button, and a pagination component with `[20, 50, 100]`. The text content drawer must use `data-test="knowledge-document-content-${row.id}"` on the text action and render the returned text in a scrollable `<pre>`.

Use these essential template sections:

```vue
<section class="management-page">
  <PageHeader title="知识库管理" description="查看平台知识库及其文档内容">
    <template #actions>
      <el-button :loading="loading" @click="loadKnowledgeBases">刷新</el-button>
    </template>
  </PageHeader>

  <article class="management-panel">
    <div v-if="error" class="inline-error" role="alert">
      {{ error }}
      <el-button text type="danger" size="small" @click="loadKnowledgeBases">重试</el-button>
    </div>
    <div class="table-scroll">
      <el-table v-loading="loading" :data="knowledgeBases" row-key="id" class="management-table">
        <el-table-column prop="name" label="知识库名称" min-width="180" />
        <el-table-column prop="userId" label="用户 ID" width="100" />
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">{{ baseStatusLabels[row.status] }}</template>
        </el-table-column>
        <el-table-column label="索引状态" width="120">
          <template #default="{ row }">{{ formatIndexState(row) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="120">
          <template #default="{ row }">
            <el-button
              :data-test="`knowledge-documents-${row.id}`"
              text
              type="primary"
              @click="openDocuments(row)"
            >
              查看文档
            </el-button>
          </template>
        </el-table-column>
        <template #empty><span class="empty-state">暂无知识库数据</span></template>
      </el-table>
    </div>
    <div class="pagination-row">
      <el-pagination
        :current-page="basePage"
        :page-size="basePageSize"
        :page-sizes="[20, 50, 100]"
        :total="baseTotal"
        layout="total, sizes, prev, pager, next"
        @current-change="changeBasePage"
        @size-change="changeBasePageSize"
      />
    </div>
  </article>

  <el-drawer
    v-model="documentsVisible"
    :title="documentsTitle"
    size="720px"
    :append-to-body="false"
    @close="clearDocuments"
  >
    <div v-if="documentsError" class="inline-error" role="alert">
      {{ documentsError }}
      <el-button text type="danger" size="small" @click="loadDocuments">重试</el-button>
    </div>
    <div v-loading="documentsLoading" class="drawer-table">
      <el-table :data="documents" row-key="id" class="management-table">
        <el-table-column prop="title" label="标题" min-width="170" />
        <el-table-column label="来源" width="80">
          <template #default="{ row }">{{ sourceTypeLabels[row.sourceType] }}</template>
        </el-table-column>
        <el-table-column prop="fileId" label="文件 ID" width="90" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">{{ documentStatusLabels[row.status] }}</template>
        </el-table-column>
        <el-table-column prop="chunkCount" label="分块数" width="80" />
        <el-table-column label="更新时间" min-width="165">
          <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="110">
          <template #default="{ row }">
            <el-button
              v-if="row.sourceType === 'TEXT'"
              :data-test="`knowledge-document-content-${row.id}`"
              text
              type="primary"
              @click="openTextContent(row)"
            >
              查看内容
            </el-button>
            <span v-else class="muted-action">文件文档</span>
          </template>
        </el-table-column>
        <template #empty><span class="empty-state">暂无文档数据</span></template>
      </el-table>
    </div>
    <div class="pagination-row">
      <el-pagination
        :current-page="documentPage"
        :page-size="documentPageSize"
        :page-sizes="[20, 50, 100]"
        :total="documentTotal"
        layout="total, sizes, prev, pager, next"
        @current-change="changeDocumentPage"
        @size-change="changeDocumentPageSize"
      />
    </div>
  </el-drawer>

  <el-drawer
    v-model="contentVisible"
    :title="selectedContent?.title ?? '文档内容'"
    size="720px"
    :append-to-body="false"
    @close="clearContent"
  >
    <div v-loading="contentLoading" class="document-content-panel">
      <div v-if="contentError" class="inline-error" role="alert">
        {{ contentError }}
        <el-button text type="danger" size="small" @click="retryTextContent">重试</el-button>
      </div>
      <pre v-else-if="selectedContent" class="document-content">{{ selectedContent.content }}</pre>
    </div>
  </el-drawer>
</section>
```

For the content retry button, keep the selected document in a dedicated `contentDocument` ref rather than constructing a temporary object inline. The final implementation must use that ref so retry calls `openTextContent(contentDocument.value)` and preserves the real document metadata.

Add scoped styles matching `FileManagementView.vue`: `.management-page`, `.management-panel`, `.table-scroll`, `.management-table`, `.inline-error`, `.pagination-row`, `.empty-state`, plus `.drawer-table { overflow-x: auto; }`, `.document-content-panel { min-height: 360px; }`, `.document-content { max-height: 68vh; margin: 0; padding: 16px; overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-background); white-space: pre-wrap; overflow-wrap: anywhere; }`, and `.muted-action { color: var(--color-text-muted); font-size: 12px; }`.

- [ ] **Step 4: Run the list/document/content tests and verify they pass**

Run:

```bash
npm test -- src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
```

Expected: the list loading, document drawer, text content, pagination, and stale-response tests PASS. At this point file-document preview tests have not yet been added.

- [ ] **Step 5: Register the route and accessible entry now that the view exists**

Append these cases to `src/router/__tests__/guards.spec.ts`:

```ts
it('chooses knowledge-base management when it is the first available entry', () => {
  expect(getFirstAccessiblePath(['knowledge:read'])).toBe('/system/knowledge-bases')
})

it('allows a user with only knowledge-read permission to enter knowledge-base management', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: ['knowledge:read'] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/system/knowledge-bases')

  expect(router.currentRoute.value.fullPath).toBe('/system/knowledge-bases')
})
```

In `src/router/index.ts`, import the view next to the other system views:

```ts
import KnowledgeBaseManagementView from '@/views/system/KnowledgeBaseManagementView.vue'
```

Add this route after the existing file route:

```ts
{
  path: 'system/knowledge-bases',
  component: KnowledgeBaseManagementView,
  meta: { requiresAuth: true, permission: 'knowledge:read', title: '知识库管理' },
},
```

Add the corresponding entry after `file:read` in `accessibleEntries`:

```ts
['/system/knowledge-bases', 'knowledge:read'],
```

- [ ] **Step 6: Run route, view, and sidebar tests together**

Run:

```bash
npm test -- src/router/__tests__/guards.spec.ts src/components/layout/__tests__/Sidebar.spec.ts src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
```

Expected: all route, sidebar, list, document, and text-content tests PASS with the route importing the real view.

- [ ] **Step 7: Commit the knowledge-base and text-document view**

```bash
git add src/router/index.ts src/router/__tests__/guards.spec.ts src/views/system/KnowledgeBaseManagementView.vue src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
git commit -m "feat: add admin knowledge base and document view"
```

---

### Task 4: Add file-document preview through administrator file APIs

**Files:**
- Modify: `src/views/system/KnowledgeBaseManagementView.vue`
- Modify: `src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts`

- [ ] **Step 1: Add failing file-preview tests and fixtures**

Extend the existing view test mock for `@/api/files` with imported functions:

```ts
import * as filesApi from '@/api/files'
```

Use these mock implementations in `beforeEach`:

```ts
const file = {
  id: 9,
  userId: 100,
  originalName: '产品手册.pdf',
  contentType: 'application/pdf',
  fileSize: 2048,
  status: 'ACTIVE' as const,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-05T10:00:00',
}

vi.mocked(filesApi.getFile).mockResolvedValue(file)
vi.mocked(filesApi.getAdminFilePresignedUrl).mockResolvedValue({
  fileId: 9,
  url: 'https://download.example/manual.pdf',
  expiresIn: 600,
})
```

Add these tests using a `FILE` document record with `fileId: 9`:

```ts
it('loads file metadata and a presigned URL for a file document', async () => {
  vi.mocked(knowledgeApi.listKnowledgeDocuments).mockResolvedValue({
    ...documentPage,
    records: [{
      ...textDocument,
      id: 22,
      title: '产品手册文件',
      sourceType: 'FILE',
      fileId: 9,
    }],
  })
  const wrapper = mount(KnowledgeBaseManagementView, {
    global: { plugins: [ElementPlus] },
  })
  await flushPromises()
  await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
  await flushPromises()
  await wrapper.get('[data-test="knowledge-document-file-22"]').trigger('click')
  await flushPromises()

  expect(filesApi.getFile).toHaveBeenCalledWith(9)
  expect(filesApi.getAdminFilePresignedUrl).toHaveBeenCalledWith(9)
  expect(wrapper.find('iframe').attributes('src')).toBe('https://download.example/manual.pdf')
})

it('renders an image file document as an image preview', async () => {
  vi.mocked(knowledgeApi.listKnowledgeDocuments).mockResolvedValue({
    ...documentPage,
    records: [{ ...textDocument, id: 22, sourceType: 'FILE', fileId: 9 }],
  })
  vi.mocked(filesApi.getFile).mockResolvedValue({ ...file, contentType: 'image/jpeg' })
  vi.mocked(filesApi.getAdminFilePresignedUrl).mockResolvedValue({
    fileId: 9,
    url: 'https://download.example/manual.jpg',
    expiresIn: 600,
  })
  const wrapper = mount(KnowledgeBaseManagementView, {
    global: { plugins: [ElementPlus] },
  })
  await flushPromises()
  await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
  await flushPromises()
  await wrapper.get('[data-test="knowledge-document-file-22"]').trigger('click')
  await flushPromises()

  expect(wrapper.find('img').attributes('src')).toBe('https://download.example/manual.jpg')
})

it('shows an open link for unsupported file types', async () => {
  vi.mocked(knowledgeApi.listKnowledgeDocuments).mockResolvedValue({
    ...documentPage,
    records: [{ ...textDocument, id: 22, sourceType: 'FILE', fileId: 9 }],
  })
  vi.mocked(filesApi.getFile).mockResolvedValue({
    ...file,
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  vi.mocked(filesApi.getAdminFilePresignedUrl).mockResolvedValue({
    fileId: 9,
    url: 'https://download.example/manual.docx',
    expiresIn: 600,
  })
  const wrapper = mount(KnowledgeBaseManagementView, {
    global: { plugins: [ElementPlus] },
  })
  await flushPromises()
  await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
  await flushPromises()
  await wrapper.get('[data-test="knowledge-document-file-22"]').trigger('click')
  await flushPromises()

  expect(wrapper.text()).toContain('暂不支持在线预览')
  expect(wrapper.find('a[href="https://download.example/manual.docx"]').exists()).toBe(true)
})

it('does not request a presigned URL for an inactive file', async () => {
  vi.mocked(knowledgeApi.listKnowledgeDocuments).mockResolvedValue({
    ...documentPage,
    records: [{ ...textDocument, id: 22, sourceType: 'FILE', fileId: 9 }],
  })
  vi.mocked(filesApi.getFile).mockResolvedValue({ ...file, status: 'DELETED' })
  const wrapper = mount(KnowledgeBaseManagementView, {
    global: { plugins: [ElementPlus] },
  })
  await flushPromises()
  await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
  await flushPromises()
  await wrapper.get('[data-test="knowledge-document-file-22"]').trigger('click')
  await flushPromises()

  expect(filesApi.getAdminFilePresignedUrl).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('文件当前状态不可预览')
})
```

- [ ] **Step 2: Run the new file-preview tests and verify they fail**

Run:

```bash
npm test -- src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
```

Expected: FAIL because the document drawer does not yet expose `knowledge-document-file-*` actions and the view does not call file APIs.

- [ ] **Step 3: Add file-preview state and request flow**

Extend the view script with these imports and state:

```ts
import * as filesApi from '@/api/files'
import type { FileMetadata } from '@/types/file'

const previewVisible = ref(false)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const previewFile = ref<FileMetadata | null>(null)
const selectedFileDocument = ref<KnowledgeDocument | null>(null)
let previewRequestId = 0
```

Add these functions:

```ts
function isImagePreview(file: FileMetadata): boolean {
  return file.contentType.startsWith('image/')
}

function isEmbeddedPreview(file: FileMetadata): boolean {
  return file.contentType === 'application/pdf' || file.contentType === 'text/plain'
}

function handlePreviewContentError(): void {
  previewError.value = '文件预览加载失败，请尝试在新窗口打开'
}

function openFileDocument(row: KnowledgeDocument): void {
  selectedFileDocument.value = row
  void openFilePreview(row)
}

async function openFilePreview(row: KnowledgeDocument): Promise<void> {
  if (row.sourceType !== 'FILE' || row.fileId === null) return
  const requestId = ++previewRequestId
  previewVisible.value = true
  previewLoading.value = true
  previewError.value = null
  previewUrl.value = null
  previewFile.value = null
  try {
    const file = await filesApi.getFile(row.fileId)
    if (requestId !== previewRequestId) return
    previewFile.value = file
    if (file.status !== 'ACTIVE') {
      previewError.value = '文件当前状态不可预览'
      return
    }
    const result = await filesApi.getAdminFilePresignedUrl(row.fileId)
    if (requestId === previewRequestId) previewUrl.value = result.url
  } catch (reason) {
    if (requestId === previewRequestId) previewError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false
  }
}

async function retryFilePreview(): Promise<void> {
  const row = selectedFileDocument.value
  if (row) await openFilePreview(row)
}

function clearFilePreview(): void {
  previewRequestId += 1
  previewVisible.value = false
  previewLoading.value = false
  previewError.value = null
  previewUrl.value = null
  previewFile.value = null
  selectedFileDocument.value = null
}
```

Keep `selectedFileDocument` as a `ref<KnowledgeDocument | null>` and assign it before opening the preview. Add a separate `contentDocument` ref for text retries, as required in Task 3.

- [ ] **Step 4: Add file actions and preview drawer**

In the document operation column, replace the non-text placeholder with:

```vue
<el-button
  v-else-if="row.fileId !== null"
  :data-test="`knowledge-document-file-${row.id}`"
  text
  type="primary"
  @click="openFileDocument(row)"
>
  查看文件
</el-button>
<span v-else class="muted-action">文件不可预览</span>
```

Add this drawer after the document drawer:

```vue
<el-drawer
  v-model="previewVisible"
  :title="previewFile?.originalName ?? '文件预览'"
  size="min(960px, 90vw)"
  :append-to-body="false"
  @close="clearFilePreview"
>
  <div v-loading="previewLoading" class="file-preview">
    <div v-if="previewError" class="preview-error" role="alert">
      {{ previewError }}
      <div class="preview-error-actions">
        <el-button text type="danger" size="small" @click="retryFilePreview">重试</el-button>
        <el-link
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          type="primary"
        >在新窗口打开</el-link>
      </div>
    </div>
    <template v-else-if="previewUrl && previewFile">
      <img
        v-if="isImagePreview(previewFile)"
        class="image-preview"
        :src="previewUrl"
        :alt="previewFile.originalName"
        @error="handlePreviewContentError"
      />
      <iframe
        v-else-if="isEmbeddedPreview(previewFile)"
        class="document-preview"
        :src="previewUrl"
        :title="previewFile.originalName"
        @error="handlePreviewContentError"
      />
      <div v-else class="unsupported-preview">
        <p>当前文件类型暂不支持在线预览</p>
        <el-link :href="previewUrl" target="_blank" rel="noopener noreferrer" type="primary">
          在新窗口打开
        </el-link>
      </div>
    </template>
  </div>
</el-drawer>
```

Add the same preview styles already used by `FileManagementView.vue`: `.file-preview`, `.image-preview`, `.document-preview`, `.preview-error`, `.preview-error-actions`, and `.unsupported-preview`. Keep the preview URL only in component state and clear it when the drawer closes.

- [ ] **Step 5: Run the complete view test file and verify it passes**

Run:

```bash
npm test -- src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
```

Expected: all list, document, text content, file preview, inactive-file, pagination, and stale-response tests PASS.

- [ ] **Step 6: Commit file-document preview support**

```bash
git add src/views/system/KnowledgeBaseManagementView.vue src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
git commit -m "feat: preview files from admin knowledge documents"
```

---

### Task 5: Run verification and review the final scope

**Files:**
- No new production files; inspect all changes from Tasks 1–4.

- [ ] **Step 1: Run all frontend unit tests**

Run:

```bash
npm test
```

Expected: all Vitest suites PASS, including existing file management, route guard, and management view suites.

- [ ] **Step 2: Run TypeScript validation**

Run:

```bash
npm run type-check
```

Expected: `vue-tsc --build` exits successfully with no missing route component, nullable field, or template event errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: type-check and Vite production build both complete successfully.

- [ ] **Step 4: Check formatting and changed-file scope**

Run:

```bash
git diff --check
git status --short
git diff --stat master-261106...HEAD
```

Expected: no whitespace errors. The implementation diff contains only the knowledge API/types/tests, route/sidebar/tests, and knowledge-base view/tests, in addition to the already committed design and plan documents. No backend files, credentials, generated `dist` changes, or unrelated refactors are included.

- [ ] **Step 5: Manually verify the UI with the existing app**

Start the frontend with:

```bash
npm run dev
```

Sign in as an account with `knowledge:read`, then verify:

1. “知识库管理” appears under “系统管理”.
2. The knowledge-base list loads and displays user IDs.
3. “查看文档” opens the document drawer and pagination works.
4. A `TEXT` document opens its raw content drawer.
5. A PDF/image file document obtains a presigned URL and renders the matching preview.
6. An unsupported file type offers a new-window link.
7. An inactive file does not request a presigned URL.
8. An account without `knowledge:read` does not see the entry and is redirected from the route.

- [ ] **Step 6: Commit the verification-only fixes if needed**

Only if the previous verification steps reveal a real implementation issue, fix the smallest affected file, rerun the failed verification command, and create a new commit:

```bash
git status --short
git add src/views/system/KnowledgeBaseManagementView.vue src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts
git commit -m "fix: verify admin knowledge base view"
```

Do not amend prior commits and do not commit generated build output.
