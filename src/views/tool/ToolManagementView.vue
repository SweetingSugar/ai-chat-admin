<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as toolsApi from '@/api/tools'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import { useAuthStore } from '@/stores/auth'
import type { BinaryStatus } from '@/types/management'
import type {
  ToolAuthType,
  ToolAvailability,
  ToolHttpMethod,
  ToolManagementView,
  ToolSource,
  ToolType,
  ToolUpsertPayload,
} from '@/types/tools'

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

const auth = useAuthStore()
const tools = ref<ToolManagementView[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const typeFilter = ref<'all' | ToolType>('all')
const sourceFilter = ref<'all' | ToolSource>('all')
const availabilityFilter = ref<'all' | ToolAvailability>('all')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const formVisible = ref(false)
const formId = ref<number | null>(null)
const formSession = ref(0)
const formSubmitting = ref(false)
const detailVisible = ref(false)
const selectedTool = ref<ToolManagementView | null>(null)

const form = reactive<ToolForm>({
  toolCode: '',
  toolName: '',
  description: '',
  url: '',
  method: 'GET',
  headers: '',
  queryParams: '',
  bodyTemplate: '',
  authType: 'NONE',
  authHeaderName: '',
  credential: '',
  secretHeaders: '',
  status: true,
})

let requestId = 0

const canCreate = computed(() => auth.hasPermission('tool:create'))
const canUpdate = computed(() => auth.hasPermission('tool:update'))
const canDelete = computed(() => auth.hasPermission('tool:delete'))

const toolTypeLabels: Record<ToolType, string> = {
  HTTP: 'HTTP',
  MCP: 'MCP',
}
const sourceLabels: Record<ToolSource, string> = {
  MANUAL: '手工',
  DISCOVERED: '发现',
}
const availabilityLabels: Record<ToolAvailability, string> = {
  AVAILABLE: '可用',
  STALE: '已过期',
}
const authTypeLabels: Record<ToolAuthType, string> = {
  NONE: '无认证',
  BEARER: 'Bearer',
  API_KEY: 'API Key',
}

function getToolTypeLabel(value: ToolType): string {
  return toolTypeLabels[value]
}

function getSourceLabel(value: ToolSource): string {
  return sourceLabels[value]
}

function getAvailabilityLabel(value: ToolAvailability): string {
  return availabilityLabels[value]
}

function getAuthTypeLabel(value: ToolAuthType): string {
  return authTypeLabels[value]
}

const filteredTools = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return tools.value.filter((tool) => {
    const searchable = [tool.toolCode, tool.toolName, tool.remoteToolName ?? '']
      .join(' ')
      .toLocaleLowerCase()
    const matchesKeyword = !query || searchable.includes(query)
    const matchesType = typeFilter.value === 'all' || tool.toolType === typeFilter.value
    const matchesSource = sourceFilter.value === 'all' || tool.source === sourceFilter.value
    const matchesAvailability = availabilityFilter.value === 'all'
      || tool.availability === availabilityFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'enabled' && tool.status === 1)
      || (statusFilter.value === 'disabled' && tool.status === 0)
    return matchesKeyword && matchesType && matchesSource && matchesAvailability && matchesStatus
  })
})

const selectedSchema = computed(() => {
  if (selectedTool.value?.inputSchema === null || selectedTool.value?.inputSchema === undefined) {
    return '暂无输入 Schema'
  }
  return JSON.stringify(selectedTool.value.inputSchema, null, 2)
})

function createEmptyForm(): ToolForm {
  return {
    toolCode: '',
    toolName: '',
    description: '',
    url: '',
    method: 'GET',
    headers: '',
    queryParams: '',
    bodyTemplate: '',
    authType: 'NONE',
    authHeaderName: '',
    credential: '',
    secretHeaders: '',
    status: true,
  }
}

function resetForm(): void {
  Object.assign(form, createEmptyForm())
  formId.value = null
}

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

function formatJson(value: unknown): string {
  return value === null || value === undefined ? '' : JSON.stringify(value, null, 2)
}

function parseJsonObjectField(value: string, label: string): Record<string, string> | undefined {
  if (!value.trim()) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(`${label} JSON 格式不正确`)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} JSON 格式不正确`)
  }
  if (Object.values(parsed).some((item) => typeof item !== 'string')) {
    throw new Error(`${label} JSON 必须是字符串键值`)
  }
  return parsed as Record<string, string>
}

function parseJsonValueField(value: string, label: string): unknown {
  if (!value.trim()) return undefined
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${label} JSON 格式不正确`)
  }
}

function buildPayload(): ToolUpsertPayload {
  const headers = parseJsonObjectField(form.headers, 'Headers')
  const queryParams = parseJsonObjectField(form.queryParams, 'Query 参数')
  const bodyTemplate = parseJsonValueField(form.bodyTemplate, 'Body 模板')
  const secretHeaders = parseJsonObjectField(form.secretHeaders, 'Secret Headers')
  const payload: ToolUpsertPayload = {
    toolCode: form.toolCode.trim(),
    toolName: form.toolName.trim(),
    description: form.description.trim(),
    toolType: 'HTTP',
    httpConfig: {
      url: form.url.trim(),
      method: form.method,
      ...(headers ? { headers } : {}),
      ...(queryParams ? { queryParams } : {}),
      ...(bodyTemplate !== undefined ? { bodyTemplate } : {}),
    },
    authType: form.authType,
    status: (form.status ? 1 : 0) as BinaryStatus,
  }
  if (form.authType === 'API_KEY' && form.authHeaderName.trim()) {
    payload.authHeaderName = form.authHeaderName.trim()
  }
  if (form.credential.trim()) payload.credential = form.credential.trim()
  if (secretHeaders) payload.secretHeaders = secretHeaders
  return payload
}

async function loadTools(): Promise<void> {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await toolsApi.listTools()
    if (currentRequestId === requestId) tools.value = result
  } catch (reason) {
    if (currentRequestId === requestId) error.value = getApiErrorMessage(reason)
  } finally {
    if (currentRequestId === requestId) loading.value = false
  }
}

function openCreate(): void {
  formSession.value += 1
  resetForm()
  formVisible.value = true
}

function openEdit(tool: ToolManagementView): void {
  if (tool.toolType !== 'HTTP' || tool.source !== 'MANUAL' || !tool.httpConfig) return
  formSession.value += 1
  formId.value = tool.id
  Object.assign(form, {
    toolCode: tool.toolCode,
    toolName: tool.toolName,
    description: tool.description ?? '',
    url: tool.httpConfig.url,
    method: tool.httpConfig.method,
    headers: formatJson(tool.httpConfig.headers),
    queryParams: formatJson(tool.httpConfig.queryParams),
    bodyTemplate: formatJson(tool.httpConfig.bodyTemplate),
    authType: tool.authType,
    authHeaderName: tool.authHeaderName ?? '',
    credential: '',
    secretHeaders: '',
    status: tool.status === 1,
  })
  formVisible.value = true
}

function closeForm(): void {
  formSession.value += 1
  formVisible.value = false
}

async function submitTool(): Promise<void> {
  const submittedId = formId.value
  const submittedSession = formSession.value
  formSubmitting.value = true
  try {
    const payload = buildPayload()
    if (submittedId === null) {
      await toolsApi.createTool(payload)
      ElMessage.success('工具已创建')
    } else {
      await toolsApi.updateTool(submittedId, payload)
      ElMessage.success('工具已更新')
    }
    if (formSession.value === submittedSession) formVisible.value = false
    await loadTools()
  } catch (reason) {
    if (reason instanceof Error && reason.message.includes('JSON')) {
      ElMessage.warning(reason.message)
    } else {
      ElMessage.error(getApiErrorMessage(reason))
    }
  } finally {
    if (formSession.value === submittedSession) formSubmitting.value = false
  }
}

async function toggleToolStatus(tool: ToolManagementView, enabled: boolean): Promise<void> {
  try {
    await toolsApi.updateToolStatus(tool.id, (enabled ? 1 : 0) as BinaryStatus)
    ElMessage.success(enabled ? '工具已启用' : '工具已停用')
    await loadTools()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

async function deleteTool(tool: ToolManagementView): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后不可恢复，是否继续？', '确认删除', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await toolsApi.deleteTool(tool.id)
    ElMessage.success('工具已删除')
    await loadTools()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

function openDetail(tool: ToolManagementView): void {
  selectedTool.value = tool
  detailVisible.value = true
}

function clearDetail(): void {
  detailVisible.value = false
  selectedTool.value = null
}

onMounted(() => {
  void loadTools()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="工具管理" description="配置 HTTP 工具与管理 MCP 发现工具">
      <template #actions>
        <el-button :loading="loading" @click="loadTools">刷新</el-button>
        <el-button v-if="canCreate" data-test="tool-create" type="primary" @click="openCreate">新建 HTTP 工具</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索工具名称或编码" />
        <el-select v-model="typeFilter" aria-label="工具类型筛选" style="width: 125px">
          <el-option label="全部类型" value="all" />
          <el-option label="HTTP" value="HTTP" />
          <el-option label="MCP" value="MCP" />
        </el-select>
        <el-select v-model="sourceFilter" aria-label="工具来源筛选" style="width: 125px">
          <el-option label="全部来源" value="all" />
          <el-option label="手工" value="MANUAL" />
          <el-option label="发现" value="DISCOVERED" />
        </el-select>
        <el-select v-model="availabilityFilter" aria-label="工具可用性筛选" style="width: 130px">
          <el-option label="全部可用性" value="all" />
          <el-option label="可用" value="AVAILABLE" />
          <el-option label="已过期" value="STALE" />
        </el-select>
        <el-select v-model="statusFilter" aria-label="工具状态筛选" style="width: 125px">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </div>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadTools">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="filteredTools" row-key="id" class="management-table">
          <el-table-column label="工具" min-width="190">
            <template #default="{ row }">
              <strong>{{ row.toolName }}</strong>
              <small>{{ row.toolCode }}</small>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="90">
            <template #default="{ row }"><el-tag size="small">{{ getToolTypeLabel(row.toolType) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="来源" width="90">
            <template #default="{ row }">{{ getSourceLabel(row.source) }}</template>
          </el-table-column>
          <el-table-column label="远端工具" min-width="150">
            <template #default="{ row }">{{ row.remoteToolName || '—' }}</template>
          </el-table-column>
          <el-table-column label="认证" width="100">
            <template #default="{ row }">{{ getAuthTypeLabel(row.authType) }}</template>
          </el-table-column>
          <el-table-column label="凭证" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.hasCredential ? 'success' : 'info'">{{ row.hasCredential ? '已配置' : '未配置' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="可用性" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.availability === 'AVAILABLE' ? 'success' : 'warning'">{{ getAvailabilityLabel(row.availability) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="220">
            <template #default="{ row }">
              <el-switch
                v-if="canUpdate"
                :data-test="`tool-status-${row.id}`"
                :model-value="row.status === 1"
                @change="toggleToolStatus(row, $event === true)"
              />
              <el-button
                v-if="row.toolType === 'MCP'"
                :data-test="`tool-detail-${row.id}`"
                text
                type="primary"
                @click="openDetail(row)"
              >详情</el-button>
              <el-button
                v-if="canUpdate && row.toolType === 'HTTP' && row.source === 'MANUAL'"
                :data-test="`tool-edit-${row.id}`"
                text
                type="primary"
                @click="openEdit(row)"
              >编辑</el-button>
              <el-button
                v-if="canDelete && row.toolType === 'HTTP' && row.source === 'MANUAL'"
                :data-test="`tool-delete-${row.id}`"
                text
                type="danger"
                @click="deleteTool(row)"
              >删除</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无工具数据</span></template>
        </el-table>
      </div>
    </article>

    <el-drawer
      v-model="detailVisible"
      :title="selectedTool?.toolName ?? '工具详情'"
      size="620px"
      :append-to-body="false"
      @close="clearDetail"
    >
      <div v-if="selectedTool" class="detail-panel">
        <dl class="detail-list">
          <div><dt>工具编码</dt><dd>{{ selectedTool.toolCode }}</dd></div>
          <div><dt>远端工具名</dt><dd>{{ selectedTool.remoteToolName || '—' }}</dd></div>
          <div><dt>描述</dt><dd>{{ selectedTool.description || '—' }}</dd></div>
          <div><dt>MCP Server ID</dt><dd>{{ selectedTool.mcpServerId ?? '—' }}</dd></div>
        </dl>
        <h3>Input Schema</h3>
        <pre class="json-content">{{ selectedSchema }}</pre>
      </div>
    </el-drawer>

    <el-drawer
      v-model="formVisible"
      :title="formId === null ? '新建 HTTP 工具' : '编辑 HTTP 工具'"
      size="580px"
      :append-to-body="false"
      @close="closeForm"
    >
      <el-form :model="form" label-width="106px" @submit.prevent="submitTool">
        <el-form-item label="工具编码"><el-input v-model="form.toolCode" data-test="tool-code" maxlength="100" /></el-form-item>
        <el-form-item label="工具名称"><el-input v-model="form.toolName" data-test="tool-name" maxlength="100" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" maxlength="1000" /></el-form-item>
        <el-form-item label="URL"><el-input v-model="form.url" data-test="tool-url" maxlength="500" /></el-form-item>
        <el-form-item label="HTTP 方法">
          <el-select v-model="form.method" data-test="tool-method" style="width: 100%">
            <el-option v-for="method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']" :key="method" :label="method" :value="method" />
          </el-select>
        </el-form-item>
        <el-form-item label="Headers"><el-input v-model="form.headers" data-test="tool-headers" type="textarea" :rows="3" placeholder='{"Accept":"application/json"}' /></el-form-item>
        <el-form-item label="Query 参数"><el-input v-model="form.queryParams" data-test="tool-query-params" type="textarea" :rows="3" placeholder='{"city":"{{city}}"}' /></el-form-item>
        <el-form-item label="Body 模板"><el-input v-model="form.bodyTemplate" data-test="tool-body-template" type="textarea" :rows="5" placeholder='{"city":"{{city}}"}' /></el-form-item>
        <el-form-item label="认证类型">
          <el-select v-model="form.authType" data-test="tool-auth-type" style="width: 100%">
            <el-option label="无认证" value="NONE" />
            <el-option label="Bearer" value="BEARER" />
            <el-option label="API Key" value="API_KEY" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.authType === 'API_KEY'" label="认证 Header"><el-input v-model="form.authHeaderName" data-test="tool-auth-header" maxlength="100" /></el-form-item>
        <el-form-item v-if="form.authType !== 'NONE'" label="认证凭证"><el-input v-model="form.credential" data-test="tool-credential" type="password" show-password autocomplete="new-password" /></el-form-item>
        <el-form-item label="Secret Headers"><el-input v-model="form.secretHeaders" data-test="tool-secret-headers" type="textarea" :rows="3" placeholder='{"X-Tenant":"demo"}' /></el-form-item>
        <p class="field-hint">JSON 字段需要是对象；编辑时留空认证凭证将保留原凭证。</p>
        <el-form-item label="状态"><el-switch v-model="form.status" /></el-form-item>
        <div class="drawer-footer">
          <el-button @click="closeForm">取消</el-button>
          <el-button data-test="tool-submit" type="primary" :loading="formSubmitting" @click="submitTool">保存</el-button>
        </div>
      </el-form>
    </el-drawer>
  </section>
</template>

<style scoped>
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.toolbar :deep(.el-input) { width: min(300px, 100%); }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 1320px; }
.management-table small { display: block; color: var(--color-text-muted); font-size: 11px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.empty-state { color: var(--color-text-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.field-hint { margin: -6px 0 14px 106px; color: var(--color-text-muted); font-size: 11px; }
.detail-panel { display: grid; gap: 18px; }
.detail-list { display: grid; gap: 10px; margin: 0; }
.detail-list div { display: grid; grid-template-columns: 110px 1fr; gap: 12px; }
.detail-list dt { color: var(--color-text-muted); }
.detail-list dd { margin: 0; overflow-wrap: anywhere; }
.detail-panel h3 { margin: 0; font-size: 14px; }
.json-content { max-height: 60vh; margin: 0; padding: 14px; overflow: auto; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-background); white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
