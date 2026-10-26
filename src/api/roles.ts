import { apiClient } from '@/api/client'
import type { IdSetPayload, PermissionRecord, RoleDetail, RolePayload, RoleRecord } from '@/types/system'

export function listRoles(): Promise<RoleRecord[]> {
  return apiClient.get<RoleRecord[]>('system/roles')
}

export function getRole(id: number): Promise<RoleDetail> {
  return apiClient.get<RoleDetail>(`system/roles/${id}`)
}

export function createRole(payload: RolePayload): Promise<RoleRecord> {
  return apiClient.post<RoleRecord>('system/roles', payload)
}

export function updateRole(id: number, payload: RolePayload): Promise<RoleRecord> {
  return apiClient.put<RoleRecord>(`system/roles/${id}`, payload)
}

export function deleteRole(id: number): Promise<void> {
  return apiClient.delete<void>(`system/roles/${id}`)
}

export function assignRolePermissions(id: number, ids: number[]): Promise<void> {
  const payload: IdSetPayload = { ids }
  return apiClient.put<void>(`system/roles/${id}/permissions`, payload)
}

export function listPermissionsForAssignment(): Promise<PermissionRecord[]> {
  return apiClient.get<PermissionRecord[]>('system/permissions')
}
