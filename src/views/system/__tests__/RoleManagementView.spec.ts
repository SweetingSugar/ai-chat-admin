import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as permissionsApi from '@/api/permissions'
import * as rolesApi from '@/api/roles'
import RoleManagementView from '@/views/system/RoleManagementView.vue'

vi.mock('@/api/roles', () => ({
  listRoles: vi.fn(),
  getRole: vi.fn(),
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  assignRolePermissions: vi.fn(),
}))

vi.mock('@/api/permissions', () => ({
  listPermissions: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
  }),
}))

const role = {
  id: 8,
  roleName: '运营人员',
  roleCode: 'operator',
  description: '运营后台角色',
  sort: 10,
  status: 1,
  createTime: '2026-10-01T10:00:00',
  updateTime: '2026-10-01T10:00:00',
}

const permissions = [
  { id: 11, parentId: 0, permissionName: '用户查看', permissionCode: 'system:user:read', permissionType: 3, path: null, component: null, icon: null, sort: 1, status: 1, createTime: '2026-10-01T10:00:00', updateTime: '2026-10-01T10:00:00' },
  { id: 12, parentId: 0, permissionName: '用户更新', permissionCode: 'system:user:update', permissionType: 3, path: null, component: null, icon: null, sort: 2, status: 1, createTime: '2026-10-01T10:00:00', updateTime: '2026-10-01T10:00:00' },
]

beforeEach(() => {
  vi.mocked(rolesApi.listRoles).mockResolvedValue([role])
  vi.mocked(rolesApi.getRole).mockResolvedValue({ ...role, permissionIds: [11, 12] })
  vi.mocked(rolesApi.createRole).mockResolvedValue(role)
  vi.mocked(rolesApi.updateRole).mockResolvedValue(role)
  vi.mocked(rolesApi.deleteRole).mockResolvedValue(undefined)
  vi.mocked(rolesApi.assignRolePermissions).mockResolvedValue(undefined)
  vi.mocked(permissionsApi.listPermissions).mockResolvedValue(permissions)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('RoleManagementView', () => {
  it('loads and renders roles', async () => {
    const wrapper = mount(RoleManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('运营人员')
    expect(wrapper.text()).toContain('operator')
    wrapper.unmount()
  })

  it('submits a new role payload', async () => {
    const wrapper = mount(RoleManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="role-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="role-name"]').setValue('运营人员')
    await wrapper.find('[data-test="role-code"]').setValue('operator')
    await wrapper.find('[data-test="role-submit"]').trigger('click')
    await flushPromises()
    expect(rolesApi.createRole).toHaveBeenCalledWith(expect.objectContaining({ roleName: '运营人员', roleCode: 'operator', sort: 0, status: 1 }))
  })

  it('confirms before deleting a role', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const wrapper = mount(RoleManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="role-delete-8"]').trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(rolesApi.deleteRole).not.toHaveBeenCalled()
  })

  it('confirms before replacing all role permissions', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
    const wrapper = mount(RoleManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="role-assign-permissions-8"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="assignment-save"]').trigger('click')
    await flushPromises()
    expect(rolesApi.assignRolePermissions).toHaveBeenCalledWith(8, [11, 12])
  })
})
