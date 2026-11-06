export type KnowledgeBaseStatus = 'ACTIVE' | 'DISABLED' | 'DELETED'
export type KnowledgeDocumentSourceType = 'FILE' | 'TEXT'
export type KnowledgeDocumentStatus = 'PENDING' | 'INDEXING' | 'READY' | 'FAILED' | 'DELETED'

export interface KnowledgePage<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export interface KnowledgePageQuery {
  page: number
  size: number
}

export interface KnowledgeBaseAdmin {
  id: number
  userId: number
  name: string
  description: string | null
  embeddingModelId: number | null
  embeddingModelVersion: number | null
  pendingEmbeddingModelId: number | null
  pendingEmbeddingModelVersion: number | null
  activeIndexVersion: number | null
  reindexing: boolean
  status: KnowledgeBaseStatus
  createTime: string
  updateTime: string
}

export interface KnowledgeDocument {
  id: number
  title: string
  sourceType: KnowledgeDocumentSourceType
  fileId: number | null
  status: KnowledgeDocumentStatus
  indexVersion: number | null
  activeIndexVersion: number | null
  chunkCount: number | null
  errorCode: string | null
  errorMessage: string | null
  createTime: string
  updateTime: string
}

export interface KnowledgeDocumentContent {
  documentId: number
  title: string
  content: string
}
