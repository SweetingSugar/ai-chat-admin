import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { deleteFile, getFile, listFiles } from '@/api/files'

const page = {
  records: [],
  total: 0,
  current: 1,
  size: 20,
  pages: 0,
}

afterEach(() => vi.restoreAllMocks())

describe('file API wrappers', () => {
  it('requests an admin file page with all supported filters', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listFiles({
      page: 2,
      size: 50,
      userId: 42,
      originalName: 'report.pdf',
      contentType: 'application/pdf',
      status: 'ACTIVE',
      createdFrom: '2026-10-01',
      createdTo: '2026-10-27',
    })

    expect(apiClient.get).toHaveBeenCalledWith('admin/files', {
      params: {
        page: 2,
        size: 50,
        userId: 42,
        originalName: 'report.pdf',
        contentType: 'application/pdf',
        status: 'ACTIVE',
        createdFrom: '2026-10-01',
        createdTo: '2026-10-27',
      },
    })
  })

  it('maps detail and delete operations to admin file endpoints', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ id: 9 })
    vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

    await getFile(9)
    await deleteFile(9)

    expect(apiClient.get).toHaveBeenCalledWith('admin/files/9')
    expect(apiClient.delete).toHaveBeenCalledWith('admin/files/9')
  })
})
