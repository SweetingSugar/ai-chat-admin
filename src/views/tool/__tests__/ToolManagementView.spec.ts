import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessage, ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as toolsApi from '@/api/tools'
import ToolManagementView from '@/views/tool/ToolManagementView.vue'

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

const httpTool = {
  id: 1,
  toolCode: 'weather_query',
  toolName: '天气查询',
  description: '查询天气',
  toolType: 'HTTP' as const,
  source: 'MANUAL' as const,
  status: 1 as const,
  availability: 'AVAILABLE' as const,
  mcpServerId: null,
  remoteToolName: null,
  authType: 'API_KEY' as const,
  authHeaderName: 'X-Api-Key',
  httpConfig: {
    url: 'https://example.com/weather',
    method: 'GET' as const,
    headers: { Accept: 'application/json' },
    queryParams: { city: '{{city}}' },
    bodyTemplate: null,
  },
  inputSchema: null,
  hasCredential: true,
  credentialVersion: 1,
  createTime: '2026-11-13T10:00:00',
  updateTime: '2026-11-13T10:00:00',
}

const discoveredTool = {
  id: 2,
  toolCode: 'remote_search',
  toolName: '远程搜索',
  description: '远程搜索工具',
  toolType: 'MCP' as const,
  source: 'DISCOVERED' as const,
  status: 0 as const,
  availability: 'AVAILABLE' as const,
  mcpServerId: 3,
  remoteToolName: 'search',
  authType: 'NONE' as const,
  authHeaderName: null,
  httpConfig: null,
  inputSchema: { title: 'SearchInput', type: 'object' },
  hasCredential: false,
  credentialVersion: null,
  createTime: '2026-11-13T10:00:00',
  updateTime: '2026-11-13T10:00:00',
}

beforeEach(() => {
  vi.mocked(toolsApi.listTools).mockResolvedValue([httpTool, discoveredTool])
  vi.mocked(toolsApi.createTool).mockResolvedValue(httpTool)
  vi.mocked(toolsApi.updateTool).mockResolvedValue(httpTool)
  vi.mocked(toolsApi.deleteTool).mockResolvedValue(undefined)
  vi.mocked(toolsApi.updateToolStatus).mockResolvedValue({ ...httpTool, status: 0 })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('ToolManagementView', () => {
  it('loads and filters tools by keyword and type', async () => {
    const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(toolsApi.listTools).toHaveBeenCalledWith()
    expect(wrapper.text()).toContain('天气查询')
    expect(wrapper.text()).toContain('远程搜索')

    await wrapper.get('input[placeholder="搜索工具名称或编码"]').setValue('天气')
    expect(wrapper.text()).toContain('天气查询')
    expect(wrapper.text()).not.toContain('远程搜索')
  })

  it('submits an HTTP tool with parsed JSON configuration', async () => {
    const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.get('[data-test="tool-create"]').trigger('click')

    await wrapper.get('[data-test="tool-code"]').setValue('weather_query')
    await wrapper.get('[data-test="tool-name"]').setValue('天气查询')
    await wrapper.get('[data-test="tool-url"]').setValue('https://example.com/weather')
    await wrapper.get('[data-test="tool-headers"]').setValue('{"Accept":"application/json"}')
    await wrapper.get('[data-test="tool-query-params"]').setValue('{"city":"{{city}}"}')
    await wrapper.get('[data-test="tool-body-template"]').setValue('')
    await wrapper.get('[data-test="tool-auth-type"]').trigger('click')
    const authSelect = wrapper.get('[data-test="tool-auth-type"] input[role="combobox"]')
    const authDropdownId = authSelect.attributes('aria-controls')
    const authOption = Array.from(document.getElementById(authDropdownId)?.querySelectorAll<HTMLElement>('.el-select-dropdown__item') ?? [])
      .find((item) => item.textContent?.trim() === 'API Key')
    authOption?.click()
    await flushPromises()
    await wrapper.get('[data-test="tool-credential"]').setValue('secret')
    await wrapper.get('[data-test="tool-submit"]').trigger('click')
    await flushPromises()

    expect(toolsApi.createTool).toHaveBeenCalledWith(expect.objectContaining({
      toolCode: 'weather_query',
      toolType: 'HTTP',
      httpConfig: expect.objectContaining({
        url: 'https://example.com/weather',
        headers: { Accept: 'application/json' },
        queryParams: { city: '{{city}}' },
      }),
      credential: 'secret',
    }))
  })

  it('blocks submission when a JSON field is invalid', async () => {
    const warning = vi.spyOn(ElMessage, 'warning')
    const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.get('[data-test="tool-create"]').trigger('click')
    await wrapper.get('[data-test="tool-code"]').setValue('weather_query')
    await wrapper.get('[data-test="tool-name"]').setValue('天气查询')
    await wrapper.get('[data-test="tool-url"]').setValue('https://example.com/weather')
    await wrapper.get('[data-test="tool-headers"]').setValue('{invalid')
    await wrapper.get('[data-test="tool-submit"]').trigger('click')
    await flushPromises()

    expect(toolsApi.createTool).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith('Headers JSON 格式不正确')
  })

  it('does not offer edit for discovered MCP tools and shows their schema', async () => {
    const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.find('[data-test="tool-edit-2"]').exists()).toBe(false)
    await wrapper.get('[data-test="tool-detail-2"]').trigger('click')
    expect(wrapper.text()).toContain('远程搜索')
    expect(wrapper.text()).toContain('SearchInput')
  })

  it('updates status and deletes an HTTP tool after confirmation', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as never)
    const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.get('[data-test="tool-status-1"]').trigger('click')
    await flushPromises()
    expect(toolsApi.updateToolStatus).toHaveBeenCalledWith(1, 0)

    await wrapper.get('[data-test="tool-delete-1"]').trigger('click')
    await flushPromises()
    expect(toolsApi.deleteTool).toHaveBeenCalledWith(1)
  })

  it('does not render credential values from the API response', async () => {
    const wrapper = mount(ToolManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).not.toContain('secret')
    expect(wrapper.text()).toContain('已配置')
  })
})
