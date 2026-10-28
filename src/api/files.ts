import { apiClient } from '@/api/client'
import type { FileMetadata, FilePage, FileQuery } from '@/types/file'

export function listFiles(query: FileQuery): Promise<FilePage> {
  return apiClient.get<FilePage>('admin/files', { params: query })
}

export function getFile(id: number): Promise<FileMetadata> {
  return apiClient.get<FileMetadata>(`admin/files/${id}`)
}

export function deleteFile(id: number): Promise<void> {
  return apiClient.delete<void>(`admin/files/${id}`)
}
