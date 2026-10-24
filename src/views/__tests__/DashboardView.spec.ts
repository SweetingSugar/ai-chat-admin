import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as dashboardApi from '@/api/dashboard'
import DashboardView from '@/views/DashboardView.vue'

vi.mock('@/api/dashboard', () => ({
  getDashboardOverview: vi.fn(),
  getDashboardTrend: vi.fn(),
}))

vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    dispose: vi.fn(),
    on: vi.fn(),
    resize: vi.fn(),
    setOption: vi.fn(),
  })),
}))

const overview = {
  totalUsers: 12_846,
  enabledUsers: 12_100,
  disabledUsers: 746,
  newUsers: 420,
  activeUsers: 4_200,
  totalSessions: 38_291,
  newSessions: 2_200,
  totalMessages: 180_000,
  userMessages: 90_000,
  assistantMessages: 90_000,
  aiCalls: 96_420,
  successfulAiCalls: 79_055,
  failedAiCalls: 17_365,
  aiSuccessRate: 0.82,
  inputTokens: 3_400_000,
  outputTokens: 5_200_000,
  totalTokens: 8_600_000,
}

const trend = [
  {
    date: '2026-10-24',
    activeUsers: 420,
    newUsers: 35,
    newSessions: 180,
    messages: 900,
    aiCalls: 210,
    successfulAiCalls: 190,
    totalTokens: 24_000,
  },
]

afterEach(() => vi.clearAllMocks())

describe('DashboardView', () => {
  it('starts overview and trend requests together', async () => {
    let resolveOverview!: (value: typeof overview) => void
    let resolveTrend!: (value: typeof trend) => void
    vi.mocked(dashboardApi.getDashboardOverview).mockReturnValue(
      new Promise((resolve) => {
        resolveOverview = resolve
      }),
    )
    vi.mocked(dashboardApi.getDashboardTrend).mockReturnValue(
      new Promise((resolve) => {
        resolveTrend = resolve
      }),
    )

    const wrapper = mount(DashboardView, { global: { plugins: [ElementPlus] } })
    expect(dashboardApi.getDashboardOverview).toHaveBeenCalledOnce()
    expect(dashboardApi.getDashboardTrend).toHaveBeenCalledOnce()

    resolveOverview(overview)
    resolveTrend(trend)
    await flushPromises()

    expect(wrapper.text()).toContain('12,846')
    expect(wrapper.text()).toContain('平台使用趋势')
    wrapper.unmount()
  })

  it('keeps overview metrics when only the trend request fails', async () => {
    vi.mocked(dashboardApi.getDashboardOverview).mockResolvedValue(overview)
    vi.mocked(dashboardApi.getDashboardTrend).mockRejectedValue(new Error('trend unavailable'))

    const wrapper = mount(DashboardView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.text()).toContain('12,846')
    expect(wrapper.text()).toContain('趋势数据加载失败')
    wrapper.unmount()
  })

  it('passes the selected inclusive range to both API wrappers', async () => {
    vi.mocked(dashboardApi.getDashboardOverview).mockResolvedValue(overview)
    vi.mocked(dashboardApi.getDashboardTrend).mockResolvedValue(trend)

    const wrapper = mount(DashboardView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    const datePicker = wrapper.findComponent({ name: 'DateRangePicker' })
    datePicker.vm.$emit('update:modelValue', { from: '2026-10-01', to: '2026-10-24' })
    datePicker.vm.$emit('confirm')
    await flushPromises()

    expect(dashboardApi.getDashboardOverview).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-24' })
    expect(dashboardApi.getDashboardTrend).toHaveBeenLastCalledWith({ from: '2026-10-01', to: '2026-10-24' })
    wrapper.unmount()
  })
})
