import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KnowledgeBaseManagementView from '@/views/system/KnowledgeBaseManagementView.vue'
import * as knowledgeApi from '@/api/knowledge'

vi.mock('@/api/knowledge', () => ({
  listKnowledgeBases: vi.fn(),
  listKnowledgeDocuments: vi.fn(),
  getKnowledgeDocumentContent: vi.fn(),
}))

vi.mock('@/api/files', () => ({
  getFile: vi.fn(),
  getAdminFilePresignedUrl: vi.fn(),
}))

const base = {
  id: 12,
  userId: 100,
  name: '产品手册',
  description: '产品相关资料',
  embeddingModelId: 30,
  embeddingModelVersion: 1,
  pendingEmbeddingModelId: null,
  pendingEmbeddingModelVersion: null,
  activeIndexVersion: 1,
  reindexing: false,
  status: 'ACTIVE' as const,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-05T10:00:00',
}

const textDocument = {
  id: 21,
  title: '制度',
  sourceType: 'TEXT' as const,
  fileId: null,
  status: 'READY' as const,
  indexVersion: 1,
  activeIndexVersion: 1,
  chunkCount: 3,
  errorCode: null,
  errorMessage: null,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-05T10:00:00',
}

const basePage = { records: [base], total: 1, current: 1, size: 20, pages: 1 }
const documentPage = { records: [textDocument], total: 1, current: 1, size: 20, pages: 1 }

beforeEach(() => {
  vi.mocked(knowledgeApi.listKnowledgeBases).mockResolvedValue(basePage)
  vi.mocked(knowledgeApi.listKnowledgeDocuments).mockResolvedValue(documentPage)
  vi.mocked(knowledgeApi.getKnowledgeDocumentContent).mockResolvedValue({
    documentId: 21,
    title: '制度',
    content: '第一条',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('KnowledgeBaseManagementView', () => {
  it('loads and renders the knowledge-base page', async () => {
    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(knowledgeApi.listKnowledgeBases).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('产品手册')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('2026-11-05 10:00:00')
  })

  it('opens the document drawer and loads text content', async () => {
    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
    await flushPromises()

    expect(knowledgeApi.listKnowledgeDocuments).toHaveBeenCalledWith(12, { page: 1, size: 20 })
    expect(wrapper.text()).toContain('制度')

    await wrapper.get('[data-test="knowledge-document-content-21"]').trigger('click')
    await flushPromises()

    expect(knowledgeApi.getKnowledgeDocumentContent).toHaveBeenCalledWith(12, 21)
    expect(wrapper.text()).toContain('第一条')
  })

  it('requests document pages when the document pagination changes', async () => {
    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
    await flushPromises()

    const documentPagination = wrapper.findAllComponents({ name: 'ElPagination' })[1]
    await documentPagination.vm.$emit('current-change', 2)
    await flushPromises()
    expect(knowledgeApi.listKnowledgeDocuments).toHaveBeenLastCalledWith(12, { page: 2, size: 20 })

    await documentPagination.vm.$emit('size-change', 50)
    await flushPromises()
    expect(knowledgeApi.listKnowledgeDocuments).toHaveBeenLastCalledWith(12, { page: 1, size: 50 })
  })

  it('keeps the newest document response after switching knowledge bases', async () => {
    const secondBase = { ...base, id: 13, name: '第二知识库', userId: 101 }
    vi.mocked(knowledgeApi.listKnowledgeBases).mockResolvedValue({
      ...basePage,
      records: [base, secondBase],
      total: 2,
    })
    let resolveFirst: (value: typeof documentPage) => void = () => undefined
    let resolveSecond: (value: typeof documentPage) => void = () => undefined
    vi.mocked(knowledgeApi.listKnowledgeDocuments)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

    const wrapper = mount(KnowledgeBaseManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    await wrapper.get('[data-test="knowledge-documents-12"]').trigger('click')
    await wrapper.get('[data-test="knowledge-documents-13"]').trigger('click')

    const newestDocument = { ...textDocument, id: 22, title: '新制度' }
    resolveSecond({ ...documentPage, records: [newestDocument] })
    await flushPromises()
    resolveFirst({ ...documentPage, records: [{ ...textDocument, title: '旧文档' }] })
    await flushPromises()

    expect(wrapper.text()).toContain('新制度')
    expect(wrapper.text()).not.toContain('旧文档')
  })
})
