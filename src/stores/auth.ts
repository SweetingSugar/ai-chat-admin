import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/api/auth'
import type { AuthToken, CurrentUser, LoginRequest } from '@/types/auth'
import { clearStoredToken, readStoredToken, writeStoredToken } from '@/utils/auth-storage'
import { hasAnyPermission, hasPermission } from '@/utils/permission'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<AuthToken | null>(readStoredToken())
  const user = ref<CurrentUser | null>(null)
  const initialized = ref(false)
  let initializePromise: Promise<void> | null = null

  const roleCodes = computed(() => user.value?.roleCodes ?? [])
  const permissionCodes = computed(() => user.value?.permissionCodes ?? [])
  const isAuthenticated = computed(() => token.value !== null && user.value !== null)

  function hasPermissionFor(required: string | readonly string[]): boolean {
    return hasPermission(permissionCodes.value, required)
  }

  function hasAnyPermissionFor(candidates: readonly string[]): boolean {
    return hasAnyPermission(permissionCodes.value, candidates)
  }

  async function initialize(): Promise<void> {
    if (initialized.value) return
    if (initializePromise) return initializePromise

    initializePromise = Promise.resolve().then(async () => {
      try {
        if (!token.value) {
          initialized.value = true
          return
        }

        user.value = await authApi.getCurrentUser()
      } catch {
        clear()
      } finally {
        initialized.value = true
        initializePromise = null
      }
    })

    return initializePromise
  }

  async function login(payload: LoginRequest): Promise<void> {
    const result = await authApi.login(payload)
    token.value = { tokenName: result.tokenName, tokenValue: result.tokenValue }
    writeStoredToken(token.value)
    user.value = null
    initialized.value = false
    await initialize()
  }

  function clear(): void {
    token.value = null
    user.value = null
    initialized.value = false
    clearStoredToken()
  }

  async function logout(): Promise<void> {
    try {
      if (token.value) await authApi.logout()
    } finally {
      clear()
    }
  }

  async function logoutAll(): Promise<void> {
    try {
      if (token.value) await authApi.logoutAll()
    } finally {
      clear()
    }
  }

  return {
    token,
    user,
    initialized,
    roleCodes,
    permissionCodes,
    isAuthenticated,
    hasPermission: hasPermissionFor,
    hasAnyPermission: hasAnyPermissionFor,
    initialize,
    login,
    logout,
    logoutAll,
    clear,
  }
})
