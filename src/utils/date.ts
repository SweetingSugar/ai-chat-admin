import type { DateRange } from '@/types/dashboard'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY_MS = 24 * 60 * 60 * 1000

function parseDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value: string, days: number): string {
  const date = parseDate(value)
  if (!date) return value
  date.setUTCDate(date.getUTCDate() + days)
  return formatDate(date)
}

export function getDefaultDateRange(today: Date): DateRange {
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 29)
  return { from: formatDate(start), to: formatDate(end) }
}

export function toBackendDateRange(range: DateRange): DateRange {
  return { from: range.from, to: addDays(range.to, 1) }
}

export function validateDateRange(range: DateRange): string | null {
  const from = parseDate(range.from)
  const to = parseDate(range.to)
  if (!from || !to || to.getTime() < from.getTime()) return '日期范围必须有效'

  const inclusiveDays = Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1
  if (inclusiveDays > 365) return '日期范围不能超过 365 天'
  return null
}
