import type { BinaryStatus } from './management'

export interface UserRecord {
  id: number
  username: string
  nickname: string | null
  email: string | null
  phone: string | null
  avatar: string | null
  status: number
  lastLoginTime: string | null
  createTime: string
  roleIds?: number[]
  roleCodes?: string[]
  permissionCodes?: string[]
}

export interface RoleRecord {
  id: number
  roleName: string
  roleCode: string
  description: string | null
  sort: number
  status: number
  createTime: string
  updateTime: string
}

export interface RoleDetail extends RoleRecord {
  permissionIds: number[]
}

export interface PermissionRecord {
  id: number
  parentId: number
  permissionName: string
  permissionCode: string | null
  permissionType: number
  path: string | null
  component: string | null
  icon: string | null
  sort: number
  status: number
  createTime: string
  updateTime: string
}

export interface UserUpdatePayload {
  nickname?: string
  email?: string
  phone?: string
  avatar?: string
}

export interface RolePayload {
  roleName: string
  roleCode: string
  description?: string
  sort?: number
  status?: BinaryStatus
}

export interface PermissionPayload {
  parentId: number
  permissionName: string
  permissionCode?: string
  permissionType: number
  path?: string
  component?: string
  icon?: string
  sort?: number
  status?: BinaryStatus
}

export interface IdSetPayload {
  ids: number[]
}
