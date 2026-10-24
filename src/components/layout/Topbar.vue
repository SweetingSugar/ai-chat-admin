<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { getApiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const pageTitle = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : '管理后台'))
const accountName = computed(() => auth.user?.nickname || auth.user?.username || '当前账号')
const accountInitial = computed(() => accountName.value.slice(0, 1).toUpperCase())

function showHelp(): void {
  ElMessage.info('如需帮助，请联系系统管理员')
}

async function handleCommand(command: string): Promise<void> {
  try {
    if (command === 'logout') await auth.logout()
    if (command === 'logout-all') await auth.logoutAll()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    await router.replace('/login')
  }
}
</script>

<template>
  <header class="admin-topbar">
    <div class="breadcrumb" aria-label="当前位置">
      <span>工作台</span>
      <span class="breadcrumb-separator" aria-hidden="true">/</span>
      <strong>{{ pageTitle }}</strong>
    </div>
    <div class="topbar-actions">
      <el-button text aria-label="帮助" @click="showHelp">帮助</el-button>
      <el-dropdown trigger="click" @command="handleCommand">
        <button class="account-button" type="button" aria-label="打开账号菜单">
          <span class="account-avatar" aria-hidden="true">{{ accountInitial }}</span>
          <span class="account-name">{{ accountName }}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出当前会话</el-dropdown-item>
            <el-dropdown-item command="logout-all">退出全部会话</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped>
.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 28px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.breadcrumb strong {
  color: var(--color-text);
  font-weight: 600;
}

.breadcrumb-separator {
  color: var(--color-text-muted);
}

.topbar-actions,
.account-button {
  display: flex;
  align-items: center;
}

.topbar-actions {
  gap: 12px;
}

.account-button {
  gap: 8px;
  padding: 4px 2px;
  border: 0;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
}

.account-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  color: var(--color-primary);
  background: var(--color-primary-soft);
  font-weight: 700;
}

.account-name {
  max-width: 130px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .admin-topbar {
    padding: 0 16px;
  }

  .account-name {
    display: none;
  }
}
</style>
