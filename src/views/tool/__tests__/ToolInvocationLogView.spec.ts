import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as toolsApi from '@/api/tools'
import ToolInvocationLogView from '@/views/tool/ToolInvocationLogView.vue'

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

const tool = {
  id: 7,
  toolCode: 'weather_query',
  toolName: '天气查询',
  description: null,
  toolType: 'HTTP' as const,
  source: 'MANUAL' as const,
  status: 1 as const,
  availability: 'AVAILABLE' as const,
  mcpServerId: null,
  remoteToolName: null,
  authType: 'NONE' as const,
  authHeaderName: null,
  httpConfig: null,
  inputSchema: null,
  hasCredential: false,
  credentialVersion: null,
  createTime: '2026-11-13T09:00:00',
  updateTime: '2026-11-13T09:00:00',
}

const logPage = {
  records: [
    {
      id: 1,
      requestId: 'request-1',
      toolId: 7,
      toolCode: 'weather_query',
      userId: 9,
      toolType: 'HTTP' as const,
      status: 'SUCCESS' as const,
      durationMs: 184,
      errorCode: null,
      errorMessage: null,
      startTime: '2026-11-13T10:00:00',
      endTime: '2026-11-13T10:00:00',
      createTime: '2026-11-13T10:00:00',
    },
    {
      id: 2,
      requestId: 'request-2',
      toolId: 7,
      toolCode: 'weather_query',
      userId: 9,
      toolType: 'HTTP' as const,
      status: 'FAILED' as const,
      durationMs: 40,
      errorCode: 'TOOL_REMOTE_ERROR',
      errorMessage: 'remote request failed',
      startTime: '2026-11-13T10:01:00',
      endTime: null,
      createTime: '2026-11-13T10:01:00',
    },
  ],
  total: 2,
  current: 1,
  size: 20,
  pages: 1,
}

beforeEach(() => {
  vi.mocked(toolsApi.listTools).mockResolvedValue([tool])
  vi.mocked(toolsApi.listToolInvocationLogs).mockResolvedValue(logPage)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('ToolInvocationLogView', () => {
  it('loads a paginated log page and renders audit fields', async () => {
    const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(toolsApi.listToolInvocationLogs).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('weather_query')
    expect(wrapper.text()).toContain('TOOL_REMOTE_ERROR')
    expect(wrapper.text()).not.toContain('Authorization')
  })

  it('reloads logs with selected tool and status filters', async () => {
    const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    const selects = wrapper.findAllComponents({ name: 'ElSelect' })
    await selects[0].vm.$emit('update:modelValue', 7)
    await selects[0].vm.$emit('change', 7)
    await selects[1].vm.$emit('update:modelValue', 'FAILED')
    await selects[1].vm.$emit('change', 'FAILED')
    await flushPromises()

    expect(toolsApi.listToolInvocationLogs).toHaveBeenLastCalledWith({
      page: 1,
      size: 20,
      toolId: 7,
      status: 'FAILED',
    })
  })

  it('requests a new page and page size from the backend', async () => {
    const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    const pagination = wrapper.findComponent({ name: 'ElPagination' })

    await pagination.vm.$emit('current-change', 2)
    await flushPromises()
    expect(toolsApi.listToolInvocationLogs).toHaveBeenLastCalledWith({ page: 2, size: 20 })

    await pagination.vm.$emit('size-change', 50)
    await flushPromises()
    expect(toolsApi.listToolInvocationLogs).toHaveBeenLastCalledWith({ page: 1, size: 50 })
  })

  it('shows a retry action after a log request fails', async () => {
    vi.mocked(toolsApi.listToolInvocationLogs)
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(logPage)
    const wrapper = mount(ToolInvocationLogView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.text()).toContain('请求失败，请稍后重试')
    await wrapper.get('[data-test="logs-retry"]').trigger('click')
    await flushPromises()
    expect(toolsApi.listToolInvocationLogs).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('weather_query')
  })
})
