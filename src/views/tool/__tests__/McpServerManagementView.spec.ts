import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessage, ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as toolsApi from '@/api/tools'
import McpServerManagementView from '@/views/tool/McpServerManagementView.vue'

vi.mock('@/api/tools', () => ({
  listTools: vi.fn(),
  getTool: vi.fn(),
  createTool: vi.fn(),
  updateTool: vi.fn(),
  deleteTool: vi.fn(),
  updateToolStatus: vi.fn(),
  listMcpServers: vi.fn(),
  getMcpServer: vi.fn(),
  createMcpServer: vi.fn(),
  updateMcpServer: vi.fn(),
  deleteMcpServer: vi.fn(),
  updateMcpServerStatus: vi.fn(),
  discoverMcpServer: vi.fn(),
  listToolInvocationLogs: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
  }),
}))

const server = {
  id: 3,
  serverCode: 'maps',
  serverName: '地图服务',
  endpointUrl: 'https://example.com/mcp',
  authType: 'BEARER' as const,
  connectTimeout: 20,
  readTimeout: 90,
  status: 1 as const,
  hasCredential: true,
  credentialVersion: 2,
  lastDiscoveryTime: '2026-11-13T10:00:00',
  lastDiscoveryStatus: 'SUCCESS' as const,
  lastDiscoveryError: null,
  createTime: '2026-11-13T09:00:00',
  updateTime: '2026-11-13T10:00:00',
}

beforeEach(() => {
  vi.mocked(toolsApi.listMcpServers).mockResolvedValue([server])
  vi.mocked(toolsApi.createMcpServer).mockResolvedValue(server)
  vi.mocked(toolsApi.updateMcpServer).mockResolvedValue(server)
  vi.mocked(toolsApi.deleteMcpServer).mockResolvedValue(undefined)
  vi.mocked(toolsApi.updateMcpServerStatus).mockResolvedValue({ ...server, status: 0 })
  vi.mocked(toolsApi.discoverMcpServer).mockResolvedValue({
    serverId: 3,
    discovered: 2,
    created: 1,
    updated: 1,
    stale: 0,
    tools: [],
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('McpServerManagementView', () => {
  it('loads and renders MCP servers with credential status', async () => {
    const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(toolsApi.listMcpServers).toHaveBeenCalledWith()
    expect(wrapper.text()).toContain('地图服务')
    expect(wrapper.text()).toContain('已配置')
    expect(wrapper.text()).not.toContain('secret')
  })

  it('creates an MCP server with parsed secret headers and timeout fields', async () => {
    const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.get('[data-test="mcp-server-create"]').trigger('click')

    await wrapper.get('[data-test="mcp-server-code"]').setValue('maps')
    await wrapper.get('[data-test="mcp-server-name"]').setValue('地图服务')
    await wrapper.get('[data-test="mcp-server-endpoint"]').setValue('https://example.com/mcp')
    await wrapper.get('[data-test="mcp-server-secret-headers"]').setValue('{"X-Tenant":"demo"}')
    await wrapper.get('[data-test="mcp-server-connect-timeout"] input').setValue('20')
    await wrapper.get('[data-test="mcp-server-read-timeout"] input').setValue('90')
    await wrapper.get('[data-test="mcp-server-submit"]').trigger('click')
    await flushPromises()

    expect(toolsApi.createMcpServer).toHaveBeenCalledWith(expect.objectContaining({
      serverCode: 'maps',
      endpointUrl: 'https://example.com/mcp',
      secretHeaders: { 'X-Tenant': 'demo' },
      connectTimeout: 20,
      readTimeout: 90,
    }))
  })

  it('preserves an existing credential when editing with an empty credential', async () => {
    const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.get('[data-test="mcp-server-edit-3"]').trigger('click')
    await wrapper.get('[data-test="mcp-server-submit"]').trigger('click')
    await flushPromises()

    expect(toolsApi.updateMcpServer).toHaveBeenCalledWith(3, expect.not.objectContaining({ credential: expect.any(String) }))
  })

  it('discovers tools and shows the synchronization counts', async () => {
    const success = vi.spyOn(ElMessage, 'success')
    const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.get('[data-test="mcp-server-discover-3"]').trigger('click')
    await flushPromises()

    expect(toolsApi.discoverMcpServer).toHaveBeenCalledWith(3)
    expect(success).toHaveBeenCalledWith('发现 2，新增 1，更新 1，过期 0')
    expect(toolsApi.listMcpServers).toHaveBeenCalledTimes(2)
  })

  it('does not submit invalid Secret Headers JSON', async () => {
    const warning = vi.spyOn(ElMessage, 'warning')
    const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.get('[data-test="mcp-server-create"]').trigger('click')
    await wrapper.get('[data-test="mcp-server-secret-headers"]').setValue('{invalid')
    await wrapper.get('[data-test="mcp-server-submit"]').trigger('click')
    await flushPromises()

    expect(toolsApi.createMcpServer).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith('Secret Headers JSON 格式不正确')
  })

  it('updates status and deletes a server after confirmation', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
    const wrapper = mount(McpServerManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.get('[data-test="mcp-server-status-3"]').trigger('click')
    await flushPromises()
    expect(toolsApi.updateMcpServerStatus).toHaveBeenCalledWith(3, 0)

    await wrapper.get('[data-test="mcp-server-delete-3"]').trigger('click')
    await flushPromises()
    expect(toolsApi.deleteMcpServer).toHaveBeenCalledWith(3)
  })
})
