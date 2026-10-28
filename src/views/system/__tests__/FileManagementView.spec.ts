import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FileManagementView from '@/views/system/FileManagementView.vue'
import * as filesApi from '@/api/files'

const permissionState = vi.hoisted(() => ({ values: new Set<string>() }))

vi.mock('@/api/files', () => ({
  listFiles: vi.fn(),
  getFile: vi.fn(),
  deleteFile: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) => permissionState.values.has(permission),
  }),
}))

const file = {
  id: 9,
  userId: 42,
  originalName: 'report.pdf',
  contentType: 'application/pdf',
  fileSize: 2048,
  status: 'ACTIVE' as const,
  createTime: '2026-10-27T15:30:00',
  updateTime: '2026-10-27T15:30:00',
}

const page = {
  records: [file],
  total: 1,
  current: 1,
  size: 20,
  pages: 1,
}

beforeEach(() => {
  permissionState.values = new Set(['file:read', 'file:delete'])
  vi.mocked(filesApi.listFiles).mockResolvedValue(page)
  vi.mocked(filesApi.getFile).mockResolvedValue(file)
  vi.mocked(filesApi.deleteFile).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('FileManagementView', () => {
  it('loads and renders the server page', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(filesApi.listFiles).toHaveBeenCalledWith({ page: 1, size: 20 })
    expect(wrapper.text()).toContain('report.pdf')
    expect(wrapper.text()).toContain('application/pdf')
    expect(wrapper.text()).toContain('2.00 KB')
  })

  it('sends all non-empty filters and resets to the first page', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="file-original-name"]').setValue('report.pdf')
    await wrapper.findComponent({ name: 'ElInputNumber' }).vm.$emit('update:modelValue', 42)
    await wrapper.find('[data-test="file-content-type"]').setValue('application/pdf')
    await wrapper.findComponent({ name: 'ElSelect' }).vm.$emit('update:modelValue', 'ACTIVE')
    await wrapper.findComponent({ name: 'ElDatePicker' }).vm.$emit(
      'update:modelValue',
      ['2026-10-01', '2026-10-27'],
    )
    await wrapper.find('[data-test="file-query"]').trigger('click')
    await flushPromises()

    expect(filesApi.listFiles).toHaveBeenLastCalledWith({
      page: 1,
      size: 20,
      userId: 42,
      originalName: 'report.pdf',
      contentType: 'application/pdf',
      status: 'ACTIVE',
      createdFrom: '2026-10-01',
      createdTo: '2026-10-27',
    })

    await wrapper.find('[data-test="file-reset"]').trigger('click')
    await flushPromises()
    expect(filesApi.listFiles).toHaveBeenLastCalledWith({ page: 1, size: 20 })
  })

  it('requests the selected page and page size', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 2)
    await flushPromises()
    expect(filesApi.listFiles).toHaveBeenLastCalledWith({ page: 2, size: 20 })

    await wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('size-change', 50)
    await flushPromises()
    expect(filesApi.listFiles).toHaveBeenLastCalledWith({ page: 1, size: 50 })
  })

  it('keeps the newest list response when requests resolve out of order', async () => {
    let resolveFirst: (value: typeof page) => void = () => undefined
    let resolveSecond: (value: typeof page) => void = () => undefined
    vi.mocked(filesApi.listFiles)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))

    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await wrapper.findComponent({ name: 'ElPagination' }).vm.$emit('current-change', 2)

    const newestPage = {
      ...page,
      current: 2,
      records: [{ ...file, id: 10, originalName: 'new-report.pdf' }],
    }
    resolveSecond(newestPage)
    await flushPromises()
    resolveFirst(page)
    await flushPromises()

    expect(wrapper.find('.file-name').text()).toBe('new-report.pdf')
  })

  it('blocks repeated delete confirmations while the first confirmation is open', async () => {
    let resolveConfirmation: (value: string) => void = () => undefined
    vi.spyOn(ElMessageBox, 'confirm').mockImplementation(
      () => new Promise<string>((resolve) => { resolveConfirmation = resolve }),
    )
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    const deleteButton = wrapper.find('[data-test="file-delete-9"]')

    void deleteButton.trigger('click')
    await flushPromises()
    void deleteButton.trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledOnce()
    resolveConfirmation('confirm')
    await flushPromises()
    expect(filesApi.deleteFile).toHaveBeenCalledOnce()
  })

  it('loads the selected file detail into the drawer', async () => {
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="file-detail-9"]').trigger('click')
    await flushPromises()

    expect(filesApi.getFile).toHaveBeenCalledWith(9)
    expect(wrapper.text()).toContain('文件 ID')
    expect(wrapper.text()).toContain('report.pdf')
  })

  it('requires confirmation before deleting a file', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="file-delete-9"]').trigger('click')
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '删除文件“report.pdf”后不可恢复，是否继续？',
      '确认删除',
      expect.objectContaining({ type: 'warning' }),
    )
    expect(filesApi.deleteFile).toHaveBeenCalledWith(9)
  })

  it('does not delete when confirmation is cancelled', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="file-delete-9"]').trigger('click')
    await flushPromises()

    expect(filesApi.deleteFile).not.toHaveBeenCalled()
  })

  it('hides delete actions without file-delete permission', async () => {
    permissionState.values.delete('file:delete')
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.find('[data-test="file-delete-9"]').exists()).toBe(false)
  })

  it('keeps the list when detail loading fails', async () => {
    vi.mocked(filesApi.getFile).mockRejectedValueOnce(new Error('detail failed'))
    const wrapper = mount(FileManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="file-detail-9"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('report.pdf')
    expect(wrapper.text()).toContain('请求失败，请稍后重试')
  })
})
