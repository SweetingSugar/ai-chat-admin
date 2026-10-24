<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { getApiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { getFirstAccessiblePath } from '@/router'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const form = reactive({ username: '', password: '' })

const rules: FormRules<typeof form> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { max: 50, message: '用户名不能超过 50 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { max: 72, message: '密码不能超过 72 个字符', trigger: 'blur' },
  ],
}

function getSafeRedirect(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) return value
  return getFirstAccessiblePath(auth.permissionCodes)
}

async function submit(): Promise<void> {
  if (submitting.value) return
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await auth.login({ username: form.username, password: form.password })
    await router.replace(getSafeRedirect(route.query.redirect))
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <el-card class="login-card" shadow="never">
      <div class="login-brand">AI Chat Admin</div>
      <p class="login-subtitle">登录管理后台，查看平台运行情况</p>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            name="username"
            autocomplete="username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            name="password"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button
          class="login-submit"
          type="primary"
          native-type="submit"
          :loading="submitting"
          :disabled="submitting"
        >
          登录
        </el-button>
      </el-form>
    </el-card>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--color-background);
}

.login-card {
  width: min(100%, 400px);
  border-color: var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(32, 54, 90, 0.08);
}

.login-brand {
  color: var(--color-primary);
  font-size: 22px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.login-subtitle {
  margin: 6px 0 24px;
  color: var(--color-text-secondary);
}

.login-submit {
  width: 100%;
  margin-top: 8px;
}
</style>
