import { apiClient } from '@/api/client'
import type { BinaryStatus } from '@/types/management'
import type {
  McpServerManagementView,
  McpServerUpsertPayload,
  PageResult,
  ToolDiscoveryResult,
  ToolInvocationQuery,
  ToolInvocationView,
  ToolManagementView,
  ToolUpsertPayload,
} from '@/types/tools'

export function listTools(): Promise<ToolManagementView[]> {
  return apiClient.get<ToolManagementView[]>('admin/tools')
}

export function getTool(id: number): Promise<ToolManagementView> {
  return apiClient.get<ToolManagementView>(`admin/tools/${id}`)
}

export function createTool(payload: ToolUpsertPayload): Promise<ToolManagementView> {
  return apiClient.post<ToolManagementView>('admin/tools', payload)
}

export function updateTool(id: number, payload: ToolUpsertPayload): Promise<ToolManagementView> {
  return apiClient.put<ToolManagementView>(`admin/tools/${id}`, payload)
}

export function deleteTool(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/tools/${id}`)
}

export function updateToolStatus(id: number, status: BinaryStatus): Promise<ToolManagementView> {
  return apiClient.patch<ToolManagementView>(`admin/tools/${id}/status`, { status })
}

export function listMcpServers(): Promise<McpServerManagementView[]> {
  return apiClient.get<McpServerManagementView[]>('admin/tool/mcp-servers')
}

export function getMcpServer(id: number): Promise<McpServerManagementView> {
  return apiClient.get<McpServerManagementView>(`admin/tool/mcp-servers/${id}`)
}

export function createMcpServer(payload: McpServerUpsertPayload): Promise<McpServerManagementView> {
  return apiClient.post<McpServerManagementView>('admin/tool/mcp-servers', payload)
}

export function updateMcpServer(id: number, payload: McpServerUpsertPayload): Promise<McpServerManagementView> {
  return apiClient.put<McpServerManagementView>(`admin/tool/mcp-servers/${id}`, payload)
}

export function deleteMcpServer(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/tool/mcp-servers/${id}`)
}

export function updateMcpServerStatus(id: number, status: BinaryStatus): Promise<McpServerManagementView> {
  return apiClient.patch<McpServerManagementView>(`admin/tool/mcp-servers/${id}/status`, { status })
}

export function discoverMcpServer(id: number): Promise<ToolDiscoveryResult> {
  return apiClient.post<ToolDiscoveryResult>(`admin/tool/mcp-servers/${id}/discover`)
}

export function listToolInvocationLogs(
  query: ToolInvocationQuery,
): Promise<PageResult<ToolInvocationView>> {
  return apiClient.get<PageResult<ToolInvocationView>>('admin/tool/invocation-logs', { params: query })
}
