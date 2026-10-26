<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as permissionsApi from '@/api/permissions'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import { useAuthStore } from '@/stores/auth'
import type { BinaryStatus } from '@/types/management'
import type { PermissionPayload, PermissionRecord } from '@/types/system'

interface PermissionForm {
  parentId: number
  permissionName: string
  permissionCode: string
  permissionType: number
  path: string
  component: string
  icon: string
  sort: number
  status: boolean
}

const auth = useAuthStore()
const permissions = ref<PermissionRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const typeFilter = ref<'all' | number>('all')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const formVisible = ref(false)
const formId = ref<number | null>(null)
const formSubmitting = ref(false)
const form = reactive<PermissionForm>({
  parentId: 0,
  permissionName: '',
  permissionCode: '',
  permissionType: 3,
  path: '',
  component: '',
  icon: '',
  sort: 0,
  status: true,
})

const canCreate = computed(() => auth.hasPermission('system:permission:create'))
const canUpdate = computed(() => auth.hasPermission('system:permission:update'))
const canDelete = computed(() => auth.hasPermission('system:permission:delete'))

const filteredPermissions = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return [...permissions.value]
    .filter((permission) => {
      const matchesQuery = !query
        || permission.permissionName.toLocaleLowerCase().includes(query)
        || permission.permissionCode?.toLocaleLowerCase().includes(query)
      const matchesType = typeFilter.value === 'all' || permission.permissionType === typeFilter.value
      const matchesStatus = statusFilter.value === 'all'
        || (statusFilter.value === 'enabled' && permission.status === 1)
        || (statusFilter.value === 'disabled' && permission.status === 0)
      return Boolean(matchesQuery) && matchesType && matchesStatus
    })
    .sort((left, right) => left.parentId - right.parentId || left.sort - right.sort || left.id - right.id)
})

function typeLabel(type: number): string {
  return ({ 1: '目录', 2: '菜单', 3: '按钮' } as Record<number, string>)[type] ?? `类型 ${type}`
}

function parentLabel(permission: PermissionRecord): string {
  if (permission.parentId === 0) return '根权限'
  return permissions.value.find((item) => item.id === permission.parentId)?.permissionName ?? '未分类'
}

async function loadPermissions(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    permissions.value = await permissionsApi.listPermissions()
  } catch (reason) {
    error.value = getApiErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  Object.assign(form, {
    parentId: 0,
    permissionName: '',
    permissionCode: '',
    permissionType: 3,
    path: '',
    component: '',
    icon: '',
    sort: 0,
    status: true,
  })
  formId.value = null
}

function openCreate(): void {
  resetForm()
  formVisible.value = true
}

function openEdit(permission: PermissionRecord): void {
  formId.value = permission.id
  Object.assign(form, {
    parentId: permission.parentId,
    permissionName: permission.permissionName,
    permissionCode: permission.permissionCode ?? '',
    permissionType: permission.permissionType,
    path: permission.path ?? '',
    component: permission.component ?? '',
    icon: permission.icon ?? '',
    sort: permission.sort,
    status: permission.status === 1,
  })
  formVisible.value = true
}

async function submitPermission(): Promise<void> {
  formSubmitting.value = true
  const payload: PermissionPayload = {
    parentId: form.parentId,
    permissionName: form.permissionName.trim(),
    permissionCode: form.permissionCode.trim(),
    permissionType: form.permissionType,
    path: form.path.trim(),
    component: form.component.trim(),
    icon: form.icon.trim(),
    sort: form.sort,
    status: (form.status ? 1 : 0) as BinaryStatus,
  }
  try {
    if (formId.value === null) await permissionsApi.createPermission(payload)
    else await permissionsApi.updatePermission(formId.value, payload)
    ElMessage.success(formId.value === null ? '权限已创建' : '权限已更新')
    formVisible.value = false
    await loadPermissions()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    formSubmitting.value = false
  }
}

async function deletePermission(permission: PermissionRecord): Promise<void> {
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
    await permissionsApi.deletePermission(permission.id)
    ElMessage.success('权限已删除')
    await loadPermissions()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

onMounted(() => {
  void loadPermissions()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="权限管理" description="按模块维护菜单、按钮与接口权限">
      <template #actions>
        <el-button :loading="loading" @click="loadPermissions">刷新</el-button>
        <el-button v-if="canCreate" data-test="permission-create" type="primary" @click="openCreate">新建权限</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索权限名称或编码" />
        <el-select v-model="typeFilter" aria-label="权限类型筛选" style="width: 130px">
          <el-option label="全部类型" value="all" />
          <el-option label="目录" :value="1" />
          <el-option label="菜单" :value="2" />
          <el-option label="按钮" :value="3" />
        </el-select>
        <el-select v-model="statusFilter" aria-label="权限状态筛选" style="width: 130px">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </div>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadPermissions">重试</el-button>
      </div>
      <div class="table-scroll">
        <el-table v-loading="loading" :data="filteredPermissions" row-key="id" class="management-table">
          <el-table-column label="权限名称" min-width="150"><template #default="{ row }">{{ row.permissionName }}</template></el-table-column>
          <el-table-column label="权限编码" min-width="220"><template #default="{ row }">{{ row.permissionCode || '—' }}</template></el-table-column>
          <el-table-column label="所属模块" min-width="130"><template #default="{ row }">{{ parentLabel(row) }}</template></el-table-column>
          <el-table-column label="类型" width="90"><template #default="{ row }"><el-tag size="small">{{ typeLabel(row.permissionType) }}</el-tag></template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><StatusTag :status="row.status" /></template></el-table-column>
          <el-table-column prop="sort" label="排序" width="80" />
          <el-table-column label="操作" fixed="right" width="180">
            <template #default="{ row }">
              <el-button v-if="canUpdate" :data-test="`permission-edit-${row.id}`" text type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button v-if="canDelete" :data-test="`permission-delete-${row.id}`" text type="danger" @click="deletePermission(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty><span class="empty-state">暂无权限数据</span></template>
        </el-table>
      </div>
    </article>

    <el-drawer v-model="formVisible" :title="formId === null ? '新建权限' : '编辑权限'" size="500px" :append-to-body="false">
      <el-form :model="form" label-width="82px" @submit.prevent="submitPermission">
        <el-form-item label="父级模块">
          <el-select v-model="form.parentId" style="width: 100%">
            <el-option label="根权限" :value="0" />
            <el-option v-for="item in permissions.filter((item) => item.id !== formId)" :key="item.id" :label="item.permissionName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限名称"><el-input v-model="form.permissionName" data-test="permission-name" maxlength="100" /></el-form-item>
        <el-form-item label="权限编码"><el-input v-model="form.permissionCode" maxlength="100" /></el-form-item>
        <el-form-item label="权限类型">
          <el-select v-model="form.permissionType" style="width: 100%">
            <el-option label="目录" :value="1" />
            <el-option label="菜单" :value="2" />
            <el-option label="按钮" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="路径"><el-input v-model="form.path" maxlength="255" /></el-form-item>
        <el-form-item label="组件"><el-input v-model="form.component" maxlength="255" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" maxlength="100" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" /></el-form-item>
        <div class="drawer-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button data-test="permission-submit" type="primary" :loading="formSubmitting" @click="submitPermission">保存</el-button>
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
.management-table { min-width: 900px; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.empty-state { color: var(--color-text-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
</style>
