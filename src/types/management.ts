export type BinaryStatus = 0 | 1

export interface AssignmentOption {
  id: number
  label: string
  description?: string
}

export interface AssignmentGroup {
  id: string
  label: string
  options: AssignmentOption[]
}
