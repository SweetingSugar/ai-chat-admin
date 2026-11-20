import type { BinaryStatus } from './management'

export interface AgentAdmin {
  id: number
  userId: number
  name: string
  description: string | null
  systemPrompt: string
  modelId: number | null
  knowledgeBaseIds: number[]
  toolCodes: string[]
  status: BinaryStatus
  createTime: string
  updateTime: string
}

export interface AgentPage {
  records: AgentAdmin[]
  total: number
  current: number
  size: number
  pages: number
}

export interface AgentPageQuery {
  page: number
  size: number
}
