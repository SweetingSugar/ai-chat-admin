<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as filesApi from '@/api/files'
import PageHeader from '@/components/management/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import type { FileMetadata, FileQuery, FileStatus } from '@/types/file'

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

const statusOptions: Array<{ label: string; value: FileStatus }> = [
  { label: '有效', value: 'ACTIVE' },
  { label: '删除中', value: 'DELETING' },
  { label: '删除失败', value: 'DELETE_FAILED' },
  { label: '已删除', value: 'DELETED' },
]

const canDelete = computed(() => auth.hasPermission('file:delete'))
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref<string | null>(null)
const detail = ref<FileMetadata | null>(null)
const detailId = ref<number | null>(null)
const deleteSubmittingId = ref<number | null>(null)
let detailRequestId = 0
let listRequestId = 0

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

async function deleteFile(file: FileMetadata): Promise<void> {
  if (deleteSubmittingId.value !== null) return
  deleteSubmittingId.value = file.id
  try {
    await ElMessageBox.confirm(
      `删除文件“${file.originalName}”后不可恢复，是否继续？`,
      '确认删除',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    deleteSubmittingId.value = null
    return
  }

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
  const requestId = ++listRequestId
  loading.value = true
  error.value = null
  try {
    const result = await filesApi.listFiles(buildQuery())
    if (requestId !== listRequestId) return
    files.value = result.records
    total.value = result.total
    page.value = result.current
    pageSize.value = result.size
  } catch (reason) {
    if (requestId === listRequestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (requestId === listRequestId) loading.value = false
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
  </section>
</template>

<style scoped>
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
</style>
