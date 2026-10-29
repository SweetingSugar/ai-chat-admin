import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as aiApi from '@/api/ai-config'
import ModelManagementView from '@/views/ai/ModelManagementView.vue'

vi.mock('@/api/ai-config', () => ({
  listModels: vi.fn(),
  getModel: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  listProviders: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
  }),
}))

const provider = {
  id: 1,
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

const disabledProvider = { ...provider, id: 2, providerCode: 'offline', providerName: '停用供应商', status: 0 }
const model = {
  id: 4,
  providerId: 1,
  providerName: 'DeepSeek',
  modelCode: 'deepseek-chat',
  modelName: 'DeepSeek Chat',
  modelType: 'chat',
  contextWindow: 65536,
  maxOutputTokens: 4096,
  temperature: 0.7,
  topP: 0.9,
  supportStream: true,
  supportVision: false,
  defaultModel: false,
  configVersion: 1,
  status: 1,
  sort: 0,
  remark: null,
}

beforeEach(() => {
  vi.mocked(aiApi.listModels).mockResolvedValue([model])
  vi.mocked(aiApi.getModel).mockResolvedValue(model)
  vi.mocked(aiApi.createModel).mockResolvedValue(model)
  vi.mocked(aiApi.updateModel).mockResolvedValue(model)
  vi.mocked(aiApi.deleteModel).mockResolvedValue(undefined)
  vi.mocked(aiApi.listProviders).mockResolvedValue([provider, disabledProvider])
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('ModelManagementView', () => {
  it('loads models and providers together', async () => {
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('deepseek-chat')
    expect(wrapper.text()).toContain('DeepSeek')
  })

  it('shows the visual capability tag for vision models', async () => {
    vi.mocked(aiApi.listModels).mockResolvedValueOnce([{ ...model, supportVision: true }])
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.text()).toContain('视觉')
  })

  it('hydrates visual capability and submits binary values for disabled and enabled models', async () => {
    vi.mocked(aiApi.listModels).mockResolvedValueOnce([{ ...model, supportVision: true }])
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="model-edit-4"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="model-vision"] input').attributes('aria-checked')).toBe('true')

    await wrapper.find('[data-test="model-vision"]').trigger('click')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.updateModel).toHaveBeenCalledWith(4, expect.objectContaining({
      supportVision: 0,
    }))

    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-vision"]').trigger('click')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({
      supportVision: 1,
    }))
  })

  it('submits CHAT as the default model type when creating a model', async () => {
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-code"]').setValue('deepseek-chat')
    await wrapper.find('[data-test="model-name"]').setValue('DeepSeek Chat')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 1,
      modelType: 'CHAT',
      supportStream: 1,
      supportVision: 0,
      isDefault: 0,
      status: 1,
    }))
  })

  it('keeps the model list when provider access is denied', async () => {
    vi.mocked(aiApi.listProviders).mockRejectedValue(new Error('provider access denied'))
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('deepseek-chat')
  })

  it('shows disabled providers in the model form', async () => {
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-provider"]').trigger('click')
    await flushPromises()
    expect(document.body.textContent).toContain('停用供应商（已停用）')
  })

  it('does not close a newly opened form when an earlier save resolves', async () => {
    let resolveCreate: (value: typeof model) => void = () => undefined
    vi.mocked(aiApi.createModel).mockImplementationOnce(() => new Promise((resolve) => {
      resolveCreate = resolve
    }))
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-code"]').setValue('first-model')
    await wrapper.find('[data-test="model-name"]').setValue('First Model')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await wrapper.find('.el-drawer__close-btn').trigger('click')
    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    resolveCreate(model)
    await flushPromises()
    expect((wrapper.vm as unknown as { formVisible: boolean }).formVisible).toBe(true)
  })

  it('confirms before deleting a model', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="model-delete-4"]').trigger('click')
    await flushPromises()
    expect(aiApi.deleteModel).not.toHaveBeenCalled()
  })

  it('keeps edit and delete actions in a wide operation column', async () => {
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    const actionColumns = wrapper.findAll('col').filter((column) => column.attributes('width') === '180')
    expect(actionColumns).toHaveLength(2)
  })
})
