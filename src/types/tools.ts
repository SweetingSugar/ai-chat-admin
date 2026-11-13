import type { BinaryStatus } from './management'

export type ToolType = 'HTTP' | 'MCP'
export type ToolSource = 'MANUAL' | 'DISCOVERED'
export type ToolAvailability = 'AVAILABLE' | 'STALE'
export type ToolAuthType = 'NONE' | 'BEARER' | 'API_KEY'
export type ToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ToolInvocationStatus = 'RUNNING' | 'SUCCESS' | 'FAILED'
export type ToolDiscoveryStatus = 'SUCCESS' | 'FAILED'

export interface HttpToolConfig {
  url: string
  method: ToolHttpMethod
  headers?: Record<string, string> | null
  queryParams?: Record<string, string> | null
  bodyTemplate?: unknown
}

export interface ToolManagementView {
  id: number
  toolCode: string
  toolName: string
  description: string | null
  toolType: ToolType
  source: ToolSource
  status: BinaryStatus
  availability: ToolAvailability
  mcpServerId: number | null
  remoteToolName: string | null
  authType: ToolAuthType
  authHeaderName: string | null
  httpConfig: HttpToolConfig | null
  inputSchema: unknown | null
  hasCredential: boolean
  credentialVersion: number | null
  createTime: string
  updateTime: string
}

export interface ToolUpsertPayload {
  toolCode: string
  toolName: string
  description?: string
  toolType: 'HTTP'
  httpConfig?: HttpToolConfig
  authType: ToolAuthType
  authHeaderName?: string
  credential?: string
  secretHeaders?: Record<string, string>
  status?: BinaryStatus
}

export interface McpServerManagementView {
  id: number
  serverCode: string
  serverName: string
  endpointUrl: string
  authType: ToolAuthType
  connectTimeout: number
  readTimeout: number
  status: BinaryStatus
  hasCredential: boolean
  credentialVersion: number | null
  lastDiscoveryTime: string | null
  lastDiscoveryStatus: ToolDiscoveryStatus | null
  lastDiscoveryError: string | null
  createTime: string
  updateTime: string
}

export interface McpServerUpsertPayload {
  serverCode: string
  serverName: string
  endpointUrl: string
  authType: ToolAuthType
  authHeaderName?: string
  credential?: string
  secretHeaders?: Record<string, string>
  connectTimeout?: number
  readTimeout?: number
  status?: BinaryStatus
}

export interface ToolDiscoveryResult {
  serverId: number
  discovered: number
  created: number
  updated: number
  stale: number
  tools: ToolManagementView[]
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

export interface ToolInvocationView {
  id: number
  requestId: string
  toolId: number | null
  toolCode: string
  userId: number | null
  toolType: ToolType
  status: ToolInvocationStatus
  durationMs: number | null
  errorCode: string | null
  errorMessage: string | null
  startTime: string
  endTime: string | null
  createTime: string
}

export interface ToolInvocationQuery {
  page: number
  size: number
  toolId?: number
  status?: ToolInvocationStatus
}
