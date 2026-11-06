import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import {
  getKnowledgeDocumentContent,
  listKnowledgeBases,
  listKnowledgeDocuments,
} from '@/api/knowledge'

const page = {
  records: [],
  total: 0,
  current: 1,
  size: 20,
  pages: 0,
}

afterEach(() => vi.restoreAllMocks())

describe('knowledge API wrappers', () => {
  it('requests the administrator knowledge-base page', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listKnowledgeBases({ page: 2, size: 50 })

    expect(apiClient.get).toHaveBeenCalledWith('admin/knowledge-bases', {
      params: { page: 2, size: 50 },
    })
  })

  it('requests documents for a knowledge base with pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listKnowledgeDocuments(12, { page: 3, size: 10 })

    expect(apiClient.get).toHaveBeenCalledWith('admin/knowledge-bases/12/documents', {
      params: { page: 3, size: 10 },
    })
  })

  it('requests text content for a document in its knowledge base', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      documentId: 21,
      title: '制度',
      content: '第一条',
    })

    await getKnowledgeDocumentContent(12, 21)

    expect(apiClient.get).toHaveBeenCalledWith(
      'admin/knowledge-bases/12/documents/21/content',
    )
  })
})
