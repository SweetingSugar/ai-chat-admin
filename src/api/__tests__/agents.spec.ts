import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { getAgent, listAgents } from '@/api/agents'

const page = {
  records: [],
  total: 0,
  current: 1,
  size: 20,
  pages: 0,
}

afterEach(() => vi.restoreAllMocks())

describe('agent management API wrappers', () => {
  it('requests the administrator agent page with pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(page)

    await listAgents({ page: 2, size: 50 })

    expect(apiClient.get).toHaveBeenCalledWith('admin/agents', {
      params: { page: 2, size: 50 },
    })
  })

  it('requests one administrator agent by id', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ id: 9 })

    await getAgent(9)

    expect(apiClient.get).toHaveBeenCalledWith('admin/agents/9')
  })
})
