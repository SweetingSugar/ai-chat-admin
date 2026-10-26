# Admin Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permission-aware user, role, permission, AI provider, and AI model management screens to the existing Vue 3 admin application using the already implemented backend APIs.

**Architecture:** Keep API wrappers, domain types, route metadata, page state, and shared UI responsibilities separate. Add `put`, `patch`, and `delete` to the existing authenticated API client; expose each backend resource through a small API module; render five route pages grouped under System and AI Configuration; use a shared assignment drawer for full-replacement role and permission associations. Do not change the backend.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript 6, Pinia, Vue Router 4, Element Plus 2.11, Axios 1.20, Vitest 4, Vue Test Utils, Vite 8, Node 20.20.2.

---

## File map

Create these focused files:

- `src/types/management.ts` — shared binary status and assignment-group types.
- `src/types/system.ts` — user, role, permission records and request payloads.
- `src/types/ai-config.ts` — provider/model records, enums, and request payloads.
- `src/api/users.ts` — `/system/users` calls.
- `src/api/roles.ts` — `/system/roles` calls.
- `src/api/permissions.ts` — `/system/permissions` calls.
- `src/api/ai-config.ts` — provider/model calls.
- `src/components/management/PageHeader.vue` — title, description, and primary action slot; the page decides visibility from its permission state.
- `src/components/management/AssignmentDrawer.vue` — searchable grouped checkbox selection and save confirmation event.
- `src/components/management/StatusTag.vue` — enabled/disabled presentation.
- `src/layouts/AiConfigLayout.vue` — AI provider/model route shell and tabs.
- `src/views/system/UserManagementView.vue` — user table, edit drawer, status update, role assignment.
- `src/views/system/RoleManagementView.vue` — role table, CRUD drawer, permission assignment.
- `src/views/system/PermissionManagementView.vue` — permission table, local filters, CRUD drawer.
- `src/views/ai/ProviderManagementView.vue` — provider table and CRUD drawer.
- `src/views/ai/ModelManagementView.vue` — model table and CRUD drawer.

Create these test files:

- `src/api/__tests__/management.spec.ts` — API wrapper method/path/body assertions.
- `src/components/management/__tests__/AssignmentDrawer.spec.ts` — grouped selection and save events.
- `src/router/__tests__/guards.spec.ts` — extend route access cases.
- `src/views/system/__tests__/UserManagementView.spec.ts`
- `src/views/system/__tests__/RoleManagementView.spec.ts`
- `src/views/system/__tests__/PermissionManagementView.spec.ts`
- `src/views/ai/__tests__/ProviderManagementView.spec.ts`
- `src/views/ai/__tests__/ModelManagementView.spec.ts`

Modify these existing files:

- `src/api/client.ts` — add mutating HTTP methods.
- `src/api/__tests__/client.spec.ts` — test the new methods and existing auth/error behavior.
- `src/router/index.ts` — add guarded management routes and first-accessible-page logic.
- `src/components/layout/Sidebar.vue` — add permission-filtered navigation groups.

Do not modify backend files under `/Users/ice/dev/project/AI-Chat`; the documented controllers already provide the required contract.

---

### Task 1: Extend the authenticated API client

**Files:**
- Modify: `src/api/client.ts:14-19,82-99`
- Test: `src/api/__tests__/client.spec.ts`

- [ ] **Step 1: Write failing tests for `put`, `patch`, and `delete`**

Add a helper adapter and one test per method to `src/api/__tests__/client.spec.ts`. The tests must assert that the request method and body are passed through and that the response `data.data` is returned:

```ts
it('supports PUT, PATCH, and DELETE responses', async () => {
  const client = createApiClient({ readToken: () => null, onUnauthorized: vi.fn() })
  const requests: Array<{ method?: string; data?: unknown }> = []
  client.defaults.adapter = async (config) => {
    requests.push({ method: config.method, data: config.data })
    return {
      data: { success: true, code: 'SUCCESS', message: 'OK', data: { ok: true } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

  await expect(client.put('/system/roles/1', { roleName: '运营' })).resolves.toEqual({ ok: true })
  await expect(client.patch('/system/users/1/status', { status: 0 })).resolves.toEqual({ ok: true })
  await expect(client.delete('/system/roles/1')).resolves.toEqual({ ok: true })

  expect(requests.map(({ method }) => method)).toEqual(['put', 'patch', 'delete'])
  expect(JSON.parse(String(requests[0]?.data))).toEqual({ roleName: '运营' })
  expect(JSON.parse(String(requests[1]?.data))).toEqual({ status: 0 })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/api/__tests__/client.spec.ts
```

Expected: TypeScript/test failure because `ApiClient` has no `put`, `patch`, or `delete` methods.

- [ ] **Step 3: Implement the three methods**

Extend `ApiClient` and the returned object in `createApiClient` with the same response-unwrapping pattern used by `get` and `post`:

```ts
export interface ApiClient {
  defaults: AxiosInstance['defaults']
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
}
```

Use `client.put`, `client.patch`, and `client.delete` and return `response.data.data` for each method. Do not create a second Axios instance or bypass the existing interceptors.

- [ ] **Step 4: Run the focused tests and type-check**

Run:

```bash
npm test -- src/api/__tests__/client.spec.ts
npm run type-check
```

Expected: all client tests pass and type-check succeeds.

- [ ] **Step 5: Commit the client change**

```bash
git add src/api/client.ts src/api/__tests__/client.spec.ts
git commit -m "feat: support admin mutation requests"
```

---

### Task 2: Add domain types and API wrappers

**Files:**
- Create: `src/types/management.ts`
- Create: `src/types/system.ts`
- Create: `src/types/ai-config.ts`
- Create: `src/api/users.ts`
- Create: `src/api/roles.ts`
- Create: `src/api/permissions.ts`
- Create: `src/api/ai-config.ts`
- Test: `src/api/__tests__/management.spec.ts`

- [ ] **Step 1: Write API wrapper tests before the wrappers**

Create `src/api/__tests__/management.spec.ts` with spies on `apiClient.get/post/put/patch/delete`. Cover at least one read, one create, one update, one assignment, and one delete:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { assignUserRoles, getUser, listUsers, updateUserStatus } from '@/api/users'
import { createRole, assignRolePermissions, deleteRole } from '@/api/roles'
import { createProvider, updateModel } from '@/api/ai-config'

const restore = () => vi.restoreAllMocks()
afterEach(restore)

describe('management API wrappers', () => {
  it('reads users and user detail from system endpoints', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([])
    await listUsers()
    await getUser(7)
    expect(apiClient.get).toHaveBeenNthCalledWith(1, 'system/users')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, 'system/users/7')
  })

  it('uses PATCH for status and PUT for full role replacement', async () => {
    vi.spyOn(apiClient, 'patch').mockResolvedValue(undefined)
    vi.spyOn(apiClient, 'put').mockResolvedValue(undefined)
    await updateUserStatus(7, 0)
    await assignUserRoles(7, [2, 4])
    expect(apiClient.patch).toHaveBeenCalledWith('system/users/7/status', { status: 0 })
    expect(apiClient.put).toHaveBeenCalledWith('system/users/7/roles', { ids: [2, 4] })
  })

  it('maps role and AI provider/model operations to their endpoints', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)
    vi.spyOn(apiClient, 'put').mockResolvedValue({})
    await createRole({ roleName: '运营', roleCode: 'operator' })
    await deleteRole(3)
    await createProvider({ providerCode: 'deepseek', providerName: 'DeepSeek', providerType: 'DEEPSEEK', baseUrl: 'https://api.deepseek.com', apiKey: 'secret' })
    await updateModel(9, { providerId: 1, modelCode: 'deepseek-chat', modelName: 'DeepSeek Chat', modelType: 'chat' })
    expect(apiClient.post).toHaveBeenCalledWith('system/roles', { roleName: '运营', roleCode: 'operator' })
    expect(apiClient.delete).toHaveBeenCalledWith('system/roles/3')
    expect(apiClient.post).toHaveBeenCalledWith('admin/ai/providers', expect.objectContaining({ providerCode: 'deepseek' }))
    expect(apiClient.put).toHaveBeenCalledWith('admin/ai/models/9', expect.objectContaining({ modelCode: 'deepseek-chat' }))
  })
})
```

- [ ] **Step 2: Run the wrapper tests and verify they fail**

Run:

```bash
npm test -- src/api/__tests__/management.spec.ts
```

Expected: module-not-found or missing-export failures for the new API modules.

- [ ] **Step 3: Define the shared and system types**

Create the exact contracts used by the pages:

```ts
// src/types/management.ts
export type BinaryStatus = 0 | 1
export interface AssignmentGroup { id: string; label: string; options: Array<{ id: number; label: string; description?: string }> }
```

```ts
// src/types/system.ts
import type { BinaryStatus } from './management'

export interface UserRecord { id: number; username: string; nickname: string | null; email: string | null; phone: string | null; avatar: string | null; status: number; lastLoginTime: string | null; createTime: string; roleIds?: number[]; roleCodes?: string[]; permissionCodes?: string[] }
export interface RoleRecord { id: number; roleName: string; roleCode: string; description: string | null; sort: number; status: number; createTime: string; updateTime: string }
export interface RoleDetail extends RoleRecord { permissionIds: number[] }
export interface PermissionRecord { id: number; parentId: number; permissionName: string; permissionCode: string | null; permissionType: number; path: string | null; component: string | null; icon: string | null; sort: number; status: number; createTime: string; updateTime: string }
export interface UserUpdatePayload { nickname?: string; email?: string; phone?: string; avatar?: string }
export interface RolePayload { roleName: string; roleCode: string; description?: string; sort?: number; status?: BinaryStatus }
export interface PermissionPayload { parentId: number; permissionName: string; permissionCode?: string; permissionType: number; path?: string; component?: string; icon?: string; sort?: number; status?: BinaryStatus }
export interface IdSetPayload { ids: number[] }
```

Keep response status as `number` where the backend does not constrain an integer union in the response, and use `BinaryStatus` for values generated by forms.

- [ ] **Step 4: Define the AI configuration types**

Create `src/types/ai-config.ts`:

```ts
import type { BinaryStatus } from './management'

export type ProviderType = 'OPENAI' | 'DEEPSEEK' | 'QWEN'
export interface ProviderRecord { id: number; providerCode: string; providerName: string; providerType: ProviderType; baseUrl: string; connectTimeout: number | null; readTimeout: number | null; status: number; hasApiKey: boolean; credentialVersion: number | null; sort: number; remark: string | null }
export interface ProviderPayload { providerCode: string; providerName: string; providerType: ProviderType; baseUrl: string; apiKey?: string; connectTimeout?: number; readTimeout?: number; status?: BinaryStatus; sort?: number; remark?: string }
export interface ModelRecord { id: number; providerId: number; providerName: string; modelCode: string; modelName: string; modelType: string; contextWindow: number; maxOutputTokens: number; temperature: number | null; topP: number | null; supportStream: boolean; defaultModel: boolean; configVersion: number | null; status: number; sort: number; remark: string | null }
export interface ModelPayload { providerId: number; modelCode: string; modelName: string; modelType: string; contextWindow?: number; maxOutputTokens?: number; temperature?: number; topP?: number; supportStream?: BinaryStatus; isDefault?: BinaryStatus; status?: BinaryStatus; sort?: number; remark?: string }
```

The provider payload deliberately has no response API key field; the model response uses the backend's `supportStream` and `defaultModel` booleans.

- [ ] **Step 5: Implement the API modules with exact backend paths**

Each wrapper should only delegate to `apiClient` and return the typed promise. For example:

```ts
// src/api/users.ts
import { apiClient } from '@/api/client'
import type { IdSetPayload, UserRecord, UserUpdatePayload } from '@/types/system'
import type { BinaryStatus } from '@/types/management'

export const listUsers = () => apiClient.get<UserRecord[]>('system/users')
export const getUser = (id: number) => apiClient.get<UserRecord>(`system/users/${id}`)
export const updateUser = (id: number, payload: UserUpdatePayload) => apiClient.put<UserRecord>(`system/users/${id}`, payload)
export const updateUserStatus = (id: number, status: BinaryStatus) => apiClient.patch<void>(`system/users/${id}/status`, { status })
export const assignUserRoles = (id: number, ids: number[]) => apiClient.put<void>(`system/users/${id}/roles`, { ids } satisfies IdSetPayload)
```

Because `ApiClient.put` has one generic response type, use `apiClient.put<void>(...)` and let the payload be inferred from the data argument; do not add a second generic parameter to the client signature. Implement the corresponding list/detail/create/update/delete/assignment functions in `roles.ts`, `permissions.ts`, and `ai-config.ts` using the documented paths.

- [ ] **Step 6: Run wrapper tests and type-check**

Run:

```bash
npm test -- src/api/__tests__/management.spec.ts
npm run type-check
```

Expected: wrapper tests pass and all imported request/response types compile.

- [ ] **Step 7: Commit the API foundation**

```bash
git add src/types/management.ts src/types/system.ts src/types/ai-config.ts src/api/users.ts src/api/roles.ts src/api/permissions.ts src/api/ai-config.ts src/api/__tests__/management.spec.ts
git commit -m "feat: add admin management API contracts"
```

---

### Task 3: Add shared management UI primitives

**Files:**
- Create: `src/components/management/PageHeader.vue`
- Create: `src/components/management/StatusTag.vue`
- Create: `src/components/management/AssignmentDrawer.vue`
- Test: `src/components/management/__tests__/AssignmentDrawer.spec.ts`

- [ ] **Step 1: Write failing assignment-drawer tests**

Test that groups render, search filters options, selecting an option emits the updated IDs, and saving emits the final full set:

```ts
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it } from 'vitest'
import AssignmentDrawer from '@/components/management/AssignmentDrawer.vue'

const groups = [{ id: 'system', label: '系统管理', options: [{ id: 1, label: '用户查看', description: 'system:user:read' }, { id: 2, label: '用户更新', description: 'system:user:update' }] }]

it('filters grouped options and emits a full replacement set on save', async () => {
  const wrapper = mount(AssignmentDrawer, { props: { modelValue: true, title: '分配权限', groups, selectedIds: [1] }, global: { plugins: [ElementPlus] } })
  const input = wrapper.find('input[placeholder="搜索权限"]')
  await input.setValue('更新')
  expect(wrapper.text()).toContain('用户更新')
  expect(wrapper.text()).not.toContain('用户查看')
  await wrapper.findAll('input[type="checkbox"]')[0]?.setValue(true)
  wrapper.find('[data-test="assignment-save"]').trigger('click')
  expect(wrapper.emitted('save')?.[0]).toEqual([[1, 2]])
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/components/management/__tests__/AssignmentDrawer.spec.ts
```

Expected: component module-not-found failure.

- [ ] **Step 3: Implement the shared primitives**

`PageHeader.vue` accepts `title`, `description`, and an optional `actionLabel`, and exposes an `action` event. `StatusTag.vue` accepts `status: number` and renders “启用”/“停用” with `success`/`info` tags.

`AssignmentDrawer.vue` must:

- accept `modelValue`, `title`, `groups`, `selectedIds`, and `searchPlaceholder` (default `搜索权限`);
- copy `selectedIds` into local state on open and never mutate the prop array;
- filter labels/descriptions case-insensitively;
- provide per-group checkboxes and a per-group “全选” action;
- show selected count;
- emit `update:modelValue` on close;
- emit `save: [number[]]` when the user clicks save; the parent must confirm the full replacement before calling the API;
- expose `data-test="assignment-save"` on the save button.

The component should emit the selected IDs directly; the parent owns `ElMessageBox.confirm` because only the parent knows whether it is assigning roles or permissions.

- [ ] **Step 4: Run shared component tests and type-check**

Run:

```bash
npm test -- src/components/management/__tests__/AssignmentDrawer.spec.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 5: Commit the shared UI primitives**

```bash
git add src/components/management src/components/management/__tests__
git commit -m "feat: add shared management controls"
```

---

### Task 4: Add management routes, navigation, and AI configuration shell

**Files:**
- Create: `src/layouts/AiConfigLayout.vue`
- Modify: `src/router/index.ts`
- Modify: `src/components/layout/Sidebar.vue`
- Test: `src/router/__tests__/guards.spec.ts`

- [ ] **Step 1: Add failing route access tests**

Extend the existing guard tests with a user-management route and a first-accessible-page case:

```ts
it('allows a user with only user-read permission to enter user management', async () => {
  const auth = useAuthStore()
  auth.token = { tokenName: 'x-auth', tokenValue: 'secret' }
  auth.user = { ...user, permissionCodes: ['system:user:read'] }
  auth.initialized = true
  const router = createAppRouter(createMemoryHistory())

  await router.push('/system/users')

  expect(router.currentRoute.value.fullPath).toBe('/system/users')
})

it('uses the first accessible management route when dashboard is unavailable', () => {
  expect(getFirstAccessiblePath(['system:user:read'])).toBe('/system/users')
})
```

- [ ] **Step 2: Run the route tests and verify they fail**

Run:

```bash
npm test -- src/router/__tests__/guards.spec.ts
```

Expected: the new route does not exist and `getFirstAccessiblePath` still only returns dashboard/forbidden.

- [ ] **Step 3: Implement route metadata and first-accessible ordering**

Add direct child routes for `/system/users`, `/system/roles`, and `/system/permissions`. Add an `/ai` route using `AiConfigLayout` with `providers` and `models` children, each with its own permission metadata. Keep the existing `/dashboard` and `/forbidden` records.

Replace the narrow return type with:

```ts
const accessibleEntries = [
  ['/dashboard', 'admin:dashboard:read'],
  ['/system/users', 'system:user:read'],
  ['/system/roles', 'system:role:read'],
  ['/system/permissions', 'system:permission:read'],
  ['/ai/providers', 'ai:provider:read'],
  ['/ai/models', 'ai:model:read'],
] as const

export function getFirstAccessiblePath(permissionCodes: string[]): string {
  return accessibleEntries.find(([, permission]) => permissionCodes.includes(permission))?.[0] ?? '/forbidden'
}
```

Use `router.push`/`router.replace` from the AI shell to switch tabs. Do not grant a write action from a read permission.

- [ ] **Step 4: Add sidebar groups and AI tabs**

Add permission-filtered items for the existing groups:

```ts
{ label: '系统管理', items: [
  { label: '用户管理', path: '/system/users', permission: 'system:user:read' },
  { label: '角色管理', path: '/system/roles', permission: 'system:role:read' },
  { label: '权限管理', path: '/system/permissions', permission: 'system:permission:read' },
] },
{ label: 'AI 配置', items: [
  { label: '供应商管理', path: '/ai/providers', permission: 'ai:provider:read' },
  { label: '模型管理', path: '/ai/models', permission: 'ai:model:read' },
] },
```

`AiConfigLayout.vue` renders a page heading and an `el-tabs` control whose active name is derived from `route.path`; the tabs navigate to `/ai/providers` and `/ai/models`, and then render the child `RouterView`.

- [ ] **Step 5: Run route tests and type-check**

Run:

```bash
npm test -- src/router/__tests__/guards.spec.ts
npm run type-check
```

Expected: all existing and new guard tests pass.

- [ ] **Step 6: Commit navigation and routing**

```bash
git add src/router/index.ts src/router/__tests__/guards.spec.ts src/components/layout/Sidebar.vue src/layouts/AiConfigLayout.vue
git commit -m "feat: add admin management navigation"
```

---

### Task 5: Implement user management

**Files:**
- Create: `src/views/system/UserManagementView.vue`
- Test: `src/views/system/__tests__/UserManagementView.spec.ts`

- [ ] **Step 1: Write failing page tests**

Mock `@/api/users` and `@/api/roles`. Cover initial list rendering, status update, edit submission, role-detail loading, and full-replacement confirmation. Use the existing `mount(..., { global: { plugins: [ElementPlus] } })` pattern.

The critical assertions are:

```ts
expect(wrapper.text()).toContain('alice_01')
expect(usersApi.updateUserStatus).toHaveBeenCalledWith(1, 0)
expect(usersApi.updateUser).toHaveBeenCalledWith(1, { nickname: 'Alice', email: 'alice@example.com', phone: '', avatar: '' })
expect(usersApi.assignUserRoles).toHaveBeenCalledWith(1, [2, 3])
```

Mock `ElMessageBox.confirm` to resolve in the assignment test and reject in a cancellation test; cancellation must not call `assignUserRoles`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/views/system/__tests__/UserManagementView.spec.ts
```

Expected: view module-not-found failure.

- [ ] **Step 3: Implement list/filter/action state**

`UserManagementView.vue` should load `listUsers()` on mount and maintain `users`, `loading`, `error`, `keyword`, `statusFilter`, `editVisible`, `editingUser`, `assignmentVisible`, `assignmentUser`, `roles`, and `selectedRoleIds`.

Use a computed `filteredUsers` that matches username, nickname, email, or phone and optionally filters status. Render columns for username, nickname, contact, status, last login, created time, and actions. Show role assignment only when `auth.hasPermission(['system:user:assign-role', 'system:role:read'])`; show edit/status actions only with `system:user:update`.

- [ ] **Step 4: Implement edit and status flows**

The edit drawer submits `UserUpdatePayload` with empty optional fields normalized to `''`, calls `updateUser`, closes on success, refreshes the list, and shows `getApiErrorMessage(error)` on failure. The status switch calls `updateUserStatus`; on rejection it restores the prior numeric status.

- [ ] **Step 5: Implement role assignment with explicit full-replacement confirmation**

When opening assignment, call `getUser(id)` and `listRoles()` in parallel. Convert roles into one `AssignmentGroup` with each option showing role code as description. On save, call:

```ts
await ElMessageBox.confirm(
  '本次保存将替换当前用户的全部角色关联，选择为空将清空全部角色。',
  '确认替换角色关联',
  { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' },
)
await assignUserRoles(userId, ids)
```

Refresh the user list and detail after success. A rejected confirmation must leave the drawer and selected IDs unchanged.

- [ ] **Step 6: Run user tests and type-check**

Run:

```bash
npm test -- src/views/system/__tests__/UserManagementView.spec.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit user management**

```bash
git add src/views/system/UserManagementView.vue src/views/system/__tests__/UserManagementView.spec.ts
 git commit -m "feat: add user management"
```

---

### Task 6: Implement role management and permission assignment

**Files:**
- Create: `src/views/system/RoleManagementView.vue`
- Test: `src/views/system/__tests__/RoleManagementView.spec.ts`

- [ ] **Step 1: Write failing role page tests**

Mock role and permission APIs. Assert that the table loads, the role form submits the exact `RolePayload`, delete confirms before calling `deleteRole`, and permission assignment sends a complete ID list only after confirmation:

```ts
expect(rolesApi.createRole).toHaveBeenCalledWith({ roleName: '运营人员', roleCode: 'operator', description: '运营后台角色', sort: 10, status: 1 })
expect(rolesApi.assignRolePermissions).toHaveBeenCalledWith(8, [11, 12])
expect(rolesApi.deleteRole).not.toHaveBeenCalled()
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/views/system/__tests__/RoleManagementView.spec.ts
```

Expected: view module-not-found failure.

- [ ] **Step 3: Implement role CRUD**

Load `listRoles()` on mount. Provide keyword/status filtering over `roleName` and `roleCode`, and render name, code, description, sort, status, timestamps, and permission count when known. Show create/edit/delete actions only for their corresponding permissions.

Use one drawer form with `roleName`, `roleCode`, `description`, `sort`, and `status`. On edit, seed the form from the row; on create, use `{ roleName: '', roleCode: '', description: '', sort: 0, status: 1 }`. Call `createRole` or `updateRole`, close and reload after success.

- [ ] **Step 4: Implement permission assignment**

When opening assignment, call `getRole(id)` and `listPermissions()` in parallel. Group permissions by top-level parent: use `parentId === 0` as the group label when no parent record exists; otherwise use the parent permission name. Each option displays `permissionName` and `permissionCode`.

Require both `system:role:assign-permission` and `system:permission:read` to show the action. Confirm with:

```ts
await ElMessageBox.confirm(
  '本次保存将替换当前角色的全部权限关联，选择为空将清空全部权限。',
  '确认替换权限关联',
  { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' },
)
await assignRolePermissions(roleId, ids)
```

- [ ] **Step 5: Implement delete conflict and error states**

Use `ElMessageBox.confirm('删除后不可恢复，是否继续？', '确认删除', ...)`. On `ApiError` show `getApiErrorMessage` and leave the table unchanged; do not optimistically remove a role.

- [ ] **Step 6: Run role tests and type-check**

Run:

```bash
npm test -- src/views/system/__tests__/RoleManagementView.spec.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit role management**

```bash
git add src/views/system/RoleManagementView.vue src/views/system/__tests__/RoleManagementView.spec.ts
git commit -m "feat: add role management and permission assignment"
```

---

### Task 7: Implement permission management table and form

**Files:**
- Create: `src/views/system/PermissionManagementView.vue`
- Test: `src/views/system/__tests__/PermissionManagementView.spec.ts`

- [ ] **Step 1: Write failing permission page tests**

Mock `listPermissions`, `createPermission`, `updatePermission`, and `deletePermission`. Test local search by permission name/code, type/status filters, parent options, form submission, and delete confirmation.

Use these concrete expectations:

```ts
expect(wrapper.text()).toContain('system:user:read')
await wrapper.find('input[placeholder="搜索权限名称或编码"]').setValue('assign-role')
expect(wrapper.text()).toContain('角色分配')
expect(permissionApi.createPermission).toHaveBeenCalledWith(expect.objectContaining({ permissionType: 3, parentId: 0, status: 1 }))
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/views/system/__tests__/PermissionManagementView.spec.ts
```

Expected: view module-not-found failure.

- [ ] **Step 3: Implement the grouped table**

Load the full array once and compute filtered rows locally. Search `permissionName` and `permissionCode`; filter `permissionType` and `status`; sort by `parentId`, `sort`, then `id`. Show a “所属模块” column derived from the parent map. Use the labels `目录` for type 1, `菜单` for type 2, `按钮` for type 3, and `类型 N` for an unknown numeric value.

Render the table inside a horizontally scrollable container for narrow screens. Add an empty state when the filtered result is empty and a retry action when the request fails.

- [ ] **Step 4: Implement permission CRUD form**

The drawer fields are `parentId`, `permissionName`, `permissionCode`, `permissionType`, `path`, `component`, `icon`, `sort`, and `status`. Parent options come from the loaded permission list and exclude the current permission during edit. Submit `PermissionPayload`, converting empty optional strings to `''` and keeping `permissionType` numeric.

- [ ] **Step 5: Implement delete confirmation and permission-aware actions**

Show create/edit/delete actions only for `system:permission:create`, `system:permission:update`, and `system:permission:delete`. Confirm deletion, then reload only after the delete request succeeds.

- [ ] **Step 6: Run permission tests and type-check**

Run:

```bash
npm test -- src/views/system/__tests__/PermissionManagementView.spec.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit permission management**

```bash
git add src/views/system/PermissionManagementView.vue src/views/system/__tests__/PermissionManagementView.spec.ts
git commit -m "feat: add permission management"
```

---

### Task 8: Implement AI provider management

**Files:**
- Create: `src/views/ai/ProviderManagementView.vue`
- Test: `src/views/ai/__tests__/ProviderManagementView.spec.ts`

- [ ] **Step 1: Write failing provider page tests**

Mock provider API functions and assert list rendering, create/update payloads, API key behavior, status filtering, and deletion confirmation:

```ts
expect(aiApi.createProvider).toHaveBeenCalledWith(expect.objectContaining({ providerType: 'DEEPSEEK', apiKey: 'sk-new' }))
expect(aiApi.updateProvider).toHaveBeenCalledWith(2, expect.not.objectContaining({ apiKey: expect.any(String) }))
expect(wrapper.text()).toContain('已配置')
```

The edit test must leave the API key input blank and assert that the update request omits `apiKey` rather than sending the masked display value.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/views/ai/__tests__/ProviderManagementView.spec.ts
```

Expected: view module-not-found failure.

- [ ] **Step 3: Implement provider table and filters**

Load `listProviders()` on mount. Filter by provider code/name, provider type, and status. Render provider name/code, type, base URL, timeout values, API key state (`已配置`/`未配置`), status, sort, and actions. Never render or store a response API key because the backend only returns `hasApiKey`.

- [ ] **Step 4: Implement provider form and API key rules**

The drawer fields are `providerCode`, `providerName`, `providerType`, `baseUrl`, `apiKey`, `connectTimeout`, `readTimeout`, `status`, `sort`, and `remark`. Use a password input with a hint that an empty edit value keeps the existing key. For create, require a non-empty key; for edit, omit `apiKey` when blank.

Normalize numeric fields and optional strings before calling the API. Show provider types `OPENAI`, `DEEPSEEK`, and `QWEN`.

- [ ] **Step 5: Implement delete and conflict behavior**

Confirm deletion, call `deleteProvider`, then reload. On `RESOURCE_CONFLICT` show the backend message such as “AI provider still has models”; do not attempt to delete related models automatically.

- [ ] **Step 6: Run provider tests and type-check**

Run:

```bash
npm test -- src/views/ai/__tests__/ProviderManagementView.spec.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit provider management**

```bash
git add src/views/ai/ProviderManagementView.vue src/views/ai/__tests__/ProviderManagementView.spec.ts
git commit -m "feat: add AI provider management"
```

---

### Task 9: Implement AI model management

**Files:**
- Create: `src/views/ai/ModelManagementView.vue`
- Test: `src/views/ai/__tests__/ModelManagementView.spec.ts`

- [ ] **Step 1: Write failing model page tests**

Mock model and provider APIs. Assert provider filtering, boolean-to-`0/1` payload conversion, default model payload, and update behavior:

```ts
expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({ providerId: 1, supportStream: 1, isDefault: 0, status: 1 }))
expect(aiApi.updateModel).toHaveBeenCalledWith(4, expect.objectContaining({ temperature: 0.7, topP: 0.9 }))
```

Also test that a disabled provider is visibly marked and that the page preserves the backend error when an enabled model is submitted against one.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected: view module-not-found failure.

- [ ] **Step 3: Implement model table and provider filter**

Load `listModels()` and `listProviders()` together. Filter by model code/name, provider, status, and default flag. Render provider, code/name, type, context window, max output tokens, temperature/top-p, stream/default/status tags, and actions.

- [ ] **Step 4: Implement model form and payload conversion**

The drawer fields are `providerId`, `modelCode`, `modelName`, `modelType`, `contextWindow`, `maxOutputTokens`, `temperature`, `topP`, `supportStream`, `isDefault`, `status`, `sort`, and `remark`. Use numeric inputs for limits and decimal inputs for temperature/top-p. Convert booleans to `0/1` in one function before calling `createModel` or `updateModel`:

```ts
function toModelPayload(form: ModelForm): ModelPayload {
  return {
    providerId: form.providerId,
    modelCode: form.modelCode.trim(),
    modelName: form.modelName.trim(),
    modelType: form.modelType.trim(),
    contextWindow: form.contextWindow,
    maxOutputTokens: form.maxOutputTokens,
    temperature: form.temperature,
    topP: form.topP,
    supportStream: form.supportStream ? 1 : 0,
    isDefault: form.isDefault ? 1 : 0,
    status: form.status ? 1 : 0,
    sort: form.sort,
    remark: form.remark.trim(),
  }
}
```

Show disabled providers in the select and allow the backend to remain the final validator. Add a pre-submit warning when the model is enabled while its selected provider is disabled, but still display the server response if the request is attempted.

- [ ] **Step 5: Implement default/deletion behavior**

When setting a model as default, explain that the backend clears the previous default; after success reload the full model list so the updated default state is visible. Confirm deletion and reload only after successful deletion.

- [ ] **Step 6: Run model tests and type-check**

Run:

```bash
npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
npm run type-check
```

Expected: PASS.

- [ ] **Step 7: Commit model management**

```bash
git add src/views/ai/ModelManagementView.vue src/views/ai/__tests__/ModelManagementView.spec.ts
 git commit -m "feat: add AI model management"
```

---

### Task 10: Run the complete verification and inspect the real app

**Files:**
- Modify: any implementation files only if a verification failure identifies a concrete defect.
- Test: all existing and new `src/**/*.spec.ts` tests.

- [ ] **Step 1: Verify the required Node version**

Run:

```bash
node --version
```

Expected: `v20.20.2`. If Node is not `v20.20.2`, switch to the project’s pinned Node 20.20.2 environment before running the remaining commands.

- [ ] **Step 2: Run all automated tests**

Run:

```bash
npm run test
```

Expected: all existing authentication/dashboard tests and all new management tests pass.

- [ ] **Step 3: Run type-check and production build**

Run:

```bash
npm run type-check
npm run build
```

Expected: no Vue template/type errors and a successful Vite production build.

- [ ] **Step 4: Start the frontend and exercise the main flows**

Run the project through the project run workflow, open the local URL, and verify with a backend account that has the required permissions:

1. Sign in and confirm the new sidebar groups appear only for granted read permissions.
2. Open Users, edit a profile, toggle status, open role assignment, and verify the full-replacement confirmation appears.
3. Open Roles, create/edit/delete a role, and assign permissions including the empty-selection confirmation.
4. Open Permissions, search by code, filter by type/status, and edit a permission.
5. Open AI Configuration, switch provider/model tabs, create a provider with a key, edit it without entering a key, and verify the key remains masked.
6. Create or edit a model, change default status, and verify the list reflects the backend-cleared previous default.
7. Attempt a provider deletion with models attached and verify the conflict message leaves the page usable.
8. Resize to a narrow viewport and verify tables scroll horizontally and drawers remain usable.

- [ ] **Step 5: Review the final diff and working tree**

Run:

```bash
git diff master-261026..HEAD --stat
git status --short
```

Expected: only the intended frontend source, tests, and documentation commits are present; no credentials, generated build output, or `.superpowers` artifacts are staged.

- [ ] **Step 6: Commit any verification-only fixes as a new commit**

If a concrete issue was found, fix it, rerun the failing verification, and create a new commit rather than amending an earlier commit:

```bash
git add <specific-fixed-files>
git commit -m "fix: resolve admin management verification issue"
```

---

## Plan self-review

- **Spec coverage:** Routes and permission-aware navigation are covered by Task 4; API contracts and mutation methods by Tasks 1–2; shared table/drawer behavior and full-replacement confirmation by Task 3; users, roles, permissions, providers, and models by Tasks 5–9; loading/error/empty/delete-conflict behavior by each page task; responsive and browser verification by Task 10; Node 20.20.2 validation by Task 10.
- **Placeholder scan:** The plan contains no `TODO`, `TBD`, or unspecified implementation steps. Every page task names the exact API calls, fields, confirmation copy, payload conversion, and focused test command.
- **Type consistency:** `BinaryStatus`, `UserRecord`, `RoleRecord`, `RoleDetail`, `PermissionRecord`, `ProviderRecord`, `ProviderPayload`, `ModelRecord`, and `ModelPayload` are defined before their API wrappers and page tasks use them. Assignment groups use numeric IDs consistently for role and permission associations.
- **Scope:** The plan changes only the frontend and documentation, with no backend schema/API work and no unrelated refactor.
