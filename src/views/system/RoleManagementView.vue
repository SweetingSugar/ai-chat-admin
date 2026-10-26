<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as permissionsApi from '@/api/permissions'
import * as rolesApi from '@/api/roles'
import AssignmentDrawer from '@/components/management/AssignmentDrawer.vue'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import { useAuthStore } from '@/stores/auth'
import type { AssignmentGroup } from '@/types/management'
import type { PermissionRecord, RolePayload, RoleRecord } from '@/types/system'

interface RoleForm {
  roleName: string
  roleCode: string
  description: string
  sort: number
  status: boolean
}

const auth = useAuthStore()
const roles = ref<RoleRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const formVisible = ref(false)
const formId = ref<number | null>(null)
const formSubmitting = ref(false)
const form = reactive<RoleForm>({ roleName: '', roleCode: '', description: '', sort: 0, status: true })
const permissions = ref<PermissionRecord[]>([])
const assignmentVisible = ref(false)
const assignmentLoading = ref(false)
const assignmentRoleId = ref<number | null>(null)
const assignmentGroups = ref<AssignmentGroup[]>([])
const assignmentSelectedIds = ref<number[]>([])

const canCreate = computed(() => auth.hasPermission('system:role:create'))
const canUpdate = computed(() => auth.hasPermission('system:role:update'))
const canDelete = computed(() => auth.hasPermission('system:role:delete'))
const canAssignPermissions = computed(() => auth.hasPermission(['system:role:assign-permission', 'system:permission:read']))

const filteredRoles = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return roles.value.filter((role) => {
    const matchesQuery = !query || role.roleName.toLocaleLowerCase().includes(query) || role.roleCode.toLocaleLowerCase().includes(query)
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'enabled' && role.status === 1)
      || (statusFilter.value === 'disabled' && role.status === 0)
    return matchesQuery && matchesStatus
  })
})

function formatDateTime(value: string): string {
  return value.replace('T', ' ')
}

async function loadRoles(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    roles.value = await rolesApi.listRoles()
  } catch (reason) {
    error.value = getApiErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function resetForm(): void {
  Object.assign(form, { roleName: '', roleCode: '', description: '', sort: 0, status: true })
  formId.value = null
}

function openCreate(): void {
  resetForm()
  formVisible.value = true
}

function openEdit(role: RoleRecord): void {
  formId.value = role.id
  Object.assign(form, {
    roleName: role.roleName,
    roleCode: role.roleCode,
    description: role.description ?? '',
    sort: role.sort,
    status: role.status === 1,
  })
  formVisible.value = true
}

async function submitRole(): Promise<void> {
  formSubmitting.value = true
  const payload: RolePayload = {
    roleName: form.roleName.trim(),
    roleCode: form.roleCode.trim(),
    description: form.description.trim(),
    sort: form.sort,
    status: form.status ? 1 : 0,
  }
  try {
    if (formId.value === null) await rolesApi.createRole(payload)
    else await rolesApi.updateRole(formId.value, payload)
    ElMessage.success(formId.value === null ? '角色已创建' : '角色已更新')
    formVisible.value = false
    await loadRoles()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    formSubmitting.value = false
  }
}

async function deleteRole(role: RoleRecord): Promise<void> {
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
    await rolesApi.deleteRole(role.id)
    ElMessage.success('角色已删除')
    await loadRoles()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  }
}

function buildPermissionGroups(items: PermissionRecord[]): AssignmentGroup[] {
  const parents = new Map(items.map((item) => [item.id, item]))
  const groups = new Map<number, AssignmentGroup>()
  for (const item of items) {
    const groupId = item.parentId === 0 ? 0 : item.parentId
    const parent = parents.get(groupId)
    const group = groups.get(groupId) ?? {
      id: `permission-${groupId}`,
      label: groupId === 0 ? '根权限' : (parent?.permissionName ?? '未分类'),
      options: [],
    }
    group.options.push({ id: item.id, label: item.permissionName, description: item.permissionCode ?? undefined })
    groups.set(groupId, group)
  }
  return [...groups.values()]
}

async function openPermissionAssignment(role: RoleRecord): Promise<void> {
  assignmentRoleId.value = role.id
  assignmentLoading.value = true
  try {
    const [detail, permissionList] = await Promise.all([rolesApi.getRole(role.id), permissionsApi.listPermissions()])
    permissions.value = permissionList
    assignmentSelectedIds.value = [...detail.permissionIds]
    assignmentGroups.value = buildPermissionGroups(permissionList)
    assignmentVisible.value = true
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    assignmentLoading.value = false
  }
}

async function savePermissionAssignment(ids: number[]): Promise<void> {
  if (assignmentRoleId.value === null) return
  try {
    await ElMessageBox.confirm(
      '本次保存将替换当前角色的全部权限关联，选择为空将清空全部权限。',
      '确认替换权限关联',
      { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  assignmentLoading.value = true
  try {
    await rolesApi.assignRolePermissions(assignmentRoleId.value, ids)
    assignmentSelectedIds.value = [...ids]
    assignmentVisible.value = false
    ElMessage.success('权限关联已更新')
    await loadRoles()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    assignmentLoading.value = false
  }
}

onMounted(() => {
  void loadRoles()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="角色管理" description="维护角色信息并分配后台权限">
      <template #actions>
        <el-button :loading="loading" @click="loadRoles">刷新</el-button>
        <el-button v-if="canCreate" data-test="role-create" type="primary" @click="openCreate">新建角色</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索角色名称或编码" />
        <el-select v-model="statusFilter" aria-label="角色状态筛选" style="width: 130px">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </div>
      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadRoles">重试</el-button>
      </div>
      <el-table v-loading="loading" :data="filteredRoles" row-key="id" class="management-table">
        <el-table-column prop="roleName" label="角色名称" min-width="140" />
        <el-table-column prop="roleCode" label="角色编码" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200">
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" />
        <el-table-column label="状态" width="90"><template #default="{ row }"><StatusTag :status="row.status" /></template></el-table-column>
        <el-table-column label="更新时间" min-width="160"><template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template></el-table-column>
        <el-table-column label="操作" fixed="right" width="270">
          <template #default="{ row }">
            <el-button v-if="canUpdate" :data-test="`role-edit-${row.id}`" text type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="canAssignPermissions" :data-test="`role-assign-permissions-${row.id}`" text type="primary" @click="openPermissionAssignment(row)">分配权限</el-button>
            <el-button v-if="canDelete" :data-test="`role-delete-${row.id}`" text type="danger" @click="deleteRole(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty><span class="empty-state">暂无角色数据</span></template>
      </el-table>
    </article>

    <el-drawer v-model="formVisible" :title="formId === null ? '新建角色' : '编辑角色'" size="460px" :append-to-body="false">
      <el-form :model="form" label-width="82px" @submit.prevent="submitRole">
        <el-form-item label="角色名称"><el-input v-model="form.roleName" data-test="role-name" maxlength="50" /></el-form-item>
        <el-form-item label="角色编码"><el-input v-model="form.roleCode" data-test="role-code" maxlength="50" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" maxlength="255" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        <el-form-item label="状态"><el-switch v-model="form.status" /></el-form-item>
        <div class="drawer-footer">
          <el-button @click="formVisible = false">取消</el-button>
          <el-button data-test="role-submit" type="primary" :loading="formSubmitting" @click="submitRole">保存</el-button>
        </div>
      </el-form>
    </el-drawer>

    <AssignmentDrawer
      v-model="assignmentVisible"
      title="分配权限"
      :groups="assignmentGroups"
      :selected-ids="assignmentSelectedIds"
      @save="savePermissionAssignment"
    />
  </section>
</template>

<style scoped>
.management-page { max-width: 1480px; margin: 0 auto; }
.management-panel { padding: 18px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); box-shadow: var(--shadow-card); }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.toolbar :deep(.el-input) { width: min(360px, 100%); }
.management-table { width: 100%; }
.inline-error { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; color: var(--color-danger); font-size: 12px; }
.empty-state { color: var(--color-text-muted); }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
</style>
