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

it('allows a user with only user-read permission to enter user management', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: ['system:user:read'] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/system/users')

  expect(router.currentRoute.value.fullPath).toBe('/system/users')
})

it('uses the first accessible management route when dashboard is unavailable', () => {
  expect(getFirstAccessiblePath(['system:user:read'])).toBe('/system/users')
})

it('chooses file management when file-read is the first available entry', () => {
  expect(getFirstAccessiblePath(['file:read'])).toBe('/system/files')
})

it('allows a user with only file-read permission to enter file management', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: ['file:read'] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/system/files')

  expect(router.currentRoute.value.fullPath).toBe('/system/files')
})
