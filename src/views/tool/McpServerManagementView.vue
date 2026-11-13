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
  McpServerManagementView,
  McpServerUpsertPayload,
  ToolAuthType,
  ToolDiscoveryStatus,
} from '@/types/tools'

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

const auth = useAuthStore()
const servers = ref<McpServerManagementView[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const formVisible = ref(false)
const formId = ref<number | null>(null)
const formSession = ref(0)
const formSubmitting = ref(false)
const discoveringId = ref<number | null>(null)

const form = reactive<McpServerForm>({
  serverCode: '',
  serverName: '',
  endpointUrl: '',
  authType: 'NONE',
  authHeaderName: '',
  credential: '',
  secretHeaders: '',
  connectTimeout: 10,
  readTimeout: 60,
  status: true,
})

let requestId = 0

const canCreate = computed(() => auth.hasPermission('tool:mcp-server:create'))
const canUpdate = computed(() => auth.hasPermission('tool:mcp-server:update'))
const canDelete = computed(() => auth.hasPermission('tool:mcp-server:delete'))
const canDiscover = computed(() => auth.hasPermission('tool:mcp-server:discover'))

const authTypeLabels: Record<ToolAuthType, string> = {
  NONE: '无认证',
  BEARER: 'Bearer',
  API_KEY: 'API Key',
}
const discoveryStatusLabels: Record<ToolDiscoveryStatus, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
}

function getAuthTypeLabel(value: ToolAuthType): string {
  return authTypeLabels[value]
}

function getDiscoveryStatusLabel(value: ToolDiscoveryStatus): string {
  return discoveryStatusLabels[value]
}

function createEmptyForm(): McpServerForm {
  return {
    serverCode: '',
    serverName: '',
    endpointUrl: '',
    authType: 'NONE',
    authHeaderName: '',
    credential: '',
    secretHeaders: '',
    connectTimeout: 10,
    readTimeout: 60,
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

function parseSecretHeaders(value: string): Record<string, string> | undefined {
  if (!value.trim()) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Secret Headers JSON 格式不正确')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Secret Headers JSON 格式不正确')
  }
  if (Object.values(parsed).some((item) => typeof item !== 'string')) {
    throw new Error('Secret Headers JSON 必须是字符串键值')
  }
  return parsed as Record<string, string>
}

function buildPayload(): McpServerUpsertPayload {
  const secretHeaders = parseSecretHeaders(form.secretHeaders)
  const payload: McpServerUpsertPayload = {
    serverCode: form.serverCode.trim(),
    serverName: form.serverName.trim(),
    endpointUrl: form.endpointUrl.trim(),
    authType: form.authType,
    connectTimeout: form.connectTimeout,
    readTimeout: form.readTimeout,
    status: (form.status ? 1 : 0) as BinaryStatus,
  }
  if (form.authType === 'API_KEY' && form.authHeaderName.trim()) {
    payload.authHeaderName = form.authHeaderName.trim()
  }
  if (form.credential.trim()) payload.credential = form.credential.trim()
  if (secretHeaders) payload.secretHeaders = secretHeaders
  return payload
}

async function loadServers(): Promise<void> {
  const currentRequestId = ++requestId
  loading.value = true
  error.value = null
  try {
    const result = await toolsApi.listMcpServers()
    if (currentRequestId === requestId) servers.value = result
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

function openEdit(server: McpServerManagementView): void {
  formSession.value += 1
  formId.value = server.id
  Object.assign(form, {
    serverCode: server.serverCode,
    serverName: server.serverName,
    endpointUrl: server.endpointUrl,
    authType: server.authType,
    authHeaderName: '',
    credential: '',
    secretHeaders: '',
    connectTimeout: server.connectTimeout,
    readTimeout: server.readTimeout,
    status: server.status === 1,
  })
  formVisible.value = true
}

function closeForm(): void {
  formSession.value += 1
  formVisible.value = false
}

async function submitServer(): Promise<void> {
  const submittedId = formId.value
  const submittedSession = formSession.value
  formSubmitting.value = true
  try {
    const payload = buildPayload()
    if (submittedId === null) {
      await toolsApi.createMcpServer(payload)
      ElMessage.success('MCP Server 已创建')
    } else {
      await toolsApi.updateMcpServer(submittedId, payload)
      ElMessage.success('MCP Server 已更新')
    }
    if (formSession.value === submittedSession) formVisible.value = false
    await loadServers()
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

async function toggleServerStatus(server: McpServerManagementView, enabled: boolean): Promise<void> {
  try {
    await toolsApi.updateMcpServerStatus(server.id, (enabled ? 1 : 0) as BinaryStatus)
    ElMessage.success(enabled ? 'MCP Server 已启用' : 'MCP Server 已停用')
    await loadServers()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

async function deleteServer(server: McpServerManagementView): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后不可恢复，且存在关联工具时无法删除，是否继续？', '确认删除', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await toolsApi.deleteMcpServer(server.id)
    ElMessage.success('MCP Server 已删除')
    await loadServers()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

async function discoverServer(server: McpServerManagementView): Promise<void> {
  discoveringId.value = server.id
  try {
    const result = await toolsApi.discoverMcpServer(server.id)
    ElMessage.success(`发现 ${result.discovered}，新增 ${result.created}，更新 ${result.updated}，过期 ${result.stale}`)
    await loadServers()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    if (discoveringId.value === server.id) discoveringId.value = null
  }
}

onMounted(() => {
  void loadServers()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="MCP Server" description="配置 MCP Server 连接并发现远端工具">
      <template #actions>
        <el-button :loading="loading" @click="loadServers">刷新</el-button>
        <el-button v-if="canCreate" data-test="mcp-server-create" type="primary" @click="openCreate">新建 MCP Server</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadServers">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="servers" row-key="id" class="management-table">
          <el-table-column label="Server" min-width="190">
            <template #default="{ row }">
              <strong>{{ row.serverName }}</strong>
              <small>{{ row.serverCode }}</small>
            </template>
          </el-table-column>
          <el-table-column prop="endpointUrl" label="Endpoint" min-width="270" show-overflow-tooltip />
          <el-table-column label="认证" width="100">
            <template #default="{ row }">{{ getAuthTypeLabel(row.authType) }}</template>
          </el-table-column>
          <el-table-column label="凭证" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="row.hasCredential ? 'success' : 'info'">{{ row.hasCredential ? '已配置' : '未配置' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近发现" min-width="190">
            <template #default="{ row }">
              <el-tag v-if="row.lastDiscoveryStatus" size="small" :type="row.lastDiscoveryStatus === 'SUCCESS' ? 'success' : 'danger'">
                {{ getDiscoveryStatusLabel(row.lastDiscoveryStatus) }}
              </el-tag>
              <span class="muted-text">{{ formatDateTime(row.lastDiscoveryTime) }}</span>
              <small v-if="row.lastDiscoveryError" class="error-text">{{ row.lastDiscoveryError }}</small>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }"><StatusTag :status="row.status" /></template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" fixed="right" width="300">
            <template #default="{ row }">
              <el-switch
                v-if="canUpdate"
                :data-test="`mcp-server-status-${row.id}`"
                :model-value="row.status === 1"
                @change="toggleServerStatus(row, $event === true)"
              />
              <el-button v-if="canUpdate" :data-test="`mcp-server-edit-${row.id}`" text type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button
                v-if="canDiscover"
                :data-test="`mcp-server-discover-${row.id}`"
                text
                type="primary"
                :loading="discoveringId === row.id"
                @click="discoverServer(row)"
              >发现工具</el-button>
              <el-button v-if="canDelete" :data-test="`mcp-server-delete-${row.id}`" text type="danger" @click="deleteServer(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无 MCP Server 数据</span></template>
        </el-table>
      </div>
    </article>

    <el-drawer
      v-model="formVisible"
      :title="formId === null ? '新建 MCP Server' : '编辑 MCP Server'"
      size="560px"
      :append-to-body="false"
      @close="closeForm"
    >
      <el-form :model="form" label-width="108px" @submit.prevent="submitServer">
        <el-form-item label="Server 编码"><el-input v-model="form.serverCode" data-test="mcp-server-code" maxlength="100" /></el-form-item>
        <el-form-item label="Server 名称"><el-input v-model="form.serverName" data-test="mcp-server-name" maxlength="100" /></el-form-item>
        <el-form-item label="Endpoint URL"><el-input v-model="form.endpointUrl" data-test="mcp-server-endpoint" maxlength="500" /></el-form-item>
        <el-form-item label="认证类型">
          <el-select v-model="form.authType" data-test="mcp-server-auth-type" style="width: 100%">
            <el-option label="无认证" value="NONE" />
            <el-option label="Bearer" value="BEARER" />
            <el-option label="API Key" value="API_KEY" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.authType === 'API_KEY'" label="认证 Header"><el-input v-model="form.authHeaderName" data-test="mcp-server-auth-header" maxlength="100" /></el-form-item>
        <el-form-item v-if="form.authType !== 'NONE'" label="认证凭证"><el-input v-model="form.credential" data-test="mcp-server-credential" type="password" show-password autocomplete="new-password" /></el-form-item>
        <el-form-item label="Secret Headers"><el-input v-model="form.secretHeaders" data-test="mcp-server-secret-headers" type="textarea" :rows="3" placeholder='{"X-Tenant":"demo"}' /></el-form-item>
        <el-form-item label="连接超时"><el-input-number v-model="form.connectTimeout" data-test="mcp-server-connect-timeout" :min="1" :max="600" controls-position="right" /></el-form-item>
        <el-form-item label="读取超时"><el-input-number v-model="form.readTimeout" data-test="mcp-server-read-timeout" :min="1" :max="600" controls-position="right" /></el-form-item>
        <p class="field-hint">超时单位为秒，范围为 1–600；编辑时留空认证凭证将保留原凭证。</p>
        <el-form-item label="状态"><el-switch v-model="form.status" /></el-form-item>
        <div class="drawer-footer">
          <el-button @click="closeForm">取消</el-button>
          <el-button data-test="mcp-server-submit" type="primary" :loading="formSubmitting" @click="submitServer">保存</el-button>
        </div>
      </el-form>
    </el-drawer>
  </section>
</template>

<style scoped>
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 1260px; }
.management-table small { display: block; color: var(--color-text-muted); font-size: 11px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.muted-text { display: block; margin-top: 4px; color: var(--color-text-muted); font-size: 11px; }
.error-text { color: var(--color-danger); overflow-wrap: anywhere; }
.empty-state { color: var(--color-text-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.field-hint { margin: -6px 0 14px 108px; color: var(--color-text-muted); font-size: 11px; }
</style>
