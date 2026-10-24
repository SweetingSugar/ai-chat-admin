import type { AuthToken } from '@/types/auth'

const STORAGE_KEY = 'ai-chat-admin.token'

export function writeStoredToken(token: AuthToken): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token))
}

export function readStoredToken(): AuthToken | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  try {
    const parsed: unknown = JSON.parse(stored)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'tokenName' in parsed &&
      'tokenValue' in parsed &&
      typeof parsed.tokenName === 'string' &&
      typeof parsed.tokenValue === 'string' &&
      parsed.tokenName.length > 0 &&
      parsed.tokenValue.length > 0
    ) {
      return { tokenName: parsed.tokenName, tokenValue: parsed.tokenValue }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }

  return null
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}
