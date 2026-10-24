import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import type { ApiErrorDetails, ApiErrorPayload, ApiResponse } from '@/types/api'
import type { AuthToken } from '@/types/auth'

export interface ApiClientOptions {
  readToken: () => AuthToken | null
  onUnauthorized: () => void
}

export interface ApiClient {
  defaults: AxiosInstance['defaults']
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(details: ApiErrorDetails) {
    super(details.message)
    this.name = 'ApiError'
    this.status = details.status
    this.code = details.code
  }
}

function getPayload(value: unknown): ApiErrorPayload {
  if (typeof value !== 'object' || value === null) return {}
  return value as ApiErrorPayload
}

function fallbackMessage(status: number): string {
  if (status === 401) return '登录已过期，请重新登录'
  if (status === 403) return '当前账号没有执行此操作的权限'
  if (status === 404) return '请求的资源不存在'
  if (status >= 500) return '服务暂时不可用，请稍后重试'
  return '请求失败，请检查输入后重试'
}

function toApiError(status: number, payloadValue: unknown): ApiError {
  const payload = getPayload(payloadValue)
  return new ApiError({
    status,
    code: payload.code ?? 'REQUEST_FAILED',
    message: payload.message ?? fallbackMessage(status),
  })
}

function installInterceptors(client: AxiosInstance, options: ApiClientOptions): void {
  client.interceptors.request.use((config) => {
    const token = options.readToken()
    if (token) {
      config.headers.set(token.tokenName, token.tokenValue)
    }
    return config
  })

  client.interceptors.response.use(
    (response: AxiosResponse<ApiResponse<unknown>>) => {
      if (!response.data?.success) {
        if (response.status === 401) options.onUnauthorized()
        throw toApiError(response.status, response.data)
      }
      return response
    },
    (error: unknown) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 0
        if (status === 401) options.onUnauthorized()
        return Promise.reject(toApiError(status, error.response?.data))
      }
      return Promise.reject(error)
    },
  )
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  })
  installInterceptors(client, options)

  return {
    defaults: client.defaults,
    get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
      const response = await client.get<ApiResponse<T>>(url, config)
      return response.data.data
    },
    post: async <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
      const response = await client.post<ApiResponse<T>>(url, data, config)
      return response.data.data
    },
  }
}

const singletonOptions: ApiClientOptions = {
  readToken: () => null,
  onUnauthorized: () => undefined,
}

export const apiClient = createApiClient({
  readToken: () => singletonOptions.readToken(),
  onUnauthorized: () => singletonOptions.onUnauthorized(),
})

export function configureApiClient(options: ApiClientOptions): void {
  singletonOptions.readToken = options.readToken
  singletonOptions.onUnauthorized = options.onUnauthorized
}

export function getApiErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '请求失败，请稍后重试'
}
