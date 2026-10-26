<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as aiApi from '@/api/ai-config'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import { useAuthStore } from '@/stores/auth'
import type { BinaryStatus } from '@/types/management'
import type { ProviderPayload, ProviderRecord, ProviderType } from '@/types/ai-config'

interface ProviderForm {
  providerCode: string
  providerName: string
  providerType: ProviderType
  baseUrl: string
  apiKey: string
  connectTimeout: number
  readTimeout: number
  status: boolean
  sort: number
  remark: string
}

const auth = useAuthStore()
const providers = ref<ProviderRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const typeFilter = ref<'all' | ProviderType>('all')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const formVisible = ref(false)
const formId = ref<number | null>(null)
const formSubmitting = ref(false)
const form = reactive<ProviderForm>({
  providerCode: '',
  providerName: '',
  providerType: 'DEEPSEEK',
  baseUrl: '',
  apiKey: '',
  connectTimeout: 10,
  readTimeout: 60,
  status: true,
  sort: 0,
  remark: '',
})

const canCreate = computed(() => auth.hasPermission('ai:provider:create'))
const canUpdate = computed(() => auth.hasPermission('ai:provider:update'))
const canDelete = computed(() => auth.hasPermission('ai:provider:delete'))

const filteredProviders = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return providers.value.filter((provider) => {
    const matchesQuery = !query
      || provider.providerCode.toLocaleLowerCase().includes(query)
      || provider.providerName.toLocaleLowerCase().includes(query)
    const matchesType = typeFilter.value === 'all' || provider.providerType === typeFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'enabled' && provider.status === 1)
      || (statusFilter.value === 'disabled' && provider.status === 0)
    return matchesQuery && matchesType && matchesStatus
  })
})

async function loadProviders(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    providers.value = await aiApi.listProviders()
  } catch (reason) {
    error.value = getApiErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  Object.assign(form, {
    providerCode: '',
    providerName: '',
    providerType: 'DEEPSEEK',
    baseUrl: '',
    apiKey: '',
    connectTimeout: 10,
    readTimeout: 60,
    status: true,
    sort: 0,
    remark: '',
  })
  formId.value = null
}

function openCreate(): void {
  resetForm()
  formVisible.value = true
}

function openEdit(provider: ProviderRecord): void {
  formId.value = provider.id
  Object.assign(form, {
    providerCode: provider.providerCode,
    providerName: provider.providerName,
    providerType: provider.providerType,
    baseUrl: provider.baseUrl,
    apiKey: '',
    connectTimeout: provider.connectTimeout ?? 10,
    readTimeout: provider.readTimeout ?? 60,
    status: provider.status === 1,
    sort: provider.sort,
    remark: provider.remark ?? '',
  })
  formVisible.value = true
}

async function submitProvider(): Promise<void> {
  if (formId.value === null && !form.apiKey.trim()) {
    ElMessage.warning('新增供应商时必须填写 API Key')
    return
  }
  formSubmitting.value = true
  const payload: ProviderPayload = {
    providerCode: form.providerCode.trim(),
    providerName: form.providerName.trim(),
    providerType: form.providerType,
    baseUrl: form.baseUrl.trim(),
    connectTimeout: form.connectTimeout,
    readTimeout: form.readTimeout,
    status: (form.status ? 1 : 0) as BinaryStatus,
    sort: form.sort,
    remark: form.remark.trim(),
  }
  if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()
  try {
    if (formId.value === null) await aiApi.createProvider({ ...payload, apiKey: form.apiKey.trim() })
    else await aiApi.updateProvider(formId.value, payload)
    ElMessage.success(formId.value === null ? '供应商已创建' : '供应商已更新')
    formVisible.value = false
    await loadProviders()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    formSubmitting.value = false
  }
}

async function deleteProvider(provider: ProviderRecord): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后不可恢复，且供应商必须没有关联模型，是否继续？', '确认删除', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await aiApi.deleteProvider(provider.id)
    ElMessage.success('供应商已删除')
    await loadProviders()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

onMounted(() => {
  void loadProviders()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="供应商管理" description="配置 AI 服务供应商与访问凭证">
      <template #actions>
        <el-button :loading="loading" @click="loadProviders">刷新</el-button>
        <el-button v-if="canCreate" data-test="provider-create" type="primary" @click="openCreate">新建供应商</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索供应商名称或编码" />
        <el-select v-model="typeFilter" aria-label="供应商类型筛选" style="width: 135px">
          <el-option label="全部类型" value="all" />
          <el-option label="OpenAI" value="OPENAI" />
          <el-option label="DeepSeek" value="DEEPSEEK" />
          <el-option label="通义千问" value="QWEN" />
        </el-select>
        <el-select v-model="statusFilter" aria-label="供应商状态筛选" style="width: 130px">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </div>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadProviders">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="filteredProviders" row-key="id" class="management-table">
          <el-table-column prop="providerName" label="供应商" min-width="150" />
          <el-table-column prop="providerCode" label="编码" min-width="130" />
          <el-table-column prop="providerType" label="类型" width="110" />
          <el-table-column prop="baseUrl" label="Base URL" min-width="250" show-overflow-tooltip />
          <el-table-column label="API Key" width="110"><template #default="{ row }"><el-tag size="small" :type="row.hasApiKey ? 'success' : 'info'">{{ row.hasApiKey ? '已配置' : '未配置' }}</el-tag></template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><StatusTag :status="row.status" /></template></el-table-column>
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="操作" fixed="right" width="170">
            <template #default="{ row }">
              <el-button v-if="canUpdate" :data-test="`provider-edit-${row.id}`" text type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button v-if="canDelete" :data-test="`provider-delete-${row.id}`" text type="danger" @click="deleteProvider(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无供应商数据</span></template>
        </el-table>
      </div>
    </article>

    <el-drawer v-model="formVisible" :title="formId === null ? '新建供应商' : '编辑供应商'" size="520px" :append-to-body="false">
      <el-form :model="form" label-width="94px" @submit.prevent="submitProvider">
        <el-form-item label="供应商编码"><el-input v-model="form.providerCode" data-test="provider-code" maxlength="50" /></el-form-item>
        <el-form-item label="供应商名称"><el-input v-model="form.providerName" data-test="provider-name" maxlength="100" /></el-form-item>
        <el-form-item label="供应商类型">
          <el-select v-model="form.providerType" data-test="provider-type" style="width: 100%">
            <el-option label="OpenAI" value="OPENAI" />
            <el-option label="DeepSeek" value="DEEPSEEK" />
            <el-option label="通义千问" value="QWEN" />
          </el-select>
        </el-form-item>
        <el-form-item label="Base URL"><el-input v-model="form.baseUrl" data-test="provider-base-url" maxlength="500" /></el-form-item>
        <el-form-item label="API Key"><el-input v-model="form.apiKey" data-test="provider-api-key" type="password" show-password autocomplete="new-password" /></el-form-item>
        <p class="field-hint">编辑时留空将保留当前 API Key，页面不会显示已有密钥。</p>
        <el-form-item label="连接超时"><el-input-number v-model="form.connectTimeout" :min="1" :max="120" /></el-form-item>
        <el-form-item label="读取超时"><el-input-number v-model="form.readTimeout" :min="1" :max="600" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" maxlength="500" /></el-form-item>
        <div class="drawer-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button data-test="provider-submit" type="primary" :loading="formSubmitting" @click="submitProvider">保存</el-button>
        </div>
      </el-form>
    </el-drawer>
  </section>
</template>

<style scoped>
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.toolbar :deep(.el-input) { width: min(360px, 100%); }
.table-scroll { overflow-x: auto; }
.management-table { min-width: 1000px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.field-hint { margin: -6px 0 14px 94px; color: var(--color-text-muted); font-size: 11px; }
.empty-state { color: var(--color-text-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
</style>
