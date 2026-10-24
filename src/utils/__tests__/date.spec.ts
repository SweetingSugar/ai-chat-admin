import { describe, expect, it } from 'vitest'
import { getDefaultDateRange, toBackendDateRange, validateDateRange } from '@/utils/date'

it('converts an inclusive UI range to the backend half-open range', () => {
  expect(toBackendDateRange({ from: '2026-10-01', to: '2026-10-24' }))
    .toEqual({ from: '2026-10-01', to: '2026-10-25' })
})

it('returns a 30-calendar-day inclusive range', () => {
  expect(getDefaultDateRange(new Date(2026, 9, 24)))
    .toEqual({ from: '2026-09-25', to: '2026-10-24' })
})

describe('validateDateRange', () => {
  it('rejects a reversed range', () => {
    expect(validateDateRange({ from: '2026-10-24', to: '2026-10-01' })).toBe('日期范围必须有效')
  })

  it('rejects more than 365 inclusive days', () => {
    expect(validateDateRange({ from: '2025-10-23', to: '2026-10-24' })).toBe('日期范围不能超过 365 天')
  })

  it('accepts the maximum 365 inclusive days', () => {
    expect(validateDateRange({ from: '2025-10-25', to: '2026-10-24' })).toBeNull()
  })
})
