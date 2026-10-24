export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

export interface ApiErrorPayload {
  success?: boolean
  code?: string
  message?: string
}

export interface ApiErrorDetails {
  status: number
  code: string
  message: string
}
