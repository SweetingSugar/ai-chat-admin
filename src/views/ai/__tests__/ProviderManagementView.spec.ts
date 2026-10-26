import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as aiApi from '@/api/ai-config'
import ProviderManagementView from '@/views/ai/ProviderManagementView.vue'

vi.mock('@/api/ai-config', () => ({
  listProviders: vi.fn(),
  getProvider: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
  }),
}))

const provider = {
  id: 2,
  providerCode: 'deepseek',
  providerName: 'DeepSeek',
  providerType: 'DEEPSEEK' as const,
  baseUrl: 'https://api.deepseek.com',
  connectTimeout: 10,
  readTimeout: 60,
  status: 1,
  hasApiKey: true,
  credentialVersion: 1,
  sort: 0,
  remark: null,
}

beforeEach(() => {
  vi.mocked(aiApi.listProviders).mockResolvedValue([provider])
  vi.mocked(aiApi.getProvider).mockResolvedValue(provider)
  vi.mocked(aiApi.createProvider).mockResolvedValue(provider)
  vi.mocked(aiApi.updateProvider).mockResolvedValue(provider)
  vi.mocked(aiApi.deleteProvider).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('ProviderManagementView', () => {
  it('loads provider data without rendering the API key', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('DeepSeek')
    expect(wrapper.text()).toContain('已配置')
    expect(wrapper.text()).not.toContain('sk-')
  })

  it('requires and submits a new API key', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-code"]').setValue('deepseek')
    await wrapper.find('[data-test="provider-name"]').setValue('DeepSeek')
    await wrapper.find('[data-test="provider-base-url"]').setValue('https://api.deepseek.com')
    await wrapper.find('[data-test="provider-api-key"]').setValue('sk-new')
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.createProvider).toHaveBeenCalledWith(expect.objectContaining({ providerType: 'DEEPSEEK', apiKey: 'sk-new' }))
  })

  it('omits a blank API key when editing an existing provider', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-edit-2"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.updateProvider).toHaveBeenCalledWith(2, expect.not.objectContaining({ apiKey: expect.any(String) }))
  })

  it('does not delete a provider when confirmation is cancelled', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-delete-2"]').trigger('click')
    await flushPromises()
    expect(aiApi.deleteProvider).not.toHaveBeenCalled()
  })
})
