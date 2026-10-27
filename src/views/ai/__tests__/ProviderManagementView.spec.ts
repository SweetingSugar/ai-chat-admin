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
  it('shows Ollama in the provider type filter', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[aria-label="供应商类型筛选"]').trigger('click')
    const selectInput = wrapper.find('[aria-label="供应商类型筛选"]')
    const dropdownId = selectInput.attributes('aria-controls')
    expect(document.getElementById(dropdownId)?.textContent).toContain('Ollama')
    await wrapper.find('[aria-label="供应商类型筛选"]').trigger('click')
    wrapper.unmount()
  })

  it('shows Ollama in the provider form type selector', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-type"]').trigger('click')
    const selectInput = wrapper.find('[data-test="provider-type"] input[role="combobox"]')
    const dropdownId = selectInput.attributes('aria-controls')
    expect(document.getElementById(dropdownId)?.textContent).toContain('Ollama')
    await wrapper.find('[data-test="provider-type"]').trigger('click')
    wrapper.unmount()
  })

  it('allows creating an Ollama provider without an API key', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-code"]').setValue('ollama')
    await wrapper.find('[data-test="provider-name"]').setValue('Ollama')
    await wrapper.find('[data-test="provider-base-url"]').setValue('http://localhost:11434')
    await wrapper.find('[data-test="provider-type"]').trigger('click')
    const selectInput = wrapper.find('[data-test="provider-type"] input[role="combobox"]')
    const dropdownId = selectInput.attributes('aria-controls')
    const option = Array.from(document.getElementById(dropdownId)?.querySelectorAll<HTMLElement>('.el-select-dropdown__item') ?? [])
      .find((item) => item.textContent?.trim() === 'Ollama')
    expect(option).toBeDefined()
    option?.click()
    await flushPromises()
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.createProvider).toHaveBeenCalledWith(expect.objectContaining({
      providerCode: 'ollama',
      providerType: 'OLLAMA',
      baseUrl: 'http://localhost:11434',
      apiKey: '',
    }))
    wrapper.unmount()
  })

  it('rejects a blank API key for a non-Ollama provider', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-code"]').setValue('deepseek')
    await wrapper.find('[data-test="provider-name"]').setValue('DeepSeek')
    await wrapper.find('[data-test="provider-base-url"]').setValue('https://api.deepseek.com')
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.createProvider).not.toHaveBeenCalled()
    wrapper.unmount()
  })

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

  it('uses the new timeout defaults when creating a provider', async () => {
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

    expect(aiApi.createProvider).toHaveBeenCalledWith(expect.objectContaining({
      connectTimeout: 10000,
      readTimeout: 120000,
    }))
    wrapper.unmount()
  })

  it('uses the new timeout defaults when editing a provider with empty timeouts', async () => {
    const providerWithoutTimeouts = { ...provider, connectTimeout: null, readTimeout: null }
    vi.mocked(aiApi.listProviders).mockResolvedValue([providerWithoutTimeouts])

    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-edit-2"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.updateProvider).toHaveBeenCalledWith(2, expect.objectContaining({
      connectTimeout: 10000,
      readTimeout: 120000,
    }))
    wrapper.unmount()
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
