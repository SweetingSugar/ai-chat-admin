import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import { ApiError } from '@/api/client'
import * as authApi from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { readStoredToken, writeStoredToken } from '@/utils/auth-storage'

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
}))

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
  localStorage.clear()
  vi.clearAllMocks()
})

it('stores the dynamic token and current user after login', async () => {
  vi.mocked(authApi.login).mockResolvedValue({
    tokenName: 'x-auth',
    tokenValue: 'secret',
    user,
  })
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(user)
  const store = useAuthStore(createPinia())

  await store.login({ username: 'admin', password: 'password123' })

  expect(store.token).toEqual({ tokenName: 'x-auth', tokenValue: 'secret' })
  expect(store.hasPermission('admin:dashboard:read')).toBe(true)
  expect(readStoredToken()).toEqual({ tokenName: 'x-auth', tokenValue: 'secret' })
})

it('clears token and user when initialization gets a 401', async () => {
  vi.mocked(authApi.getCurrentUser).mockRejectedValue(
    new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'expired' }),
  )
  writeStoredToken({ tokenName: 'x-auth', tokenValue: 'secret' })
  const store = useAuthStore(createPinia())

  await store.initialize()

  expect(store.isAuthenticated).toBe(false)
  expect(readStoredToken()).toBeNull()
  expect(store.user).toBeNull()
})

it('does not call the current-user endpoint without a token', async () => {
  const store = useAuthStore(createPinia())

  await store.initialize()

  expect(authApi.getCurrentUser).not.toHaveBeenCalled()
  expect(store.initialized).toBe(true)
})

it('initializes the current user after login follows an empty initialization', async () => {
  vi.mocked(authApi.login).mockResolvedValue({
    tokenName: 'x-auth',
    tokenValue: 'secret',
    user,
  })
  vi.mocked(authApi.getCurrentUser).mockResolvedValue(user)
  const store = useAuthStore(createPinia())

  await store.initialize()
  await store.login({ username: 'admin', password: 'password123' })

  expect(authApi.getCurrentUser).toHaveBeenCalledOnce()
  expect(store.isAuthenticated).toBe(true)
  expect(store.user).toEqual(user)
})

it('always clears local state after logout-all', async () => {
  vi.mocked(authApi.logoutAll).mockRejectedValue(new Error('network'))
  writeStoredToken({ tokenName: 'x-auth', tokenValue: 'secret' })
  const store = useAuthStore(createPinia())
  store.user = user

  await expect(store.logoutAll()).rejects.toThrow('network')

  expect(store.isAuthenticated).toBe(false)
  expect(readStoredToken()).toBeNull()
})
