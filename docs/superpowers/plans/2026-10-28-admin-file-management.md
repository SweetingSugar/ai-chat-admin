# 管理员文件管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Vue 3 管理后台中增加与后端 `/api/admin/files` 契约一致的文件分页查询、详情查看和管理员删除功能。

**Architecture:** 使用独立的文件 API 模块、文件类型模块和 `FileManagementView` 页面，不抽取通用表格组件。页面通过 `file:read` 受路由和导航保护，通过 `file:delete` 控制删除按钮；列表筛选和分页全部交给后端，详情通过抽屉单独请求。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript、Vue Router、Pinia、Element Plus、Axios 封装的 `apiClient`、Vitest、Vue Test Utils、Node 20.20.2。

---

## 文件变更地图

- Create: `src/types/file.ts` — 文件状态、元数据、分页结果和查询参数类型。
- Create: `src/api/files.ts` — 文件列表、详情、删除 API 封装。
- Create: `src/api/__tests__/files.spec.ts` — 文件 API 请求路径和参数测试。
- Modify: `src/router/index.ts` — 注册 `/system/files`、读取权限和首个可访问页面排序。
- Modify: `src/router/__tests__/guards.spec.ts` — 文件管理路由权限测试。
- Modify: `src/components/layout/Sidebar.vue` — 系统管理分组增加文件管理入口。
- Modify: `src/components/layout/__tests__/Sidebar.spec.ts` — 导航数量和文件权限入口测试。
- Create: `src/views/system/FileManagementView.vue` — 文件筛选、分页表格、详情抽屉和删除交互。
- Create: `src/views/system/__tests__/FileManagementView.spec.ts` — 页面加载、筛选、分页、详情、删除和异常测试。

不新增通用表格组件、下载/预览组件或上传功能；本次改动只覆盖已确认的管理员查询、详情和删除范围。

### Task 1: 建立文件类型和 API 边界

**Files:**
- Create: `src/types/file.ts`
- Create: `src/api/files.ts`
- Test: `src/api/__tests__/files.spec.ts`

- [ ] **Step 1: 先写 API 失败测试**

创建 `src/api/__tests__/files.spec.ts`，用现有 `apiClient` spy 验证查询参数通过 Axios `params` 发送，详情使用路径参数，删除使用 DELETE：

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { deleteFile, getFile, listFiles } from '@/api/files'

const page = {
  records: [],
  total: 0,
  current: 1,
  size: 20,
  pages: 0,
}

afterEach(() => vi.restoreAllMocks())

describe('file API wrappers', () => {
  it('requests an admin file page with all supported filters', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listFiles({
      page: 2,
      size: 50,
      userId: 42,
      originalName: 'report.pdf',
      contentType: 'application/pdf',
      status: 'ACTIVE',
      createdFrom: '2026-10-01',
      createdTo: '2026-10-27',
    })

    expect(apiClient.get).toHaveBeenCalledWith('admin/files', {
      params: {
        page: 2,
        size: 50,
        userId: 42,
        originalName: 'report.pdf',
        contentType: 'application/pdf',
        status: 'ACTIVE',
        createdFrom: '2026-10-01',
        createdTo: '2026-10-27',
      },
    })
  })

  it('maps detail and delete operations to admin file endpoints', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ id: 9 })
    vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

    await getFile(9)
    await deleteFile(9)

    expect(apiClient.get).toHaveBeenCalledWith('admin/files/9')
    expect(apiClient.delete).toHaveBeenCalledWith('admin/files/9')
  })
})
```

- [ ] **Step 2: 运行 API 测试确认先失败**

运行：

```bash
npm run test -- src/api/__tests__/files.spec.ts
```

预期：FAIL，原因是 `@/api/files` 尚不存在。

- [ ] **Step 3: 添加文件领域类型**

创建 `src/types/file.ts`：

```ts
export type FileStatus = 'ACTIVE' | 'DELETING' | 'DELETE_FAILED' | 'DELETED'

export interface FileMetadata {
  id: number
  userId: number
  originalName: string
  contentType: string
  fileSize: number
  status: FileStatus
  createTime: string
  updateTime: string
}

export interface FilePage {
  records: FileMetadata[]
  total: number
  current: number
  size: number
  pages: number
}

export interface FileQuery {
  page: number
  size: number
  userId?: number
  originalName?: string
  contentType?: string
  status?: FileStatus
  createdFrom?: string
  createdTo?: string
}
```

- [ ] **Step 4: 添加 API 封装实现**

创建 `src/api/files.ts`：

```ts
import { apiClient } from '@/api/client'
import type { FileMetadata, FilePage, FileQuery } from '@/types/file'

export function listFiles(query: FileQuery): Promise<FilePage> {
  return apiClient.get<FilePage>('admin/files', { params: query })
}

export function getFile(id: number): Promise<FileMetadata> {
  return apiClient.get<FileMetadata>(`admin/files/${id}`)
}

export function deleteFile(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/files/${id}`)
}
```

- [ ] **Step 5: 运行 API 测试确认通过**

运行：

```bash
npm run test -- src/api/__tests__/files.spec.ts
```

预期：2 个测试 PASS，且查询参数名称与后端 `FileQueryRequest` 完全一致。

### Task 2: 接入路由和系统管理导航

**Files:**
- Modify: `src/router/index.ts`
- Test: `src/router/__tests__/guards.spec.ts`
- Modify: `src/components/layout/Sidebar.vue`
- Test: `src/components/layout/__tests__/Sidebar.spec.ts`

- [ ] **Step 1: 为文件路由权限写失败测试**

在 `src/router/__tests__/guards.spec.ts` 中增加以下测试，覆盖首个可访问路径和 `file:read` 路由访问：

```ts
it('chooses file management when file-read is the first available entry', () => {
  expect(getFirstAccessiblePath(['file:read'])).toBe('/system/files')
})

it('allows a user with only file-read permission to enter file management', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: ['file:read'] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/system/files')

  expect(router.currentRoute.value.fullPath).toBe('/system/files')
})
```

在 `src/components/layout/__tests__/Sidebar.spec.ts` 的路由数组和权限数组中先加入文件路由与权限，并将导航数量断言从 6 改为 7：

```ts
{ path: '/system/files', component: routeComponent },
```

```ts
'file:read',
```

```ts
expect(initialItems).toHaveLength(7)
expect(wrapper.findAll('.nav-item')).toHaveLength(7)
```

- [ ] **Step 2: 运行路由和导航测试确认先失败**

运行：

```bash
npm run test -- src/router/__tests__/guards.spec.ts src/components/layout/__tests__/Sidebar.spec.ts
```

预期：新增路由断言失败，且导航数量仍为 6。

- [ ] **Step 3: 注册文件路由并加入首个可访问入口**

在 `src/router/index.ts` 导入新页面：

```ts
import FileManagementView from '@/views/system/FileManagementView.vue'
```

在 `/` 的 children 中加入：

```ts
{
  path: 'system/files',
  component: FileManagementView,
  meta: { requiresAuth: true, permission: 'file:read', title: '文件管理' },
},
```

在 `accessibleEntries` 的系统管理条目后加入：

```ts
['/system/files', 'file:read'],
```

- [ ] **Step 4: 添加带权限过滤的侧边栏入口**

在 `src/components/layout/Sidebar.vue` 的“系统管理” items 数组中，权限管理之后加入：

```ts
{ label: '文件管理', path: '/system/files', permission: 'file:read' },
```

不要修改 `visibleGroups` 的过滤逻辑，让现有 `auth.hasPermission(item.permission)` 同时处理文件入口。

- [ ] **Step 5: 运行路由和导航测试确认通过**

运行：

```bash
npm run test -- src/router/__tests__/guards.spec.ts src/components/layout/__tests__/Sidebar.spec.ts
```

预期：路由和导航测试全部 PASS；没有 `file:read` 的账号不会看到文件管理入口。

### Task 3: 先为列表、筛选和分页建立页面测试

**Files:**
- Create: `src/views/system/__tests__/FileManagementView.spec.ts`

- [ ] **Step 1: 创建可控权限和 API mock**

在页面测试文件中使用 `vi.hoisted` 保存权限状态，避免权限测试依赖固定的 `hasPermission: () => true`：

```ts
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileManagementView from '@/views/system/FileManagementView.vue'
import * as filesApi from '@/api/files'

const permissionState = vi.hoisted(() => ({ values: new Set<string>() }))

vi.mock('@/api/files', () => ({
  listFiles: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => permissionState.values.has(permission),
  }),
}))

const file = {
  id: 9,
  userId: 42,
  originalName: 'report.pdf',
  contentType: 'application/pdf',
  fileSize: 2048,
  status: 'ACTIVE' as const,
  createTime: '2026-10-27T15:30:00',
  updateTime: '2026-10-27T15:30:00',
}

const page = {
  records: [file],
  total: 1,
  current: 1,
  size: 20,
  pages: 1,
}

beforeEach(() => {
  permissionState.values = new Set(['file:read', 'file:delete'])
  vi.mocked(filesApi.listFiles).mockResolvedValue(page)
  vi.mocked(filesApi.getFile).mockResolvedValue(file)
  vi.mocked(filesApi.deleteFile).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})
```

- [ ] **Step 2: 写列表、筛选、重置和分页测试**

在同一测试文件中加入：

```ts
describe('FileManagementView', () => {
  it('loads and renders the server page', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(filesApi.listFiles).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('report.pdf')
    expect(wrapper.text()).toContain('application/pdf')
    expect(wrapper.text()).toContain('2.00 KB')
  })

  it('sends all non-empty filters and resets to the first page', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="file-original-name"]').setValue('report.pdf')
    await wrapper.find('[data-test="file-user-id"]').setValue(42)
    await wrapper.find('[data-test="file-content-type"]').setValue('application/pdf')
    await wrapper.find('[data-test="file-status"]').vm.$emit('update:modelValue', 'ACTIVE')
    await wrapper.findComponent({ name: 'ElDatePicker' }).vm.$emit(
      'update:modelValue',
      ['2026-10-01', '2026-10-27'],
    )
    await wrapper.find('[data-test="file-query"]').trigger('click')
    await flushPromises()

    expect(filesApi.listFiles).toHaveBeenLastCalledWith({
      page: 1,
      size: 20,
      userId: 42,
      originalName: 'report.pdf',
      contentType: 'application/pdf',
      status: 'ACTIVE',
      createdFrom: '2026-10-01',
      createdTo: '2026-10-27',
    })

    await wrapper.find('[data-test="file-reset"]').trigger('click')
    await flushPromises()
    expect(filesApi.listFiles).toHaveBeenLastCalledWith({ page: 1, size: 20 })
  })

  it('requests the selected page and page size', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 2)
    await flushPromises()
    expect(filesApi.listFiles).toHaveBeenLastCalledWith({ page: 2, size: 20 })

    await wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('size-change', 50)
    await flushPromises()
    expect(filesApi.listFiles).toHaveBeenLastCalledWith({ page: 1, size: 50 })
  })
})
```

- [ ] **Step 3: 运行页面测试确认先失败**

运行：

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

预期：FAIL，原因是 `FileManagementView.vue` 尚不存在。

### Task 4: 实现文件列表页面和服务端筛选

**Files:**
- Create: `src/views/system/FileManagementView.vue`

- [ ] **Step 1: 实现筛选状态、查询参数和列表加载**

在 `FileManagementView.vue` 的 `<script setup lang="ts">` 中实现以下完整核心逻辑：

```ts
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as filesApi from '@/api/files'
import PageHeader from '@/components/management/PageHeader.vue'
import type { FileMetadata, FileQuery, FileStatus } from '@/types/file'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const files = ref<FileMetadata[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filters = reactive<{
  originalName: string
  userId?: number
  contentType: string
  status?: FileStatus
  createdRange: [string, string] | null
}>({
  originalName: '',
  userId: undefined,
  contentType: '',
  status: undefined,
  createdRange: null,
})

const canDelete = computed(() => auth.hasPermission('file:delete'))
const statusOptions: Array<{ label: string; value: FileStatus }> = [
  { label: '有效', value: 'ACTIVE' },
  { label: '删除中', value: 'DELETING' },
  { label: '删除失败', value: 'DELETE_FAILED' },
  { label: '已删除', value: 'DELETED' },
]

function buildQuery(): FileQuery {
  const query: FileQuery = { page: page.value, size: pageSize.value }
  const originalName = filters.originalName.trim()
  const contentType = filters.contentType.trim()

  if (filters.userId !== undefined) query.userId = filters.userId
  if (originalName) query.originalName = originalName
  if (contentType) query.contentType = contentType
  if (filters.status) query.status = filters.status
  if (filters.createdRange) {
    query.createdFrom = filters.createdRange[0]
    query.createdTo = filters.createdRange[1]
  }
  return query
}

async function loadFiles(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const result = await filesApi.listFiles(buildQuery())
    files.value = result.records
    total.value = result.total
    page.value = result.current
    pageSize.value = result.size
  } catch (reason) {
    error.value = getApiErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

async function queryFiles(): Promise<void> {
  page.value = 1
  await loadFiles()
}

async function resetFilters(): Promise<void> {
  Object.assign(filters, {
    originalName: '',
    userId: undefined,
    contentType: '',
    status: undefined,
    createdRange: null,
  })
  page.value = 1
  await loadFiles()
}

async function changePage(value: number): Promise<void> {
  page.value = value
  await loadFiles()
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value
  page.value = 1
  await loadFiles()
}

function formatFileSize(value: number): string {
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB']
  let size = value
  let unitIndex = -1
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(unitIndex === 0 ? 2 : 1)} ${units[unitIndex]}`
}

function formatDateTime(value: string): string {
  return value.replace('T', ' ')
}

function statusLabel(status: FileStatus): string {
  return statusOptions.find((option) => option.value === status)?.label ?? status
}

onMounted(() => {
  void loadFiles()
})
</script>
```

- [ ] **Step 2: 添加与现有页面一致的筛选栏、表格和分页模板**

在同一文件的 `<template>` 中加入以下结构，确保测试使用的 `data-test` 选择器稳定：

```vue
<template>
  <section class="management-page">
    <PageHeader title="文件管理" description="查询和维护平台用户上传的文件元数据">
      <template #actions>
        <el-button :loading="loading" @click="loadFiles">刷新</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input
          v-model="filters.originalName"
          data-test="file-original-name"
          clearable
          placeholder="搜索文件名"
        />
        <el-input-number
          v-model="filters.userId"
          data-test="file-user-id"
          :controls="false"
          :min="1"
          placeholder="用户 ID"
        />
        <el-input
          v-model="filters.contentType"
          data-test="file-content-type"
          clearable
          placeholder="文件类型"
        />
        <el-select v-model="filters.status" data-test="file-status" clearable placeholder="全部状态">
          <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-date-picker
          v-model="filters.createdRange"
          data-test="file-created-range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
        <el-button data-test="file-query" type="primary" @click="queryFiles">查询</el-button>
        <el-button data-test="file-reset" @click="resetFilters">重置</el-button>
      </div>

      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadFiles">重试</el-button>
      </div>

      <div class="table-scroll">
        <el-table v-loading="loading" :data="files" row-key="id" class="management-table">
          <el-table-column label="文件名" min-width="220">
            <template #default="{ row }">
              <el-tooltip :content="row.originalName" placement="top">
                <span class="file-name">{{ row.originalName }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="用户 ID" width="100" />
          <el-table-column prop="contentType" label="文件类型" min-width="180" />
          <el-table-column label="文件大小" width="120">
            <template #default="{ row }">{{ formatFileSize(row.fileSize) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }"><el-tag size="small">{{ statusLabel(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无文件数据</span></template>
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
  </section>
</template>
```

- [ ] **Step 3: 添加列表页面样式**

在 `FileManagementView.vue` 的 `<style scoped>` 中使用当前管理页面的尺寸和颜色变量：

```css
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.toolbar :deep(.el-input) { width: min(240px, 100%); }
.toolbar :deep(.el-input-number) { width: 130px; }
.toolbar :deep(.el-select) { width: 140px; }
.toolbar :deep(.el-date-editor) { width: 250px; }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 1080px; }
.file-name { display: block; max-width: 210px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.empty-state { color: var(--color-text-muted); }
```

- [ ] **Step 4: 运行列表页面测试确认通过**

运行：

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

预期：列表加载、完整筛选、重置和分页测试 PASS；列表请求只包含非空筛选参数。

### Task 5: 添加详情抽屉和管理员删除交互

**Files:**
- Modify: `src/views/system/FileManagementView.vue`
- Modify: `src/views/system/__tests__/FileManagementView.spec.ts`

- [ ] **Step 1: 先写详情、确认、权限和失败场景测试**

在页面测试文件中追加：

```ts
import { ElMessageBox } from 'element-plus'

it('loads the selected file detail into the drawer', async () => {
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-detail-9"]').trigger('click')
  await flushPromises()

  expect(filesApi.getFile).toHaveBeenCalledWith(9)
  expect(wrapper.text()).toContain('文件 ID')
  expect(wrapper.text()).toContain('report.pdf')
})

it('requires confirmation before deleting a file', async () => {
  vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-delete-9"]').trigger('click')
  await flushPromises()

  expect(ElMessageBox.confirm).toHaveBeenCalledWith(
    '删除文件“report.pdf”后不可恢复，是否继续？',
    '确认删除',
    expect.objectContaining({ type: 'warning' }),
  )
  expect(filesApi.deleteFile).toHaveBeenCalledWith(9)
})

it('does not delete when confirmation is cancelled', async () => {
  vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-delete-9"]').trigger('click')
  await flushPromises()

  expect(filesApi.deleteFile).not.toHaveBeenCalled()
})

it('hides delete actions without file-delete permission', async () => {
  permissionState.values.delete('file:delete')
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  expect(wrapper.find('[data-test="file-delete-9"]').exists()).toBe(false)
})

it('keeps the list when detail loading fails', async () => {
  vi.mocked(filesApi.getFile).mockRejectedValueOnce(new Error('detail failed'))
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-detail-9"]').trigger('click')
  await flushPromises()

  expect(wrapper.text()).toContain('report.pdf')
  expect(wrapper.text()).toContain('请求失败，请稍后重试')
})
```

- [ ] **Step 2: 运行新增测试确认先失败**

运行：

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

预期：详情、删除和权限测试失败，因为页面还没有详情状态、删除状态和对应函数。

- [ ] **Step 3: 添加详情状态和加载函数**

在页面脚本的列表状态之后加入：

```ts
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const detail = ref<FileMetadata | null>(null)
const detailId = ref<number | null>(null)
let detailRequestId = 0

async function loadDetail(id: number): Promise<void> {
  const requestId = ++detailRequestId
  detailId.value = id
  detailLoading.value = true
  detailError.value = null
  detail.value = null
  try {
    detail.value = await filesApi.getFile(id)
  } catch (reason) {
    if (requestId === detailRequestId) detailError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false
  }
}

async function openDetail(file: FileMetadata): Promise<void> {
  detailVisible.value = true
  await loadDetail(file.id)
}

async function retryDetail(): Promise<void> {
  if (detailId.value !== null) await loadDetail(detailId.value)
}
```

- [ ] **Step 4: 添加删除确认、提交状态和刷新逻辑**

在页面脚本中加入：

```ts
const deleteSubmittingId = ref<number | null>(null)

async function deleteFile(file: FileMetadata): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `删除文件“${file.originalName}”后不可恢复，是否继续？`,
      '确认删除',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  deleteSubmittingId.value = file.id
  try {
    await filesApi.deleteFile(file.id)
    ElMessage.success('文件已删除')
    await loadFiles()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    deleteSubmittingId.value = null
  }
}
```

- [ ] **Step 5: 把操作列和详情抽屉接入模板**

在列表表格的更新时间列之后加入操作列，并在管理面板之后加入详情抽屉：

```vue
<el-table-column label="操作" fixed="right" width="170">
  <template #default="{ row }">
    <el-button :data-test="`file-detail-${row.id}`" text type="primary" @click="openDetail(row)">查看</el-button>
    <el-button
      v-if="canDelete"
      :data-test="`file-delete-${row.id}`"
      text
      type="danger"
      :loading="deleteSubmittingId === row.id"
      :disabled="deleteSubmittingId !== null"
      @click="deleteFile(row)"
    >
      删除
    </el-button>
  </template>
</el-table-column>

<el-drawer v-model="detailVisible" title="文件详情" size="460px" :append-to-body="false">
  <div v-loading="detailLoading">
    <div v-if="detailError" class="inline-error" role="alert">
      {{ detailError }}
      <el-button text type="danger" size="small" @click="retryDetail">重试</el-button>
    </div>
    <el-descriptions v-else-if="detail" :column="1" border>
      <el-descriptions-item label="文件 ID">{{ detail.id }}</el-descriptions-item>
      <el-descriptions-item label="原始名称">{{ detail.originalName }}</el-descriptions-item>
      <el-descriptions-item label="所属用户">{{ detail.userId }}</el-descriptions-item>
      <el-descriptions-item label="内容类型">{{ detail.contentType }}</el-descriptions-item>
      <el-descriptions-item label="文件大小">{{ formatFileSize(detail.fileSize) }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ statusLabel(detail.status) }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updateTime) }}</el-descriptions-item>
    </el-descriptions>
  </div>
</el-drawer>
```

- [ ] **Step 6: 运行页面测试确认通过**

运行：

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

预期：所有页面测试 PASS；取消删除不发请求；删除成功后重新加载列表；无 `file:delete` 权限时不渲染删除按钮。

### Task 6: 完成全量验证和差异检查

**Files:**
- Verify: all files from Tasks 1–5

- [ ] **Step 1: 运行新增相关测试**

运行：

```bash
npm run test -- src/api/__tests__/files.spec.ts src/views/system/__tests__/FileManagementView.spec.ts src/router/__tests__/guards.spec.ts src/components/layout/__tests__/Sidebar.spec.ts
```

预期：新增文件 API、页面、路由和导航测试全部 PASS。

- [ ] **Step 2: 使用 Node 20.20.2 运行完整测试**

确认版本：

```bash
node --version
```

预期：`v20.20.2`。

然后运行：

```bash
npm run test
```

预期：项目现有测试和新增测试全部 PASS。

- [ ] **Step 3: 运行类型检查**

运行：

```bash
npm run type-check
```

预期：`vue-tsc --build` 成功退出，没有模板、路由或 API 类型错误。

- [ ] **Step 4: 运行生产构建**

运行：

```bash
npm run build
```

预期：类型检查和 Vite 生产构建均成功完成。

- [ ] **Step 5: 检查最终差异范围**

运行：

```bash
git status --short
git diff --stat
git diff --check
```

预期：只有文件管理功能相关的源码和测试发生变化，没有生成凭据、环境文件或无关重构。

## 计划自检

- 设计文档中的查询、详情、删除三个接口分别由 Task 1 覆盖。
- `file:read` 的路由与导航保护由 Task 2 覆盖，`file:delete` 的按钮权限由 Task 5 覆盖。
- 完整筛选、服务端分页、日期格式、空值省略和重置行为由 Task 3–4 覆盖。
- 详情抽屉、删除二次确认、删除后重新加载、错误保留列表由 Task 5 覆盖。
- Node 20.20.2、测试、类型检查和生产构建由 Task 6 覆盖。
- 类型名称在各任务中保持一致：`FileStatus`、`FileMetadata`、`FilePage`、`FileQuery`、`listFiles`、`getFile`、`deleteFile`。
- 计划不包含占位步骤、额外下载/预览/上传功能或通用组件重构。
