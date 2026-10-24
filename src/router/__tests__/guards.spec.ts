import { beforeEach, expect, it } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { createAppRouter, getFirstAccessiblePath } from '@/router'
import { useAuthStore } from '@/stores/auth'

const user = {
  id: 1,
  username: 'admin',
  nickname: '管理员',
  email: null,
  phone: null,
  avatar: null,
  status: 1,
  lastLoginTime: null,
  createTime: '2026-10-24T09:00:00',
  roleCodes: ['admin'],
  permissionCodes: ['admin:dashboard:read'],
}

beforeEach(() => {
  setActivePinia(createPinia())
})

it('chooses the dashboard when the user has its entry permission', () => {
  expect(getFirstAccessiblePath(['admin:dashboard:read'])).toBe('/dashboard')
})

it('chooses forbidden when no backend entry permission exists', () => {
  expect(getFirstAccessiblePath([])).toBe('/forbidden')
})

it('redirects an unauthenticated dashboard request to login with its target', async () => {
  const router = createAppRouter(createMemoryHistory())
  await router.push('/dashboard')

  expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/dashboard')
})

it('redirects an authenticated login request to the first accessible page', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = user
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/login')

  expect(router.currentRoute.value.fullPath).toBe('/dashboard')
})

it('redirects an authenticated user without dashboard permission to forbidden', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: [] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/dashboard')

  expect(router.currentRoute.value.fullPath).toBe('/forbidden')
})

it('resolves the root route to the first accessible page', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = user
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/')

  expect(router.currentRoute.value.fullPath).toBe('/dashboard')
})
