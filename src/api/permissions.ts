import { apiClient } from '@/api/client'
import type { PermissionPayload, PermissionRecord } from '@/types/system'

export function listPermissions(): Promise<PermissionRecord[]> {
  return apiClient.get<PermissionRecord[]>('system/permissions')
}

export function getPermission(id: number): Promise<PermissionRecord> {
  return apiClient.get<PermissionRecord>(`system/permissions/${id}`)
}

export function createPermission(payload: PermissionPayload): Promise<PermissionRecord> {
  return apiClient.post<PermissionRecord>('system/permissions', payload)
}

export function updatePermission(id: number, payload: PermissionPayload): Promise<PermissionRecord> {
  return apiClient.put<PermissionRecord>(`system/permissions/${id}`, payload)
}

export function deletePermission(id: number): Promise<void> {
  return apiClient.delete<void>(`system/permissions/${id}`)
}
