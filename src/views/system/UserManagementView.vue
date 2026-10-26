<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage } from '@/api/client'
import * as rolesApi from '@/api/roles'
import * as usersApi from '@/api/users'
import AssignmentDrawer from '@/components/management/AssignmentDrawer.vue'
import PageHeader from '@/components/management/PageHeader.vue'
import StatusTag from '@/components/management/StatusTag.vue'
import { useAuthStore } from '@/stores/auth'
import type { AssignmentGroup } from '@/types/management'
import type { RoleRecord, UserRecord, UserUpdatePayload } from '@/types/system'

interface UserForm {
  nickname: string
  email: string
  phone: string
  avatar: string
}

const auth = useAuthStore()
const users = ref<UserRecord[]>([])
const roles = ref<RoleRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const keyword = ref('')
const statusFilter = ref<'all' | 'enabled' | 'disabled'>('all')
const editVisible = ref(false)
const editId = ref<number | null>(null)
const editForm = reactive<UserForm>({ nickname: '', email: '', phone: '', avatar: '' })
const editSubmitting = ref(false)
const assignmentVisible = ref(false)
const assignmentLoading = ref(false)
const assignmentUserId = ref<number | null>(null)
const assignmentGroups = ref<AssignmentGroup[]>([])
const assignmentSelectedIds = ref<number[]>([])

const canEdit = computed(() => auth.hasPermission('system:user:update'))
const canAssignRoles = computed(() => auth.hasPermission(['system:user:assign-role', 'system:role:read']))

const filteredUsers = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return users.value.filter((user) => {
    const matchesQuery = !query || [user.username, user.nickname, user.email, user.phone]
      .some((value) => value?.toLocaleLowerCase().includes(query))
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'enabled' && user.status === 1)
      || (statusFilter.value === 'disabled' && user.status === 0)
    return matchesQuery && matchesStatus
  })
})

function formatDateTime(value: string | null): string {
  return value ? value.replace('T', ' ') : '—'
}

async function loadUsers(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    users.value = await usersApi.listUsers()
  } catch (reason) {
    error.value = getApiErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

function openEdit(user: UserRecord): void {
  editId.value = user.id
  Object.assign(editForm, {
    nickname: user.nickname ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    avatar: user.avatar ?? '',
  })
  editVisible.value = true
}

function closeEdit(): void {
  if (!editSubmitting.value) editVisible.value = false
}

async function submitEdit(): Promise<void> {
  if (editId.value === null) return
  editSubmitting.value = true
  const payload: UserUpdatePayload = {
    nickname: editForm.nickname,
    email: editForm.email,
    phone: editForm.phone,
    avatar: editForm.avatar,
  }
  try {
    await usersApi.updateUser(editId.value, payload)
    ElMessage.success('用户资料已更新')
    editVisible.value = false
    await loadUsers()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    editSubmitting.value = false
  }
}

async function updateStatus(user: UserRecord, value: unknown): Promise<void> {
  const previousStatus = user.status
  const nextStatus = Boolean(value) ? 1 : 0
  user.status = nextStatus
  try {
    await usersApi.updateUserStatus(user.id, nextStatus)
  } catch (reason) {
    user.status = previousStatus
    ElMessage.error(getApiErrorMessage(reason))
  }
}

async function openRoleAssignment(user: UserRecord): Promise<void> {
  assignmentUserId.value = user.id
  assignmentLoading.value = true
  try {
    const [detail, roleList] = await Promise.all([usersApi.getUser(user.id), rolesApi.listRoles()])
    roles.value = roleList
    assignmentSelectedIds.value = [...(detail.roleIds ?? [])]
    assignmentGroups.value = [{
      id: 'roles',
      label: '可分配角色',
      options: roleList.map((role) => ({ id: role.id, label: role.roleName, description: role.roleCode })),
    }]
    assignmentVisible.value = true
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    assignmentLoading.value = false
  }
}

async function saveRoleAssignment(ids: number[]): Promise<void> {
  if (assignmentUserId.value === null) return
  try {
    await ElMessageBox.confirm(
      '本次保存将替换当前用户的全部角色关联，选择为空将清空全部角色。',
      '确认替换角色关联',
      { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  assignmentLoading.value = true
  try {
    await usersApi.assignUserRoles(assignmentUserId.value, ids)
    assignmentSelectedIds.value = [...ids]
    assignmentVisible.value = false
    ElMessage.success('角色关联已更新')
    await loadUsers()
  } catch (reason) {
    ElMessage.error(getApiErrorMessage(reason))
  } finally {
    assignmentLoading.value = false
  }
}

onMounted(() => {
  void loadUsers()
})
</script>

<template>
  <section class="management-page">
    <PageHeader title="用户管理" description="维护后台账号资料、状态与角色关联">
      <template #actions>
        <el-button :loading="loading" @click="loadUsers">刷新</el-button>
      </template>
    </PageHeader>

    <article class="management-panel">
      <div class="toolbar">
        <el-input v-model="keyword" clearable placeholder="搜索用户名、昵称或联系方式" />
        <el-select v-model="statusFilter" aria-label="用户状态筛选" style="width: 130px">
          <el-option label="全部状态" value="all" />
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </div>

      <div v-if="error" class="inline-error" role="alert">
        {{ error }}
        <el-button text type="danger" size="small" @click="loadUsers">重试</el-button>
      </div>

      <el-table v-loading="loading" :data="filteredUsers" row-key="id" class="management-table">
        <el-table-column prop="username" label="用户名" min-width="130" />
        <el-table-column prop="nickname" label="昵称" min-width="120">
          <template #default="{ row }">{{ row.nickname || '—' }}</template>
        </el-table-column>
        <el-table-column label="联系方式" min-width="210">
          <template #default="{ row }">
            <div>{{ row.email || '—' }}</div>
            <small>{{ row.phone || '—' }}</small>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="最近登录" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.lastLoginTime) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="160">
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="250">
          <template #default="{ row }">
            <el-button v-if="canEdit" :data-test="`user-edit-${row.id}`" text type="primary" @click="openEdit(row)">
              编辑
            </el-button>
            <el-switch
              v-if="canEdit"
              :model-value="row.status === 1"
              :data-test="`user-status-${row.id}`"
              inline-prompt
              active-text="启用"
              inactive-text="停用"
              @change="updateStatus(row, $event)"
            />
            <el-button
              v-if="canAssignRoles"
              :data-test="`user-assign-roles-${row.id}`"
              text
              type="primary"
              :loading="assignmentLoading && assignmentUserId === row.id"
              @click="openRoleAssignment(row)"
            >
              分配角色
            </el-button>
          </template>
        </el-table-column>
        <template #empty><span class="empty-state">暂无用户数据</span></template>
      </el-table>
    </article>

    <el-drawer v-model="editVisible" title="编辑用户资料" size="460px" :append-to-body="false" @close="closeEdit">
      <el-form :model="editForm" label-width="78px" @submit.prevent="submitEdit">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" data-test="user-nickname" maxlength="50" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" maxlength="100" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="editForm.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="头像地址">
          <el-input v-model="editForm.avatar" maxlength="500" />
        </el-form-item>
        <div class="drawer-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button data-test="user-edit-submit" type="primary" :loading="editSubmitting" @click="submitEdit">
            保存
          </el-button>
        </div>
      </el-form>
    </el-drawer>

    <AssignmentDrawer
      v-model="assignmentVisible"
      title="分配角色"
      search-placeholder="搜索角色"
      :groups="assignmentGroups"
      :selected-ids="assignmentSelectedIds"
      @save="saveRoleAssignment"
    />
  </section>
</template>

<style scoped>
.management-page {
  max-width: 1480px;
  margin: 0 auto;
}

.management-panel {
  padding: 18px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.toolbar :deep(.el-input) {
  width: min(360px, 100%);
}

.management-table {
  width: 100%;
}

.management-table small {
  color: var(--color-text-muted);
}

.inline-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--color-danger);
  font-size: 12px;
}

.empty-state {
  color: var(--color-text-muted);
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
