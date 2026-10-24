import { beforeEach, describe, expect, it } from 'vitest'
import { clearStoredToken, readStoredToken, writeStoredToken } from '@/utils/auth-storage'

beforeEach(() => localStorage.clear())

it('round-trips a dynamic token name and value', () => {
  writeStoredToken({ tokenName: 'custom-token', tokenValue: 'abc' })
  expect(readStoredToken()).toEqual({ tokenName: 'custom-token', tokenValue: 'abc' })
})

it('clears malformed or removed storage', () => {
  localStorage.setItem('ai-chat-admin.token', '{bad json')
  expect(readStoredToken()).toBeNull()
  writeStoredToken({ tokenName: 'satoken', tokenValue: 'abc' })
  clearStoredToken()
  expect(readStoredToken()).toBeNull()
})

describe('storage helpers', () => {
  it('returns null when no token exists', () => {
    expect(readStoredToken()).toBeNull()
  })
})
