import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { assignUserRoles, getUser, listUsers, updateUserStatus } from '@/api/users'
import { assignRolePermissions, createRole, deleteRole } from '@/api/roles'
import { createProvider, updateModel } from '@/api/ai-config'

afterEach(() => vi.restoreAllMocks())

describe('management API wrappers', () => {
  it('reads users and user detail from system endpoints', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([])
    await listUsers()
    await getUser(7)
    expect(apiClient.get).toHaveBeenNthCalledWith(1, 'system/users')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, 'system/users/7')
  })

  it('uses PATCH for status and PUT for full role replacement', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined)
    vi.spyOn(apiClient, 'put').mockResolvedValue(undefined)
    await updateUserStatus(7, 0)
    await assignUserRoles(7, [2, 4])
    expect(apiClient.patch).toHaveBeenCalledWith('system/users/7/status', { status: 0 })
    expect(apiClient.put).toHaveBeenCalledWith('system/users/7/roles', { ids: [2, 4] })
  })

  it('maps role and AI provider/model operations to their endpoints', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)
    vi.spyOn(apiClient, 'put').mockResolvedValue({})
    await createRole({ roleName: '运营', roleCode: 'operator' })
    await deleteRole(3)
    await createProvider({
      providerCode: 'deepseek',
      providerName: 'DeepSeek',
      providerType: 'DEEPSEEK',
      baseUrl: 'https://api.deepseek.com',
      apiKey: 'secret',
    })
    await updateModel(9, {
      providerId: 1,
      modelCode: 'deepseek-chat',
      modelName: 'DeepSeek Chat',
      modelType: 'chat',
    })
    expect(apiClient.post).toHaveBeenCalledWith('system/roles', { roleName: '运营', roleCode: 'operator' })
    expect(apiClient.delete).toHaveBeenCalledWith('system/roles/3')
    expect(apiClient.post).toHaveBeenCalledWith(
      'admin/ai/providers',
      expect.objectContaining({ providerCode: 'deepseek' }),
    )
    expect(apiClient.put).toHaveBeenCalledWith(
      'admin/ai/models/9',
      expect.objectContaining({ modelCode: 'deepseek-chat' }),
    )
  })

  it('assigns permissions with the role endpoint', async () => {
    vi.spyOn(apiClient, 'put').mockResolvedValue(undefined)
    await assignRolePermissions(8, [11, 12])
    expect(apiClient.put).toHaveBeenCalledWith('system/roles/8/permissions', { ids: [11, 12] })
  })
})
