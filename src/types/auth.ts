export interface AuthToken {
  tokenName: string
  tokenValue: string
}

export interface User {
  id: number
  username: string
  nickname: string | null
  email: string | null
  phone: string | null
  avatar: string | null
  status: number
  lastLoginTime: string | null
  createTime: string
}

export interface CurrentUser extends User {
  roleCodes: string[]
  permissionCodes: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  tokenName: string
  tokenValue: string
  user: User
}
