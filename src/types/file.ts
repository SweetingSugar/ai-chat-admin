export type FileStatus = 'ACTIVE' | 'DELETING' | 'DELETE_FAILED' | 'DELETED'

export interface FileMetadata {
  id: number
  userId: number
  originalName: string
  contentType: string
  fileSize: number
  status: FileStatus
  createTime: string
  updateTime: string
}

export interface FilePage {
  records: FileMetadata[]
  total: number
  current: number
  size: number
  pages: number
}

export interface FileQuery {
  page: number
  size: number
  userId?: number
  originalName?: string
  contentType?: string
  status?: FileStatus
  createdFrom?: string
  createdTo?: string
}
