import { apiClient } from '@/api/client'
import type { CurrentUser, LoginRequest, LoginResponse } from '@/types/auth'

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('auth/login', payload)
}

export function getCurrentUser(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('auth/me')
}

export function logout(): Promise<null> {
  return apiClient.post<null>('auth/logout')
}

export function logoutAll(): Promise<null> {
  return apiClient.post<null>('auth/logout-all')
}
