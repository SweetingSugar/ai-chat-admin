import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as permissionsApi from '@/api/permissions'
import PermissionManagementView from '@/views/system/PermissionManagementView.vue'

vi.mock('@/api/permissions', () => ({
  listPermissions: vi.fn(),
  getPermission: vi.fn(),
  createPermission: vi.fn(),
  updatePermission: vi.fn(),
  deletePermission: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
  }),
}))

const permission = {
  id: 11,
  parentId: 0,
  permissionName: '用户查看',
  permissionCode: 'system:user:read',
  permissionType: 3,
  path: null,
  component: null,
  icon: null,
  sort: 1,
  status: 1,
  createTime: '2026-10-01T10:00:00',
  updateTime: '2026-10-01T10:00:00',
}

beforeEach(() => {
  vi.mocked(permissionsApi.listPermissions).mockResolvedValue([permission, {
    ...permission,
    id: 12,
    permissionName: '角色分配',
    permissionCode: 'system:user:assign-role',
    sort: 2,
  }])
  vi.mocked(permissionsApi.getPermission).mockResolvedValue(permission)
  vi.mocked(permissionsApi.createPermission).mockResolvedValue(permission)
  vi.mocked(permissionsApi.updatePermission).mockResolvedValue(permission)
  vi.mocked(permissionsApi.deletePermission).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('PermissionManagementView', () => {
  it('loads permissions and filters by code', async () => {
    const wrapper = mount(PermissionManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('system:user:read')
    await wrapper.find('input[placeholder="搜索权限名称或编码"]').setValue('assign-role')
    expect(wrapper.text()).toContain('角色分配')
    expect(wrapper.text()).not.toContain('用户查看')
  })

  it('submits a new button permission with numeric defaults', async () => {
    const wrapper = mount(PermissionManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="permission-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="permission-name"]').setValue('用户查看')
    await wrapper.find('[data-test="permission-submit"]').trigger('click')
    await flushPromises()
    expect(permissionsApi.createPermission).toHaveBeenCalledWith(expect.objectContaining({ permissionType: 3, parentId: 0, status: 1 }))
  })

  it('confirms before deleting a permission', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const wrapper = mount(PermissionManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="permission-delete-11"]').trigger('click')
    await flushPromises()
    expect(permissionsApi.deletePermission).not.toHaveBeenCalled()
  })

  it('keeps edit and delete actions in a wide operation column', async () => {
    const wrapper = mount(PermissionManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    const actionColumns = wrapper.findAll('col').filter((column) => column.attributes('width') === '180')
    expect(actionColumns).toHaveLength(2)
  })
})
