import { apiClient } from '@/api/client'
import { toBackendDateRange } from '@/utils/date'
import type { DateRange, DashboardOverview, DashboardTrendItem } from '@/types/dashboard'

export function getDashboardOverview(range: DateRange): Promise<DashboardOverview> {
  return apiClient.get<DashboardOverview>('admin/dashboard/overview', {
    params: toBackendDateRange(range),
  })
}

export function getDashboardTrend(range: DateRange): Promise<DashboardTrendItem[]> {
  return apiClient.get<DashboardTrendItem[]>('admin/dashboard/trend', {
    params: toBackendDateRange(range),
  })
}
