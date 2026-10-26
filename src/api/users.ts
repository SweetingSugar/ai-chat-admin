import { apiClient } from '@/api/client'
import type { BinaryStatus } from '@/types/management'
import type { IdSetPayload, RoleRecord, UserRecord, UserUpdatePayload } from '@/types/system'

export function listUsers(): Promise<UserRecord[]> {
  return apiClient.get<UserRecord[]>('system/users')
}

export function getUser(id: number): Promise<UserRecord> {
  return apiClient.get<UserRecord>(`system/users/${id}`)
}

export function updateUser(id: number, payload: UserUpdatePayload): Promise<UserRecord> {
  return apiClient.put<UserRecord>(`system/users/${id}`, payload)
}

export function updateUserStatus(id: number, status: BinaryStatus): Promise<void> {
  return apiClient.patch<void>(`system/users/${id}/status`, { status })
}

export function assignUserRoles(id: number, ids: number[]): Promise<void> {
  const payload: IdSetPayload = { ids }
  return apiClient.put<void>(`system/users/${id}/roles`, payload)
}

export function listRolesForAssignment(): Promise<RoleRecord[]> {
  return apiClient.get<RoleRecord[]>('system/roles')
}
