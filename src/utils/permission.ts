export type PermissionRequirement = string | readonly string[]

export function hasPermission(
  codes: readonly string[],
  required: PermissionRequirement,
): boolean {
  const requirements = typeof required === 'string' ? [required] : required
  return requirements.every((code) => codes.includes(code))
}

export function hasAnyPermission(
  codes: readonly string[],
  candidates: readonly string[],
): boolean {
  return candidates.some((code) => codes.includes(code))
}
