import { apiClient } from '@/api/client'
import type {
  KnowledgeBaseAdmin,
  KnowledgeDocument,
  KnowledgeDocumentContent,
  KnowledgePage,
  KnowledgePageQuery,
} from '@/types/knowledge'

export function listKnowledgeBases(
  query: KnowledgePageQuery,
): Promise<KnowledgePage<KnowledgeBaseAdmin>> {
  return apiClient.get<KnowledgePage<KnowledgeBaseAdmin>>('admin/knowledge-bases', {
    params: query,
  })
}

export function listKnowledgeDocuments(
  knowledgeBaseId: number,
  query: KnowledgePageQuery,
): Promise<KnowledgePage<KnowledgeDocument>> {
  return apiClient.get<KnowledgePage<KnowledgeDocument>>(
    `admin/knowledge-bases/${knowledgeBaseId}/documents`,
    { params: query },
  )
}

export function getKnowledgeDocumentContent(
  knowledgeBaseId: number,
  documentId: number,
): Promise<KnowledgeDocumentContent> {
  return apiClient.get<KnowledgeDocumentContent>(
    `admin/knowledge-bases/${knowledgeBaseId}/documents/${documentId}/content`,
  )
}
