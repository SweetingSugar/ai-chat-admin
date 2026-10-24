import { afterEach, expect, it, vi } from 'vitest'
import type { DashboardOverview } from '@/types/dashboard'
import { apiClient } from '@/api/client'
import { getDashboardOverview } from '@/api/dashboard'

afterEach(() => vi.restoreAllMocks())

it('sends the inclusive UI range as a half-open query range', async () => {
  const range = { from: '2026-10-01', to: '2026-10-24' }
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({} as DashboardOverview)

  await getDashboardOverview(range)

  expect(get).toHaveBeenCalledWith('admin/dashboard/overview', {
    params: { from: '2026-10-01', to: '2026-10-25' },
  })
  expect(range).toEqual({ from: '2026-10-01', to: '2026-10-24' })
})
