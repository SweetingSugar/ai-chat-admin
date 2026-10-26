import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElMessageBox } from 'element-plus'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import UserManagementView from '@/views/system/UserManagementView.vue'
import * as rolesApi from '@/api/roles'
import * as usersApi from '@/api/users'

vi.mock('@/api/users', () => ({
  listUsers: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
  assignUserRoles: vi.fn(),
}))

vi.mock('@/api/roles', () => ({
  listRoles: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    hasPermission: () => true,
  }),
}))

const user = {
  id: 1,
  username: 'alice_01',
  nickname: 'Alice',
  email: 'alice@example.com',
  phone: '13800000000',
  avatar: null,
  status: 1,
  lastLoginTime: '2026-10-24T10:00:00',
  createTime: '2026-10-01T10:00:00',
}

const roles = [
  { id: 2, roleName: '运营人员', roleCode: 'operator', description: null, sort: 10, status: 1, createTime: '2026-10-01T10:00:00', updateTime: '2026-10-01T10:00:00' },
  { id: 3, roleName: '审核人员', roleCode: 'reviewer', description: null, sort: 20, status: 1, createTime: '2026-10-01T10:00:00', updateTime: '2026-10-01T10:00:00' },
]

beforeEach(() => {
  vi.mocked(usersApi.listUsers).mockResolvedValue([user])
  vi.mocked(usersApi.getUser).mockResolvedValue({ ...user, roleIds: [2] })
  vi.mocked(usersApi.updateUser).mockResolvedValue(user)
  vi.mocked(usersApi.updateUserStatus).mockResolvedValue(undefined)
  vi.mocked(usersApi.assignUserRoles).mockResolvedValue(undefined)
  vi.mocked(rolesApi.listRoles).mockResolvedValue(roles)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('UserManagementView', () => {
  it('loads and renders users', async () => {
    const wrapper = mount(UserManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    expect(wrapper.text()).toContain('alice_01')
    expect(wrapper.text()).toContain('Alice')
    wrapper.unmount()
  })

  it('submits edited profile fields', async () => {
    const wrapper = mount(UserManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="user-edit-1"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="user-nickname"]').setValue('Alice Updated')
    await wrapper.find('[data-test="user-edit-submit"]').trigger('click')
    await flushPromises()
    expect(usersApi.updateUser).toHaveBeenCalledWith(1, expect.objectContaining({ nickname: 'Alice Updated' }))
  })

  it('updates a user status from the row switch', async () => {
    const wrapper = mount(UserManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.findComponent({ name: 'ElSwitch' }).vm.$emit('change', false)
    await flushPromises()
    expect(usersApi.updateUserStatus).toHaveBeenCalledWith(1, 0)
  })

  it('confirms before replacing all user roles', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm')
    const wrapper = mount(UserManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="user-assign-roles-1"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="assignment-save"]').trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalledWith(
      '本次保存将替换当前用户的全部角色关联，选择为空将清空全部角色。',
      '确认替换角色关联',
      expect.objectContaining({ type: 'warning' }),
    )
    expect(usersApi.assignUserRoles).toHaveBeenCalledWith(1, [2])
  })

  it('does not replace roles when confirmation is cancelled', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const wrapper = mount(UserManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="user-assign-roles-1"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="assignment-save"]').trigger('click')
    await flushPromises()
    expect(usersApi.assignUserRoles).not.toHaveBeenCalled()
  })
})
