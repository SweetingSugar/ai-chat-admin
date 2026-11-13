import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import {
  createMcpServer,
  createTool,
  deleteMcpServer,
  deleteTool,
  discoverMcpServer,
  getMcpServer,
  getTool,
  listMcpServers,
  listToolInvocationLogs,
  listTools,
  updateMcpServer,
  updateMcpServerStatus,
  updateTool,
  updateToolStatus,
} from '@/api/tools'

const toolPayload = {
  toolCode: 'weather',
  toolName: 'Weather',
  toolType: 'HTTP' as const,
  authType: 'NONE' as const,
  status: 1 as const,
}

const serverPayload = {
  serverCode: 'maps',
  serverName: 'Maps',
  endpointUrl: 'https://example.com/mcp',
  authType: 'NONE' as const,
  status: 1 as const,
}

afterEach(() => vi.restoreAllMocks())

describe('tool management API wrappers', () => {
  it('maps tool management operations to admin tool endpoints', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([])
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    vi.spyOn(apiClient, 'put').mockResolvedValue({})
    vi.spyOn(apiClient, 'patch').mockResolvedValue({})
    vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

    await listTools()
    await getTool(7)
    await createTool(toolPayload)
    await updateTool(7, toolPayload)
    await deleteTool(7)
    await updateToolStatus(7, 0)

    expect(apiClient.get).toHaveBeenNthCalledWith(1, 'admin/tools')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, 'admin/tools/7')
    expect(apiClient.post).toHaveBeenCalledWith('admin/tools', expect.objectContaining({ toolCode: 'weather' }))
    expect(apiClient.put).toHaveBeenCalledWith('admin/tools/7', expect.objectContaining({ toolCode: 'weather' }))
    expect(apiClient.delete).toHaveBeenCalledWith('admin/tools/7')
    expect(apiClient.patch).toHaveBeenCalledWith('admin/tools/7/status', { status: 0 })
  })

  it('maps MCP server CRUD, discovery, and invocation pagination', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ records: [], total: 0, current: 1, size: 20, pages: 0 })
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    vi.spyOn(apiClient, 'put').mockResolvedValue({})
    vi.spyOn(apiClient, 'patch').mockResolvedValue({})
    vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)

    await listMcpServers()
    await getMcpServer(3)
    await createMcpServer(serverPayload)
    await updateMcpServer(3, serverPayload)
    await deleteMcpServer(3)
    await updateMcpServerStatus(3, 0)
    await discoverMcpServer(3)
    await listToolInvocationLogs({ page: 2, size: 50, toolId: 7, status: 'FAILED' })

    expect(apiClient.get).toHaveBeenNthCalledWith(1, 'admin/tool/mcp-servers')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, 'admin/tool/mcp-servers/3')
    expect(apiClient.post).toHaveBeenNthCalledWith(2, 'admin/tool/mcp-servers/3/discover')
    expect(apiClient.get).toHaveBeenNthCalledWith(3, 'admin/tool/invocation-logs', {
      params: { page: 2, size: 50, toolId: 7, status: 'FAILED' },
    })
  })
})
