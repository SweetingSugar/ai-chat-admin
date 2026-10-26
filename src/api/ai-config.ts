import { apiClient } from '@/api/client'
import type { ModelPayload, ModelRecord, ProviderPayload, ProviderRecord } from '@/types/ai-config'

export function listProviders(): Promise<ProviderRecord[]> {
  return apiClient.get<ProviderRecord[]>('admin/ai/providers')
}

export function getProvider(id: number): Promise<ProviderRecord> {
  return apiClient.get<ProviderRecord>(`admin/ai/providers/${id}`)
}

export function createProvider(payload: ProviderPayload): Promise<ProviderRecord> {
  return apiClient.post<ProviderRecord>('admin/ai/providers', payload)
}

export function updateProvider(id: number, payload: ProviderPayload): Promise<ProviderRecord> {
  return apiClient.put<ProviderRecord>(`admin/ai/providers/${id}`, payload)
}

export function deleteProvider(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/ai/providers/${id}`)
}

export function listModels(): Promise<ModelRecord[]> {
  return apiClient.get<ModelRecord[]>('admin/ai/models')
}

export function getModel(id: number): Promise<ModelRecord> {
  return apiClient.get<ModelRecord>(`admin/ai/models/${id}`)
}

export function createModel(payload: ModelPayload): Promise<ModelRecord> {
  return apiClient.post<ModelRecord>('admin/ai/models', payload)
}

export function updateModel(id: number, payload: ModelPayload): Promise<ModelRecord> {
  return apiClient.put<ModelRecord>(`admin/ai/models/${id}`, payload)
}

export function deleteModel(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/ai/models/${id}`)
}
