import type { BinaryStatus } from './management'

export type ProviderType = 'OPENAI' | 'DEEPSEEK' | 'QWEN' | 'OLLAMA'

export interface ProviderRecord {
  id: number
  providerCode: string
  providerName: string
  providerType: ProviderType
  baseUrl: string
  connectTimeout: number | null
  readTimeout: number | null
  status: number
  hasApiKey: boolean
  credentialVersion: number | null
  sort: number
  remark: string | null
}

export interface ProviderPayload {
  providerCode: string
  providerName: string
  providerType: ProviderType
  baseUrl: string
  apiKey?: string
  connectTimeout?: number
  readTimeout?: number
  status?: BinaryStatus
  sort?: number
  remark?: string
}

export interface ModelRecord {
  id: number
  providerId: number
  providerName: string
  modelCode: string
  modelName: string
  modelType: string
  contextWindow: number
  maxOutputTokens: number
  temperature: number | null
  topP: number | null
  supportStream: boolean
  supportVision: boolean
  defaultModel: boolean
  configVersion: number | null
  status: number
  sort: number
  remark: string | null
}

export interface ModelPayload {
  providerId: number
  modelCode: string
  modelName: string
  modelType: string
  contextWindow?: number
  maxOutputTokens?: number
  temperature?: number
  topP?: number
  supportStream?: BinaryStatus
  supportVision?: BinaryStatus
  isDefault?: BinaryStatus
  status?: BinaryStatus
  sort?: number
  remark?: string
}
