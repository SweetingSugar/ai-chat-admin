# 管理员文件直接预览 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将文件管理页面的“查看”操作改为通过管理员预签名地址直接预览活动文件。

**Architecture:** 复用现有文件列表和删除流程，在前端新增管理员预签名 URL API 封装。`FileManagementView` 管理预览弹窗的文件、URL、加载、错误和请求序号状态，按 MIME 类型渲染图片、PDF、纯文本或不支持类型；后端已提供 `/api/admin/files/{fileId}/presigned-url`，本次不修改后端。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Element Plus, Axios API client, Vitest, Vue Test Utils, Node 20.20.2.

---

## 文件结构

- Modify: `src/types/file.ts` — 增加管理员预签名地址响应类型。
- Modify: `src/api/files.ts` — 增加管理员预签名地址 API wrapper，保留现有列表、详情和删除 wrapper。
- Modify: `src/api/__tests__/files.spec.ts` — 验证预签名 URL 请求路径。
- Modify: `src/views/system/FileManagementView.vue` — 用预览弹窗替换详情抽屉，并接入 `file:download` 权限。
- Modify: `src/views/system/__tests__/FileManagementView.spec.ts` — 验证预览权限、MIME 类型分支、失败重试和旧请求隔离。
- Create: none — 复用当前页面，不新增组件或后端文件。

## Task 1: Add the presigned URL API contract

**Files:**
- Modify: `src/types/file.ts`
- Modify: `src/api/files.ts`
- Test: `src/api/__tests__/files.spec.ts`

- [ ] **Step 1: Write the failing API test**

在 `src/api/__tests__/files.spec.ts` 的 import 中加入 `getAdminFilePresignedUrl`，并在 `file API wrappers` describe 中加入：

```ts
it('requests an admin presigned URL for preview', async () => {
  vi.spyOn(apiClient, 'get').mockResolvedValue({
    fileId: 9,
    url: 'https://download.example/file',
    expiresIn: 600,
  })

  await getAdminFilePresignedUrl(9)

  expect(apiClient.get).toHaveBeenCalledWith('admin/files/9/presigned-url')
})
```

- [ ] **Step 2: Run the focused API test and verify it fails**

Run:

```bash
npm run test -- src/api/__tests__/files.spec.ts
```

Expected: FAIL because `getAdminFilePresignedUrl` is not exported.

- [ ] **Step 3: Add the response type and API wrapper**

在 `src/types/file.ts` 的 `FileMetadata` 后增加：

```ts
export interface FileDownloadUrl {
  fileId: number
  url: string
  expiresIn: number
}
```

在 `src/api/files.ts` 中导入 `FileDownloadUrl`，并增加：

```ts
export function getAdminFilePresignedUrl(id: number): Promise<FileDownloadUrl> {
  return apiClient.get<FileDownloadUrl>(`admin/files/${id}/presigned-url`)
}
```

- [ ] **Step 4: Run the focused API test and verify it passes**

Run:

```bash
npm run test -- src/api/__tests__/files.spec.ts
```

Expected: PASS, including the existing list, detail, and delete wrapper tests.

## Task 2: Add preview state and MIME type helpers

**Files:**
- Modify: `src/views/system/FileManagementView.vue`
- Test: `src/views/system/__tests__/FileManagementView.spec.ts`

- [ ] **Step 1: Extend the test setup with preview permission and response data**

在页面测试的 `beforeEach` 中将权限集合改为包含 `file:download`，并 mock 预签名接口：

```ts
permissionState.values = new Set(['file:read', 'file:delete', 'file:download'])
vi.mocked(filesApi.getAdminFilePresignedUrl).mockResolvedValue({
  fileId: 9,
  url: 'https://download.example/report.pdf',
  expiresIn: 600,
})
```

在 `vi.mock('@/api/files', ...)` 工厂中加入 `getAdminFilePresignedUrl: vi.fn()`。

- [ ] **Step 2: Write the failing page tests for permission and preview modes**

将现有详情测试改为预览测试，并加入图片、PDF、Word/Docx 分支：

```ts
it('opens a PDF preview using the admin presigned URL', async () => {
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-preview-9"]').trigger('click')
  await flushPromises()

  expect(filesApi.getAdminFilePresignedUrl).toHaveBeenCalledWith(9)
  expect(wrapper.find('iframe').attributes('src')).toBe('https://download.example/report.pdf')
  expect(wrapper.text()).toContain('report.pdf')
})

it('renders images in an image preview', async () => {
  vi.mocked(filesApi.listFiles).mockResolvedValue({
    ...page,
    records: [{ ...file, contentType: 'image/jpeg', originalName: 'photo.jpg' }],
  })
  vi.mocked(filesApi.getAdminFilePresignedUrl).mockResolvedValue({
    fileId: 9,
    url: 'https://download.example/photo.jpg',
    expiresIn: 600,
  })
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-preview-9"]').trigger('click')
  await flushPromises()

  expect(wrapper.find('img').attributes('src')).toBe('https://download.example/photo.jpg')
})

it('shows an open link for unsupported document previews', async () => {
  vi.mocked(filesApi.listFiles).mockResolvedValue({
    ...page,
    records: [{ ...file, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
  })
  vi.mocked(filesApi.getAdminFilePresignedUrl).mockResolvedValue({
    fileId: 9,
    url: 'https://download.example/report.docx',
    expiresIn: 600,
  })
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-preview-9"]').trigger('click')
  await flushPromises()

  expect(wrapper.text()).toContain('暂不支持在线预览')
  expect(wrapper.find('a[href="https://download.example/report.docx"]').exists()).toBe(true)
})
```

- [ ] **Step 3: Run the focused page tests and verify they fail**

Run:

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

Expected: FAIL because the page still renders `file-detail-*`, has no `file:download` condition, and has no preview state.

- [ ] **Step 4: Replace detail state with preview state**

在 `FileManagementView.vue` 中：

1. 将 API 类型导入改为保留 `FileMetadata`, `FileQuery`, `FileStatus`，并移除当前只服务于详情抽屉的 `detailVisible`, `detailLoading`, `detailError`, `detail`, `detailId`, `detailRequestId` 状态和 `loadDetail`, `openDetail`, `retryDetail` 函数。
2. 将权限计算补充为：

```ts
const canPreview = computed(() => auth.hasPermission('file:download'))
```

3. 增加预览状态和请求序号：

```ts
const previewVisible = ref(false)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const previewFile = ref<FileMetadata | null>(null)
let previewRequestId = 0
```

4. 增加 MIME 类型判断和错误处理函数：

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
```

5. 增加打开、重试和清理逻辑：

```ts
async function openPreview(file: FileMetadata): Promise<void> {
  const requestId = ++previewRequestId
  previewFile.value = file
  previewUrl.value = null
  previewError.value = file.status === 'ACTIVE' ? null : '文件当前状态不可预览'
  previewVisible.value = true
  if (file.status !== 'ACTIVE') return

  previewLoading.value = true
  try {
    const result = await filesApi.getAdminFilePresignedUrl(file.id)
    if (requestId === previewRequestId) previewUrl.value = result.url
  } catch (reason) {
    if (requestId === previewRequestId) previewError.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false
  }
}

async function retryPreview(): Promise<void> {
  if (previewFile.value) await openPreview(previewFile.value)
}

function clearPreview(): void {
  previewRequestId += 1
  previewLoading.value = false
  previewError.value = null
  previewUrl.value = null
  previewFile.value = null
}
```

- [ ] **Step 5: Run the focused page tests to verify the API wiring still needs template changes**

Run:

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

Expected: The tests continue to fail only on the old template selectors and missing rendered preview nodes; the new state and API call should type-check once the template is updated.

## Task 3: Replace the detail drawer with a preview dialog

**Files:**
- Modify: `src/views/system/FileManagementView.vue`
- Test: `src/views/system/__tests__/FileManagementView.spec.ts`

- [ ] **Step 1: Update the action column and add the preview dialog**

将操作列中的详情按钮替换为：

```vue
<el-button
  v-if="canPreview"
  :data-test="`file-preview-${row.id}`"
  text
  type="primary"
  @click="openPreview(row)"
>
  查看
</el-button>
```

保留删除按钮及其 `file:delete` 条件不变。

删除当前 `el-drawer`，替换为：

```vue
<el-dialog
  v-model="previewVisible"
  :title="previewFile?.originalName ?? '文件预览'"
  width="min(960px, 90vw)"
  destroy-on-close
  @closed="clearPreview"
>
  <div v-loading="previewLoading" class="file-preview">
    <div v-if="previewError" class="preview-error" role="alert">
      {{ previewError }}
      <div class="preview-error-actions">
        <el-button text type="danger" size="small" @click="retryPreview">重试</el-button>
        <el-link
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          type="primary"
        >
          在新窗口打开
        </el-link>
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
        <el-link
          :href="previewUrl"
          target="_blank"
          rel="noopener noreferrer"
          type="primary"
        >
          在新窗口打开
        </el-link>
      </div>
    </template>
  </div>
</el-dialog>
```

- [ ] **Step 2: Add scoped preview styles**

在页面 `<style scoped>` 中增加：

```css
.file-preview { min-height: 360px; display: flex; align-items: center; justify-content: center; }
.image-preview { display: block; max-width: 100%; max-height: 68vh; object-fit: contain; }
.document-preview { width: 100%; height: 68vh; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.preview-error, .unsupported-preview { display: grid; gap: 12px; justify-items: center; color: var(--color-text-muted); text-align: center; }
.preview-error { color: var(--color-danger); }
.preview-error-actions { display: flex; align-items: center; gap: 12px; }
```

- [ ] **Step 3: Add the permission and failure tests**

在页面测试中加入：

```ts
it('hides preview actions without file-download permission', async () => {
  permissionState.values.delete('file:download')
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  expect(wrapper.find('[data-test="file-preview-9"]').exists()).toBe(false)
})

it('retries a failed preview request', async () => {
  vi.mocked(filesApi.getAdminFilePresignedUrl)
    .mockRejectedValueOnce(new Error('preview failed'))
    .mockResolvedValueOnce({ fileId: 9, url: 'https://download.example/report.pdf', expiresIn: 600 })
  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()

  await wrapper.find('[data-test="file-preview-9"]').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('请求失败，请稍后重试')

  await wrapper.get('.preview-error button').trigger('click')
  await flushPromises()
  expect(filesApi.getAdminFilePresignedUrl).toHaveBeenCalledTimes(2)
  expect(wrapper.find('iframe').exists()).toBe(true)
})
```

- [ ] **Step 4: Run the focused page tests and verify they pass**

Run:

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

Expected: PASS for existing list, filtering, pagination, deletion, list-error, preview permission, preview rendering, and retry tests.

## Task 4: Cover request isolation and complete regression verification

**Files:**
- Modify: `src/views/system/__tests__/FileManagementView.spec.ts`
- Modify: `src/views/system/FileManagementView.vue` only if the isolation test exposes a state update bug.

- [ ] **Step 1: Add a stale preview response test**

加入一个可控 Promise 测试，验证关闭第一个预览后，旧响应不会写入第二次打开的预览：

```ts
it('ignores a stale preview response after the dialog is reopened', async () => {
  let resolveFirst: (value: { fileId: number; url: string; expiresIn: number }) => void = () => undefined
  let resolveSecond: (value: { fileId: number; url: string; expiresIn: number }) => void = () => undefined
  vi.mocked(filesApi.getAdminFilePresignedUrl)
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

  const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
  await flushPromises()
  await wrapper.find('[data-test="file-preview-9"]').trigger('click')
  await flushPromises()

  await wrapper.findComponent({ name: 'ElDialog' }).vm.$emit('closed')
  await wrapper.find('[data-test="file-preview-9"]').trigger('click')
  await flushPromises()

  resolveFirst({ fileId: 9, url: 'https://download.example/old.pdf', expiresIn: 600 })
  await flushPromises()
  expect(wrapper.find('iframe').exists()).toBe(false)

  resolveSecond({ fileId: 9, url: 'https://download.example/new.pdf', expiresIn: 600 })
  await flushPromises()
  expect(wrapper.find('iframe').attributes('src')).toBe('https://download.example/new.pdf')
})
```

- [ ] **Step 2: Run the page test suite**

Run:

```bash
npm run test -- src/views/system/__tests__/FileManagementView.spec.ts
```

Expected: PASS with the stale response ignored.

- [ ] **Step 3: Run the complete test suite**

Run:

```bash
npm run test
```

Expected: PASS for all existing API, store, router, layout, component, and view tests.

- [ ] **Step 4: Run type checking**

Run:

```bash
npm run type-check
```

Expected: PASS with no TypeScript or Vue template diagnostics.

- [ ] **Step 5: Build the production bundle**

Run:

```bash
npm run build
```

Expected: PASS; Vite emits the production bundle after type checking.

- [ ] **Step 6: Verify the working tree contains only scoped changes**

Run:

```bash
git status --short
git diff -- src/types/file.ts src/api/files.ts src/api/__tests__/files.spec.ts src/views/system/FileManagementView.vue src/views/system/__tests__/FileManagementView.spec.ts
```

Expected: only the API type/wrapper, API test, file management view, and file management view test are modified, plus the two design/plan documents created during this workflow. Do not stage or commit changes unless the user explicitly requests it.
