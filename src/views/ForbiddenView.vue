<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getFirstAccessiblePath } from '@/router'

const auth = useAuthStore()
const router = useRouter()

async function returnToAccessiblePage(): Promise<void> {
  const path = getFirstAccessiblePath(auth.permissionCodes)
  if (path === '/forbidden') {
    auth.clear()
    await router.replace('/login')
    return
  }
  await router.replace(path)
}
</script>

<template>
  <main class="forbidden-page">
    <el-card class="forbidden-card" shadow="never">
      <div class="forbidden-code">403</div>
      <h1>暂无可访问的后台页面</h1>
      <p>当前账号没有可用的后台读取权限，请联系系统管理员分配权限。</p>
      <el-button type="primary" @click="returnToAccessiblePage">返回</el-button>
    </el-card>
  </main>
</template>

<style scoped>
.forbidden-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--color-background);
}

.forbidden-card {
  width: min(100%, 480px);
  border-radius: var(--radius-lg);
  text-align: center;
}

.forbidden-code {
  color: var(--color-primary);
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -0.05em;
}

h1 {
  margin: 8px 0;
  font-size: 20px;
}

p {
  margin: 0 0 22px;
  color: var(--color-text-secondary);
}
</style>
