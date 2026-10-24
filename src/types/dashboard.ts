export interface DateRange {
  from: string
  to: string
}

export interface DashboardOverview {
  totalUsers: number
  enabledUsers: number
  disabledUsers: number
  newUsers: number
  activeUsers: number
  totalSessions: number
  newSessions: number
  totalMessages: number
  userMessages: number
  assistantMessages: number
  aiCalls: number
  successfulAiCalls: number
  failedAiCalls: number
  aiSuccessRate: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface DashboardTrendItem {
  date: string
  newUsers: number
  activeUsers: number
  newSessions: number
  messages: number
  aiCalls: number
  successfulAiCalls: number
  totalTokens: number
}

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}
