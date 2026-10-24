import { expect, it } from 'vitest'
import { hasAnyPermission, hasPermission } from '@/utils/permission'

it('matches an exact permission code', () => {
  expect(hasPermission(['admin:dashboard:read'], 'admin:dashboard:read')).toBe(true)
  expect(hasPermission([], 'admin:dashboard:read')).toBe(false)
})

it('requires every code when checking a list', () => {
  expect(hasPermission(['a', 'b'], ['a', 'b'])).toBe(true)
  expect(hasPermission(['a'], ['a', 'b'])).toBe(false)
  expect(hasPermission([], [])).toBe(true)
})

it('matches any code for alternatives', () => {
  expect(hasAnyPermission(['system:user:read'], ['admin:dashboard:read', 'system:user:read'])).toBe(true)
  expect(hasAnyPermission([], ['admin:dashboard:read'])).toBe(false)
  expect(hasAnyPermission(['a'], [])).toBe(false)
})
