<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getApiErrorMessage } from '@/api/client'
import * as toolsApi from '@/api/tools'
import PageHeader from '@/components/management/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import type {
  ToolInvocationQuery,
  ToolInvocationStatus,
  ToolInvocationView,
  ToolManagementView,
} from '@/types/tools'

const auth = useAuthStore()
const logs = ref<ToolInvocationView[]>([])
const tools = ref<ToolManagementView[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const toolFilter = ref<number | undefined>(undefined)
const statusFilter = ref<'all' | ToolInvocationStatus>('all')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const toolOptionsError = ref<string | null>(null)

let requestId = 0

const canReadTools = computed(() => auth.hasPermission('tool:read'))
const statusLabels: Record<ToolInvocationStatus, string> = {
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
}

function getStatusLabel(value: ToolInvocationStatus): string {
  return statusLabels[value]
}

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

function buildQuery(): ToolInvocationQuery {
  const query: ToolInvocationQuery = {
    page: page.value,
    size: pageSize.value,
  }
  if (toolFilter.value !== undefined) query.toolId = toolFilter.value
  if (statusFilter.value !== 'all') query.status = statusFilter.value
  return query
}

async function loadLogs(): Promise<void> {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await toolsApi.listToolInvocationLogs(buildQuery())
    if (currentRequestId !== requestId) return
    logs.value = result.records
    total.value = result.total
    page.value = result.current
    pageSize.value = result.size
  } catch (reason) {
    if (currentRequestId === requestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

async function loadTools(): Promise<void> {
  toolOptionsError.value = null
  try {
    tools.value = await toolsApi.listTools()
  } catch (reason) {
    toolOptionsError.value = getApiErrorMessage(reason)
  }
}

function refresh(): void {
  void loadLogs()
  if (canReadTools.value) void loadTools()
}

function changeFilter(): void {
  page.value = 1
  void loadLogs()
}

function changePage(value: number): void {
  page.value = value
  void loadLogs()
}

function changePageSize(value: number): void {
  page.value = 1
  pageSize.value = value
  void loadLogs()
}

onMounted(() => {
  void loadLogs()
  if (canReadTools.value) void loadTools()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="调用日志" description="查询工具执行状态与基础审计信息">
      <template #actions>
        <el-button :loading="loading" @click="refresh">刷新</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <template v-if="canReadTools">
          <el-select v-model="toolFilter" clearable aria-label="调用日志工具筛选" placeholder="全部工具" style="width: 220px" @change="changeFilter">
            <el-option v-for="tool in tools" :key="tool.id" :label="`${tool.toolName}（${tool.toolCode}）`" :value="tool.id" />
          </el-select>
          <span v-if="toolOptionsError" class="filter-error">工具筛选加载失败</span>
        </template>
        <el-input-number
          v-else
          v-model="toolFilter"
          data-test="logs-tool-id"
          :min="1"
          :controls="false"
          placeholder="工具 ID"
          @change="changeFilter"
        />
        <el-select v-model="statusFilter" aria-label="调用日志状态筛选" style="width: 140px" @change="changeFilter">
          <el-option label="全部状态" value="all" />
          <el-option label="运行中" value="RUNNING" />
          <el-option label="成功" value="SUCCESS" />
          <el-option label="失败" value="FAILED" />
        </el-select>
      </div>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button data-test="logs-retry" text type="danger" size="small" @click="loadLogs">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="logs" row-key="id" class="management-table">
          <el-table-column prop="requestId" label="请求 ID" min-width="190" show-overflow-tooltip />
          <el-table-column label="工具" min-width="180">
            <template #default="{ row }">
              <strong>{{ row.toolCode }}</strong>
              <small>{{ row.toolType }} · ID {{ row.toolId ?? '—' }}</small>
            </template>
          </el-table-column>
          <el-table-column prop="userId" label="用户 ID" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 'SUCCESS' ? 'success' : row.status === 'FAILED' ? 'danger' : 'warning'">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="耗时" width="100">
            <template #default="{ row }">{{ row.durationMs === null ? '—' : `${row.durationMs} ms` }}</template>
          </el-table-column>
          <el-table-column label="开始时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.startTime) }}</template>
          </el-table-column>
          <el-table-column label="结束时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.endTime) }}</template>
          </el-table-column>
          <el-table-column prop="errorCode" label="错误码" min-width="150" show-overflow-tooltip />
          <el-table-column prop="errorMessage" label="错误信息" min-width="220" show-overflow-tooltip />
          <template #empty><span class="empty-state">暂无调用日志</span></template>
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

<style scoped>
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 1260px; }
.management-table small { display: block; color: var(--color-text-muted); font-size: 11px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.filter-error { color: var(--color-danger); font-size: 12px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 16px; }
.empty-state { color: var(--color-text-muted); }
</style>
