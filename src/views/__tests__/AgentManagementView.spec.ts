import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AgentManagementView from '@/views/AgentManagementView.vue'
import * as agentsApi from '@/api/agents'

vi.mock('@/api/agents', () => ({
  listAgents: vi.fn(),
  getAgent: vi.fn(),
}))

const agent = {
  id: 9,
  userId: 100,
  name: '客服 Agent',
  description: '处理客户咨询',
  systemPrompt: '你是一个客服助手。\n请简洁回答。',
  modelId: 30,
  knowledgeBaseIds: [12, 13],
  toolCodes: ['weather', 'search'],
  status: 1 as const,
  createTime: '2026-11-05T10:00:00',
  updateTime: '2026-11-06T11:30:00',
}

const page = {
  records: [agent],
  total: 1,
  current: 1,
  size: 20,
  pages: 1,
}

beforeEach(() => {
  vi.mocked(agentsApi.listAgents).mockResolvedValue(page)
  vi.mocked(agentsApi.getAgent).mockResolvedValue(agent)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('AgentManagementView', () => {
  it('loads and renders the paged agent list', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(agentsApi.listAgents).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('客服 Agent')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('30')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('2026-11-06 11:30:00')
  })

  it('requests the next page and a new page size', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    const pagination = wrapper.findComponent({ name: 'ElPagination' })
    await pagination.vm.$emit('current-change', 2)
    await flushPromises()
    expect(agentsApi.listAgents).toHaveBeenLastCalledWith({ page: 2, size: 20 })

    await pagination.vm.$emit('size-change', 50)
    await flushPromises()
    expect(agentsApi.listAgents).toHaveBeenLastCalledWith({ page: 1, size: 50 })
  })

  it('reloads the current page when refresh is clicked', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    await wrapper.get('[data-test="agents-refresh"]').trigger('click')
    await flushPromises()

    expect(agentsApi.listAgents).toHaveBeenLastCalledWith({ page: 1, size: 20 })
    expect(agentsApi.listAgents).toHaveBeenCalledTimes(2)
  })

  it('opens the detail drawer with the selected agent data', async () => {
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    await wrapper.get('[data-test="agent-detail-9"]').trigger('click')

    expect(wrapper.text()).toContain('你是一个客服助手。')
    expect(wrapper.text()).toContain('12、13')
    expect(wrapper.text()).toContain('weather、search')
    expect(agentsApi.getAgent).not.toHaveBeenCalled()
  })

  it('shows the empty state when the page has no records', async () => {
    vi.mocked(agentsApi.listAgents).mockResolvedValue({
      ...page,
      records: [],
      total: 0,
      pages: 0,
    })
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无 Agent 数据')
  })

  it('shows placeholders when optional values and resource bindings are empty', async () => {
    vi.mocked(agentsApi.listAgents).mockResolvedValue({
      ...page,
      records: [{
        ...agent,
        description: null,
        modelId: null,
        knowledgeBaseIds: [],
        toolCodes: [],
      }],
    })
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    await wrapper.get('[data-test="agent-detail-9"]').trigger('click')

    expect(wrapper.text()).toContain('暂无关联知识库')
    expect(wrapper.text()).toContain('暂无关联工具')
    expect(wrapper.text()).toContain('—')
  })

  it('shows a retry action after list loading fails', async () => {
    vi.mocked(agentsApi.listAgents)
      .mockRejectedValueOnce(new Error('加载失败'))
      .mockResolvedValueOnce(page)
    const wrapper = mount(AgentManagementView, {
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('请求失败，请稍后重试')
    await wrapper.get('[data-test="agents-retry"]').trigger('click')
    await flushPromises()

    expect(agentsApi.listAgents).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('客服 Agent')
  })
})
