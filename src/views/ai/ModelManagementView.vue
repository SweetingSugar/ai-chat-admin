<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as aiApi from '@/api/ai-config'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import { useAuthStore } from '@/stores/auth'
import type { BinaryStatus } from '@/types/management'
import type { ModelPayload, ModelRecord, ProviderRecord } from '@/types/ai-config'

interface ModelForm {
  providerId: number
  modelCode: string
  modelName: string
  modelType: string
  contextWindow: number
  maxOutputTokens: number
  temperature?: number
  topP?: number
  supportStream: boolean
  isDefault: boolean
  status: boolean
  sort: number
  remark: string
}

const auth = useAuthStore()
const models = ref<ModelRecord[]>([])
const providers = ref<ProviderRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const providerFilter = ref<'all' | number>('all')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const defaultFilter = ref<'all' | 'default' | 'regular'>('all')
const formVisible = ref(false)
const formId = ref<number | null>(null)
const formSession = ref(0)
const formSubmitting = ref(false)
const form = reactive<ModelForm>({
  providerId: 0,
  modelCode: '',
  modelName: '',
  modelType: 'CHAT',
  contextWindow: 8192,
  maxOutputTokens: 1024,
  temperature: 0.7,
  topP: 0.9,
  supportStream: true,
  isDefault: false,
  status: true,
  sort: 0,
  remark: '',
})

const canCreate = computed(() => auth.hasPermission('ai:model:create'))
const canUpdate = computed(() => auth.hasPermission('ai:model:update'))
const canDelete = computed(() => auth.hasPermission('ai:model:delete'))

const filteredModels = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return models.value.filter((model) => {
    const matchesQuery = !query
      || model.modelCode.toLocaleLowerCase().includes(query)
      || model.modelName.toLocaleLowerCase().includes(query)
      || model.providerName.toLocaleLowerCase().includes(query)
    const matchesProvider = providerFilter.value === 'all' || model.providerId === providerFilter.value
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'enabled' && model.status === 1)
      || (statusFilter.value === 'disabled' && model.status === 0)
    const matchesDefault = defaultFilter.value === 'all'
      || (defaultFilter.value === 'default' && model.defaultModel)
      || (defaultFilter.value === 'regular' && !model.defaultModel)
    return matchesQuery && matchesProvider && matchesStatus && matchesDefault
  })
})

function providerLabel(provider: ProviderRecord): string {
  return provider.status === 1 ? provider.providerName : `${provider.providerName}（已停用）`
}

function toModelPayload(value: ModelForm): ModelPayload {
  return {
    providerId: value.providerId,
    modelCode: value.modelCode.trim(),
    modelName: value.modelName.trim(),
    modelType: value.modelType.trim(),
    contextWindow: value.contextWindow,
    maxOutputTokens: value.maxOutputTokens,
    temperature: value.temperature,
    topP: value.topP,
    supportStream: (value.supportStream ? 1 : 0) as BinaryStatus,
    isDefault: (value.isDefault ? 1 : 0) as BinaryStatus,
    status: (value.status ? 1 : 0) as BinaryStatus,
    sort: value.sort,
    remark: value.remark.trim(),
  }
}

async function loadModels(): Promise<void> {
  loading.value = true
  error.value = null
  const [modelResult, providerResult] = await Promise.allSettled([
    aiApi.listModels(),
    aiApi.listProviders(),
  ])
  try {
    if (modelResult.status === 'rejected') {
      throw modelResult.reason
    }
    models.value = modelResult.value
    if (providerResult.status === 'fulfilled') {
      providers.value = providerResult.value
      if (form.providerId === 0 && providerResult.value[0]) form.providerId = providerResult.value[0].id
    }
  } catch (reason) {
    error.value = getApiErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  Object.assign(form, {
    providerId: providers.value[0]?.id ?? 0,
    modelCode: '',
    modelName: '',
    modelType: 'CHAT',
    contextWindow: 8192,
    maxOutputTokens: 1024,
    temperature: 0.7,
    topP: 0.9,
    supportStream: true,
    isDefault: false,
    status: true,
    sort: 0,
    remark: '',
  })
  formId.value = null
}

function openCreate(): void {
  formSession.value += 1
  resetForm()
  formVisible.value = true
}

function openEdit(model: ModelRecord): void {
  formSession.value += 1
  formId.value = model.id
  Object.assign(form, {
    providerId: model.providerId,
    modelCode: model.modelCode,
    modelName: model.modelName,
    modelType: model.modelType,
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens,
    temperature: model.temperature ?? undefined,
    topP: model.topP ?? undefined,
    supportStream: model.supportStream,
    isDefault: model.defaultModel,
    status: model.status === 1,
    sort: model.sort,
    remark: model.remark ?? '',
  })
  formVisible.value = true
}

async function submitModel(): Promise<void> {
  const submittedId = formId.value
  const submittedSession = formSession.value
  const selectedProvider = providers.value.find((provider) => provider.id === form.providerId)
  if (form.status && selectedProvider?.status !== 1) {
    ElMessage.warning('启用模型需要绑定启用的供应商')
  }
  formSubmitting.value = true
  const payload = toModelPayload(form)
  try {
    if (submittedId === null) await aiApi.createModel(payload)
    else await aiApi.updateModel(submittedId, payload)
    ElMessage.success(submittedId === null ? '模型已创建' : '模型已更新')
    if (formSession.value === submittedSession) formVisible.value = false
    await loadModels()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    if (formSession.value === submittedSession) formSubmitting.value = false
  }
}

function closeForm(): void {
  formSession.value += 1
  formVisible.value = false
}

async function deleteModel(model: ModelRecord): Promise<void> {
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
    await aiApi.deleteModel(model.id)
    ElMessage.success('模型已删除')
    await loadModels()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

onMounted(() => {
  void loadModels()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="模型管理" description="维护供应商模型参数、默认模型与流式能力">
      <template #actions>
        <el-button :loading="loading" @click="loadModels">刷新</el-button>
        <el-button v-if="canCreate" data-test="model-create" type="primary" @click="openCreate">新建模型</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索模型名称、编码或供应商" />
        <el-select v-model="providerFilter" aria-label="模型供应商筛选" style="width: 150px">
          <el-option label="全部供应商" value="all" />
          <el-option v-for="provider in providers" :key="provider.id" :label="providerLabel(provider)" :value="provider.id" />
        </el-select>
        <el-select v-model="statusFilter" aria-label="模型状态筛选" style="width: 130px">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-select v-model="defaultFilter" aria-label="默认模型筛选" style="width: 130px">
          <el-option label="全部模型" value="all" />
          <el-option label="默认模型" value="default" />
          <el-option label="普通模型" value="regular" />
        </el-select>
      </div>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadModels">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="filteredModels" row-key="id" class="management-table">
          <el-table-column label="模型" min-width="210"><template #default="{ row }"><strong>{{ row.modelName }}</strong><small>{{ row.modelCode }}</small></template></el-table-column>
          <el-table-column prop="providerName" label="供应商" min-width="130" />
          <el-table-column prop="modelType" label="类型" width="100" />
          <el-table-column prop="contextWindow" label="上下文" width="110" />
          <el-table-column prop="maxOutputTokens" label="最大输出" width="110" />
          <el-table-column label="参数" width="145"><template #default="{ row }">T {{ row.temperature ?? '—' }} / P {{ row.topP ?? '—' }}</template></el-table-column>
          <el-table-column label="能力" width="150"><template #default="{ row }"><el-tag v-if="row.supportStream" size="small" type="success">流式</el-tag><el-tag v-if="row.defaultModel" size="small" type="warning">默认</el-tag></template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><StatusTag :status="row.status" /></template></el-table-column>
          <el-table-column label="操作" fixed="right" width="180">
            <template #default="{ row }">
              <el-button v-if="canUpdate" :data-test="`model-edit-${row.id}`" text type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button v-if="canDelete" :data-test="`model-delete-${row.id}`" text type="danger" @click="deleteModel(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无模型数据</span></template>
        </el-table>
      </div>
    </article>

    <el-drawer v-model="formVisible" :title="formId === null ? '新建模型' : '编辑模型'" size="540px" :append-to-body="false">
      <el-form :model="form" label-width="102px" @submit.prevent="submitModel">
        <el-form-item label="供应商">
          <el-select v-model="form.providerId" data-test="model-provider" style="width: 100%">
            <el-option v-for="provider in providers" :key="provider.id" :label="providerLabel(provider)" :value="provider.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="模型编码"><el-input v-model="form.modelCode" data-test="model-code" maxlength="100" /></el-form-item>
        <el-form-item label="模型名称"><el-input v-model="form.modelName" data-test="model-name" maxlength="100" /></el-form-item>
        <el-form-item label="模型类型"><el-input v-model="form.modelType" data-test="model-type" maxlength="32" /></el-form-item>
        <el-form-item label="上下文窗口"><el-input-number v-model="form.contextWindow" :min="1" /></el-form-item>
        <el-form-item label="最大输出 Token"><el-input-number v-model="form.maxOutputTokens" :min="1" /></el-form-item>
        <el-form-item label="Temperature"><el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" :precision="2" /></el-form-item>
        <el-form-item label="Top P"><el-input-number v-model="form.topP" :min="0" :max="1" :step="0.1" :precision="2" /></el-form-item>
        <el-form-item label="支持流式"><el-switch v-model="form.supportStream" /></el-form-item>
        <el-form-item label="设为默认"><el-switch v-model="form.isDefault" /><span class="field-hint">设为默认会清除其他模型的默认标记。</span></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" maxlength="500" /></el-form-item>
        <div class="drawer-footer">
          <el-button @click="closeForm">取消</el-button>
          <el-button data-test="model-submit" type="primary" :loading="formSubmitting" @click="submitModel">保存</el-button>
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
.management-table { min-width: 1200px; }
.management-table small { display: block; color: var(--color-text-muted); font-size: 11px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.field-hint { margin-left: 8px; color: var(--color-text-muted); font-size: 11px; }
.empty-state { color: var(--color-text-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
</style>
