import { expect, it, vi } from 'vitest'
import { createApiClient } from '@/api/client'

it('uses the token name returned by login', async () => {
  let requestHeaders: Record<string, unknown> = {}
  const client = createApiClient({
    readToken: () => ({ tokenName: 'x-auth', tokenValue: 'secret' }),
    onUnauthorized: vi.fn(),
  })
  client.defaults.adapter = async (config) => {
    requestHeaders = Object.fromEntries(Object.entries(config.headers ?? {}))
    return {
      data: { success: true, code: 'SUCCESS', message: 'OK', data: { id: 1 } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  await expect(client.get('/auth/me')).resolves.toEqual({ id: 1 })
  expect(requestHeaders['x-auth']).toBe('secret')
})

it('raises an ApiError for a business failure', async () => {
  const client = createApiClient({ readToken: () => null, onUnauthorized: vi.fn() })
  client.defaults.adapter = async (config) => ({
    data: { success: false, code: 'VALIDATION_ERROR', message: '日期无效', data: null },
    status: 400,
    statusText: 'Bad Request',
    headers: {},
    config,
  })
  await expect(client.get('/admin/dashboard/overview')).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
    message: '日期无效',
  })
})

it('supports PUT, PATCH, and DELETE responses', async () => {
  const client = createApiClient({ readToken: () => null, onUnauthorized: vi.fn() })
  const requests: Array<{ method?: string; data?: unknown }> = []
  client.defaults.adapter = async (config) => {
    requests.push({ method: config.method, data: config.data })
    return {
      data: { success: true, code: 'SUCCESS', message: 'OK', data: { ok: true } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  await expect(client.put('/system/roles/1', { roleName: '运营' })).resolves.toEqual({ ok: true })
  await expect(client.patch('/system/users/1/status', { status: 0 })).resolves.toEqual({ ok: true })
  await expect(client.delete('/system/roles/1')).resolves.toEqual({ ok: true })

  expect(requests.map(({ method }) => method)).toEqual(['put', 'patch', 'delete'])
  expect(JSON.parse(String(requests[0]?.data))).toEqual({ roleName: '运营' })
  expect(JSON.parse(String(requests[1]?.data))).toEqual({ status: 0 })
})

it('clears authentication through the callback on 401', async () => {
  const onUnauthorized = vi.fn()
  const client = createApiClient({ readToken: () => null, onUnauthorized })
  client.defaults.adapter = async (config) => ({
    data: { success: false, code: 'UNAUTHENTICATED', message: '登录已过期', data: null },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  })
  await expect(client.get('/auth/me')).rejects.toMatchObject({
    status: 401,
    code: 'UNAUTHENTICATED',
  })
  expect(onUnauthorized).toHaveBeenCalledOnce()
})
