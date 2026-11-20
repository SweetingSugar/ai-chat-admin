import { apiClient } from '@/api/client'
import type { AgentAdmin, AgentPage, AgentPageQuery } from '@/types/agents'

export function listAgents(query: AgentPageQuery): Promise<AgentPage> {
  return apiClient.get<AgentPage>('admin/agents', { params: query })
}

export function getAgent(id: number): Promise<AgentAdmin> {
  return apiClient.get<AgentAdmin>(`admin/agents/${id}`)
}
