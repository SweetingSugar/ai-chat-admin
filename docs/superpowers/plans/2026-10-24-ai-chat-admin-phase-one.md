# AI Chat 管理后台第一阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Vue 默认模板上交付可与现有后端联调的管理后台第一阶段，打通登录、动态权限、后台框架和运营概览。

**Architecture:** 使用 Axios API 层统一解包和错误分支，Pinia 只保存认证上下文，Vue Router 通过路由元数据执行权限守卫；概览页在组件内部并行加载概览和趋势数据，并为两个区域分别维护状态。页面使用 Element Plus，统计图使用 ECharts，纯逻辑和关键组件使用 Vitest 验证。

**Tech Stack:** Vue 3、TypeScript、Vite、Vue Router、Pinia、Element Plus、Axios、ECharts、Vitest、Node 20.20.2。

---

## 文件结构与职责

第一阶段完成后，以下文件是新增或修改的边界：

- Modify `package.json`: 依赖、Node 20 引擎、脚本。
- Modify `package-lock.json`: 由 npm install 自动更新。
- Modify `vite.config.ts`: `/api` 开发代理和测试配置所需的别名保持一致。
- Modify `tsconfig.node.json`: 使用 `@tsconfig/node20`。
- Modify `index.html`: 中文文档语言和后台标题。
- Modify `src/main.ts`: 创建 Pinia、Router、Element Plus 并初始化 API 客户端。
- Modify `src/App.vue`: 只负责渲染 `RouterView`。
- Replace `src/assets/base.css`, `src/assets/main.css`: 全局设计令牌、布局重置和响应式规则。
- Modify `env.d.ts`: 声明 `VITE_API_BASE_URL` 与 `VITE_BACKEND_URL`。
- Delete `src/components/HelloWorld.vue`, `src/components/TheWelcome.vue`, `src/components/WelcomeItem.vue` 及默认图标组件：它们不再被应用使用。
- Create `src/router/index.ts`: 初始 Router 壳，Task 4 扩展为完整路由表和守卫。
- Create `vitest.config.ts`: Vitest、Vue 插件、`@` 别名和 jsdom 环境。
- Create `src/types/api.ts`: API 包装和错误类型。
- Create `src/types/auth.ts`: 用户、Token、登录和认证上下文类型。
- Create `src/types/dashboard.ts`: 概览、趋势和异步状态类型。
- Create `src/utils/auth-storage.ts`: Token 的序列化、读取、保存和清理。
- Create `src/utils/date.ts`: 本地日期运算、默认范围、半开区间转换和范围校验。
- Create `src/utils/permission.ts`: 权限码判断。
- Create `src/utils/__tests__/auth-storage.spec.ts`, `date.spec.ts`, `permission.spec.ts`：纯函数测试。
- Create `src/api/client.ts`: Axios 实例、动态认证 Header、统一响应解包和错误转换。
- Create `src/api/auth.ts`: 认证 API 方法。
- Create `src/api/dashboard.ts`: 概览和趋势 API 方法。
- Create `src/api/__tests__/client.spec.ts`: API 客户端行为测试。
- Create `src/api/__tests__/dashboard.spec.ts`: 统计查询参数测试。
- Create `src/stores/auth.ts`: Pinia 认证 Store。
- Create `src/stores/__tests__/auth.spec.ts`: 登录、初始化和清理测试。
- Create `src/router/index.ts`: 路由表、首个可访问路径和导航守卫。
- Create `src/router/__tests__/guards.spec.ts`: 路由守卫测试。
- Create `src/layouts/AdminLayout.vue`: 后台框架容器。
- Create `src/components/layout/Sidebar.vue`: 权限过滤后的导航。
- Create `src/components/layout/Topbar.vue`: 面包屑、帮助入口和账号菜单。
- Create `src/views/LoginView.vue`: 登录表单。
- Create `src/views/ForbiddenView.vue`: 无权限页。
- Create `src/views/DashboardView.vue`: 概览页路由壳，Task 6 替换为统计页面。
- Create `src/views/__tests__/LoginView.spec.ts`: 登录交互测试。
- Create `src/components/dashboard/MetricCard.vue`: 指标卡。
- Create `src/components/dashboard/DateRangePicker.vue`: 快捷范围和自定义日期。
- Create `src/components/dashboard/UsageTrendChart.vue`: 趋势 ECharts。
- Create `src/components/dashboard/AiSuccessChart.vue`: 成功率环图。
- Create `src/views/DashboardView.vue`: 概览页状态编排。
- Create `src/views/__tests__/DashboardView.spec.ts`: 并行请求和局部失败测试。

---

### Task 1: 建立 Node 20 工具链和应用入口

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.node.json`
- Modify: `index.html`
- Modify: `env.d.ts`
- Modify: `src/main.ts`
- Modify: `src/App.vue`
- Create: `vitest.config.ts`
- Replace: `src/assets/base.css`
- Replace: `src/assets/main.css`
- Delete: `src/components/HelloWorld.vue`
- Delete: `src/components/TheWelcome.vue`
- Delete: `src/components/WelcomeItem.vue`
- Delete: `src/components/icons/IconCommunity.vue`
- Delete: `src/components/icons/IconSupport.vue`
- Delete: `src/components/icons/IconTooling.vue`
- Delete: `src/components/icons/IconDocumentation.vue`
- Delete: `src/components/icons/IconEcosystem.vue`

- [ ] **Step 1: Install the runtime and test dependencies.**

Run:

```bash
npm uninstall --legacy-peer-deps --ignore-scripts @tsconfig/node24
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund vue-router pinia element-plus@2.11.8 axios echarts
npm install --save-dev --legacy-peer-deps --ignore-scripts --no-audit --no-fund @tsconfig/node20 @types/node@^20 vitest @vue/test-utils jsdom
```

Expected: `package.json` contains the six runtime libraries, the Node 20 tsconfig package, Vitest, Vue Test Utils and jsdom; `package-lock.json` is updated without npm resolution errors.

- [ ] **Step 2: Add the scripts and Node 20 engine before writing application code.**

Set the relevant `package.json` fields to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p type-check \"build-only {@}\" --",
    "preview": "vite preview",
    "build-only": "vite build",
    "type-check": "vue-tsc --build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": {
    "node": ">=20.20.2 <21"
  }
}
```

Keep the existing Vue/Vite build scripts; only add the test scripts and replace the Node 22/24 constraint.

- [ ] **Step 3: Make the Node-side TypeScript config use Node 20.**

In `tsconfig.node.json`, replace the first line of the `extends` value with:

```json
"extends": "@tsconfig/node20/tsconfig.json"
```

Keep the existing include paths and bundler compiler options. Do not add Node 24 types back through another dependency.

- [ ] **Step 4: Configure the development proxy and test environment.**

Add the proxy to `vite.config.ts` while retaining the Vue plugin, devtools plugin and `@` alias. Read Vite environment files through `loadEnv` rather than `process.env`:

```ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL ?? 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
```

Merge this `server` block and `loadEnv` callback into the existing Vue plugin, devtools plugin and `@` alias configuration instead of replacing those entries.

Create `vitest.config.ts` with the same alias and Vue transform:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.spec.ts'],
  },
})
```

- [ ] **Step 5: Declare environment variables and update the document shell.**

Extend `env.d.ts` with:

```ts
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BACKEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Set `index.html` to `lang="zh-CN"` and `<title>AI Chat 管理后台</title>` while preserving the viewport and `#app` mount point.

- [ ] **Step 6: Replace the starter entry with the application shell.**

`src/main.ts` should create one Pinia instance and install the router and Element Plus before mounting:

```ts
import 'element-plus/dist/index.css'
import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

`src/App.vue` should contain only:

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>
```

- [ ] **Step 7: Replace starter CSS with the approved design tokens.**

Define in `src/assets/base.css` the background, surface, sidebar, primary, success, warning, danger, border and text variables; reset `box-sizing`, body margin, font stack and minimum viewport height. In `src/assets/main.css`, import `base.css`, set `#app` to `min-height: 100vh`, and do not keep the starter two-column grid or dark-mode auto-switch.

- [ ] **Step 8: Verify the empty shell before continuing.**

Run:

```bash
npm run type-check
npm run test -- --passWithNoTests
npm run build
```

Expected: all three commands exit with status 0. The development server may show only an empty router view until Task 4 creates routes.

- [ ] **Step 9: Commit the tooling boundary.**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.node.json index.html env.d.ts src/main.ts src/App.vue src/assets/base.css src/assets/main.css vitest.config.ts

git commit -m "chore: establish admin frontend foundation"
```

Do not stage unrelated files.

---

### Task 2: Add domain types and pure utility behavior with tests first

**Files:**
- Create: `src/types/api.ts`
- Create: `src/types/auth.ts`
- Create: `src/types/dashboard.ts`
- Create: `src/utils/auth-storage.ts`
- Create: `src/utils/date.ts`
- Create: `src/utils/permission.ts`
- Create: `src/utils/__tests__/auth-storage.spec.ts`
- Create: `src/utils/__tests__/date.spec.ts`
- Create: `src/utils/__tests__/permission.spec.ts`

- [ ] **Step 1: Define the failing date and permission tests.**

Create `src/utils/__tests__/date.spec.ts` with explicit local-date expectations:

```ts
import { describe, expect, it } from 'vitest'
import { getDefaultDateRange, toBackendDateRange, validateDateRange } from '@/utils/date'

it('converts an inclusive UI range to the backend half-open range', () => {
  expect(toBackendDateRange({ from: '2026-10-01', to: '2026-10-24' }))
    .toEqual({ from: '2026-10-01', to: '2026-10-25' })
})

it('returns a 30-calendar-day inclusive range', () => {
  expect(getDefaultDateRange(new Date(2026, 9, 24)))
    .toEqual({ from: '2026-09-25', to: '2026-10-24' })
})

describe('validateDateRange', () => {
  it('rejects a reversed range', () => {
    expect(validateDateRange({ from: '2026-10-24', to: '2026-10-01' })).toBe('日期范围必须有效')
  })

  it('rejects more than 365 inclusive days', () => {
    expect(validateDateRange({ from: '2025-10-23', to: '2026-10-24' })).toBe('日期范围不能超过 365 天')
  })

  it('accepts the maximum 365 inclusive days', () => {
    expect(validateDateRange({ from: '2025-10-25', to: '2026-10-24' })).toBeNull()
  })
})
```

Create `src/utils/__tests__/permission.spec.ts` with these cases:

```ts
import { expect, it } from 'vitest'
import { hasPermission, hasAnyPermission } from '@/utils/permission'

it('matches an exact permission code', () => {
  expect(hasPermission(['admin:dashboard:read'], 'admin:dashboard:read')).toBe(true)
  expect(hasPermission([], 'admin:dashboard:read')).toBe(false)
})

it('requires every code when checking a list', () => {
  expect(hasPermission(['a', 'b'], ['a', 'b'])).toBe(true)
  expect(hasPermission(['a'], ['a', 'b'])).toBe(false)
})

it('matches any code for alternatives', () => {
  expect(hasAnyPermission(['system:user:read'], ['admin:dashboard:read', 'system:user:read'])).toBe(true)
  expect(hasAnyPermission([], ['admin:dashboard:read'])).toBe(false)
})
```

Run `npm run test -- src/utils/__tests__/date.spec.ts src/utils/__tests__/permission.spec.ts`. Expected: FAIL because the utility modules do not exist.

- [ ] **Step 2: Define the authentication storage test.**

Create `src/utils/__tests__/auth-storage.spec.ts`:

```ts
import { beforeEach, expect, it } from 'vitest'
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
```

Run the single file and expect it to fail until the storage module exists.

- [ ] **Step 3: Implement the shared types.**

`src/types/api.ts` must define:

```ts
export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

export interface ApiErrorPayload {
  success?: boolean
  code?: string
  message?: string
}

export interface ApiErrorDetails {
  status: number
  code: string
  message: string
}
```

`src/types/auth.ts` must define `AuthToken`, `User`, `LoginRequest`, `LoginResponse`, and `CurrentUser`, with `CurrentUser` extending the user fields and adding `roleCodes: string[]` and `permissionCodes: string[]`. Keep nullable backend time/avatar fields typed as `string | null`.

`src/types/dashboard.ts` must define `DateRange`, `DashboardOverview`, `DashboardTrendItem`, and:

```ts
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}
```

Use the exact backend field names: `totalUsers`, `totalSessions`, `aiCalls`, `totalTokens`, `successfulAiCalls`, `failedAiCalls`, `aiSuccessRate`, and trend fields `date`, `activeUsers`, `newSessions` plus the remaining documented numeric fields.

- [ ] **Step 4: Implement date and permission utilities minimally.**

`src/utils/date.ts` must expose:

```ts
export function getDefaultDateRange(today: Date): DateRange
export function toBackendDateRange(range: DateRange): DateRange
export function validateDateRange(range: DateRange): string | null
```

Use local `Date(year, month, day)` arithmetic. `getDefaultDateRange` subtracts 29 calendar days. `toBackendDateRange` keeps `from` and adds one day to `to`. `validateDateRange` rejects `to < from` and spans greater than 365 inclusive days; it returns the Chinese error string used in the tests or `null`.

`src/utils/permission.ts` must expose `hasPermission(codes, required)` where a string is one required code and an array requires every code, plus `hasAnyPermission(codes, candidates)` where any candidate is sufficient. Empty required arrays return true for `hasPermission`; empty candidates return false for `hasAnyPermission`.

Run the utility tests and expect PASS.

- [ ] **Step 5: Implement token storage and pass its tests.**

`src/utils/auth-storage.ts` must use the exact key `ai-chat-admin.token`, store JSON `{ tokenName, tokenValue }`, return `null` for missing or malformed values, and expose `writeStoredToken`, `readStoredToken`, and `clearStoredToken`.

Run:

```bash
npm run test -- src/utils/__tests__
```

Expected: all storage, date and permission tests pass.

- [ ] **Step 6: Commit the domain boundary.**

```bash
git add src/types src/utils

git commit -m "feat: add admin domain types and utility rules"
```

---

### Task 3: Implement the API client and endpoint modules

**Files:**
- Create: `src/api/client.ts`
- Create: `src/api/auth.ts`
- Create: `src/api/dashboard.ts`
- Create: `src/api/__tests__/client.spec.ts`

- [ ] **Step 1: Write failing API client tests.**

Test the client through an injected Axios adapter so no network is needed. Cover the dynamic header, success unwrapping, business failure, HTTP 401 and message fallback:

```ts
import { expect, it, vi } from 'vitest'
import { createApiClient } from '@/api/client'

it('uses the token name returned by login', async () => {
  let requestHeaders: Record<string, unknown> = {}
  const client = createApiClient({
    readToken: () => ({ tokenName: 'x-auth', tokenValue: 'secret' }),
    onUnauthorized: vi.fn(),
  })
  client.defaults.adapter = async (config) => {
    requestHeaders = Object.fromEntries(Object.entries(config.headers ?? {}))
    return { data: { success: true, code: 'SUCCESS', message: 'OK', data: { id: 1 } }, status: 200, statusText: 'OK', headers: {}, config }
  }

  await expect(client.get('/auth/me')).resolves.toEqual({ id: 1 })
  expect(requestHeaders['x-auth']).toBe('secret')
})

it('raises an ApiError for a business failure', async () => {
  const client = createApiClient({ readToken: () => null, onUnauthorized: vi.fn() })
  client.defaults.adapter = async (config) => ({
    data: { success: false, code: 'VALIDATION_ERROR', message: '日期无效', data: null },
    status: 400, statusText: 'Bad Request', headers: {}, config,
  })
  await expect(client.get('/admin/dashboard/overview')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: '日期无效' })
})

it('clears authentication through the callback on 401', async () => {
  const onUnauthorized = vi.fn()
  const client = createApiClient({ readToken: () => null, onUnauthorized })
  client.defaults.adapter = async (config) => ({
    data: { success: false, code: 'UNAUTHENTICATED', message: '登录已过期', data: null },
    status: 401, statusText: 'Unauthorized', headers: {}, config,
  })
  await expect(client.get('/auth/me')).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })
  expect(onUnauthorized).toHaveBeenCalledOnce()
})
```

Run the file and expect FAIL because `createApiClient` does not exist.

- [ ] **Step 2: Implement the client with an injectable authentication boundary.**

`src/api/client.ts` must expose `ApiError`, `ApiClient`, `createApiClient`, `configureApiClient`, `apiClient`, and `getApiErrorMessage`:

```ts
export interface ApiClientOptions {
  readToken: () => AuthToken | null
  onUnauthorized: () => void
}

export interface ApiClient {
  defaults: AxiosInstance['defaults']
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
}

export function createApiClient(options: ApiClientOptions): ApiClient
export function configureApiClient(options: ApiClientOptions): void
export const apiClient: ApiClient
export function getApiErrorMessage(error: unknown): string
```

`ApiError` extends `Error` and stores `status`, `code`, and `message` from `ApiErrorDetails`. `createApiClient` creates an isolated configured instance for tests. The exported `apiClient` is the instance used by endpoint modules; its `get` and `post` methods return unwrapped data while exposing Axios defaults so tests can inject an adapter. `configureApiClient` updates the module-level `readToken` and `onUnauthorized` callbacks used by its interceptors, without registering duplicate interceptors. `getApiErrorMessage` returns an `ApiError.message` or the stable fallback `请求失败，请稍后重试`.

Create the Axios instance with `baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api'`. The request interceptor adds `config.headers[tokenName] = tokenValue` only when a token exists. The response success interceptor returns `response.data.data` when `success` is true and throws `ApiError` otherwise. The response error interceptor reads the server payload, calls `onUnauthorized` exactly once for status 401, and throws `ApiError` with `status`, `code`, and the server message or a status-based fallback.

Do not put a fixed `satoken` header in this module. Do not retry requests.

- [ ] **Step 3: Add the endpoint wrappers.**

`src/api/auth.ts` must export functions with these signatures and paths:

```ts
export function login(payload: LoginRequest): Promise<LoginResponse>
export function getCurrentUser(): Promise<CurrentUser>
export function logout(): Promise<null>
export function logoutAll(): Promise<null>
```

Use `POST auth/login`, `GET auth/me`, `POST auth/logout`, and `POST auth/logout-all` against the already configured `/api` base URL.

`src/api/dashboard.ts` must export:

```ts
export function getDashboardOverview(range: DateRange): Promise<DashboardOverview>
export function getDashboardTrend(range: DateRange): Promise<DashboardTrendItem[]>
```

Build query parameters with `toBackendDateRange(range)` and call `GET admin/dashboard/overview` and `GET admin/dashboard/trend`. The API wrapper must not mutate the caller’s range.

- [ ] **Step 4: Test the dashboard wrappers’ half-open query parameters and run API checks.**

In `src/api/__tests__/dashboard.spec.ts`, spy on the exported `apiClient.get` method and verify the wrapper converts the inclusive end date without mutating the input:

```ts
it('sends the inclusive UI range as a half-open query range', async () => {
  const range = { from: '2026-10-01', to: '2026-10-24' }
  const get = vi.spyOn(apiClient, 'get').mockResolvedValue({} as DashboardOverview)
  await getDashboardOverview(range)
  expect(get).toHaveBeenCalledWith('admin/dashboard/overview', {
    params: { from: '2026-10-01', to: '2026-10-25' },
  })
  expect(range).toEqual({ from: '2026-10-01', to: '2026-10-24' })
})
```

Run:

```bash
npm run test -- src/api/__tests__
npm run type-check
```

Expected: client and dashboard API tests PASS and type-check exits 0.

- [ ] **Step 5: Commit the API layer.**

```bash
git add src/api

git commit -m "feat: add authenticated admin API client"
```

---

### Task 4: Build the authentication Store and route guards

**Files:**
- Create: `src/stores/auth.ts`
- Create: `src/stores/__tests__/auth.spec.ts`
- Create: `src/router/index.ts`
- Create: `src/router/__tests__/guards.spec.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write Store tests for login, initialization and clear.**

Mock `@/api/auth` and use a fresh Pinia per test. Cover these exact transitions:

```ts
it('stores the dynamic token and current user after login', async () => {
  vi.mocked(authApi.login).mockResolvedValue({
    tokenName: 'x-auth', tokenValue: 'secret',
    user: { id: 1, username: 'admin', nickname: '管理员', status: 1, avatar: null, email: null, phone: null, lastLoginTime: null, createTime: '2026-10-24T09:00:00' },
  })
  vi.mocked(authApi.getCurrentUser).mockResolvedValue({
    id: 1,
    username: 'admin',
    nickname: '管理员',
    email: null,
    phone: null,
    avatar: null,
    status: 1,
    lastLoginTime: null,
    createTime: '2026-10-24T09:00:00',
    roleCodes: ['admin'],
    permissionCodes: ['admin:dashboard:read'],
  })
  const store = useAuthStore(createPinia())
  await store.login({ username: 'admin', password: 'password123' })
  expect(store.token).toEqual({ tokenName: 'x-auth', tokenValue: 'secret' })
  expect(store.hasPermission('admin:dashboard:read')).toBe(true)
})

it('clears token and user when initialization gets a 401', async () => {
  vi.mocked(authApi.getCurrentUser).mockRejectedValue(new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'expired' }))
  writeStoredToken({ tokenName: 'x-auth', tokenValue: 'secret' })
  const store = useAuthStore(createPinia())
  await store.initialize()
  expect(store.isAuthenticated).toBe(false)
  expect(readStoredToken()).toBeNull()
})
```

Run the Store test and expect FAIL before the Store exists.

- [ ] **Step 2: Implement the setup-style auth Store.**

`src/stores/auth.ts` must expose reactive `token`, `user`, `initialized`, computed `roleCodes`, `permissionCodes`, `isAuthenticated`, `hasPermission`, `hasAnyPermission`, and methods `login`, `initialize`, `logout`, `logoutAll`, `clear`.

The required behavior is:

```ts
async function login(payload: LoginRequest) {
  const result = await authApi.login(payload)
  token.value = { tokenName: result.tokenName, tokenValue: result.tokenValue }
  writeStoredToken(token.value)
  await initialize()
}

async function initialize() {
  if (!token.value) {
    initialized.value = true
    return
  }
  try {
    user.value = await authApi.getCurrentUser()
  } catch {
    clear()
  } finally {
    initialized.value = true
  }
}
```

On Store creation initialize `token` from `readStoredToken()`. `logout` and `logoutAll` call the corresponding endpoint when authenticated, then always call `clear()` in `finally`. `clear()` sets token/user to null and removes persisted storage.

- [ ] **Step 3: Define route metadata and first-accessible-path resolution.**

`src/router/index.ts` must define `/login`, `/dashboard`, `/forbidden`, and `/` routes. `/dashboard` uses `AdminLayout` and has `meta: { requiresAuth: true, permission: 'admin:dashboard:read' }`; `/forbidden` requires authentication but no permission.

Export a pure function:

```ts
export function getFirstAccessiblePath(permissionCodes: string[]): '/dashboard' | '/forbidden'
```

It returns `/dashboard` when the code is present and `/forbidden` otherwise.

- [ ] **Step 4: Write and run guard tests before implementing the guard.**

Create `src/router/__tests__/guards.spec.ts` using `createMemoryHistory`, a fresh Pinia and mocked `auth.initialize`. Verify:

- unauthenticated `/dashboard` redirects to `/login?redirect=%2Fdashboard`;
- authenticated `/login` redirects to `/dashboard` when permission exists;
- authenticated `/dashboard` redirects to `/forbidden` without permission;
- `/` redirects to the first accessible path.

Run the file and expect failures until `beforeEach` is implemented.

- [ ] **Step 5: Implement the asynchronous navigation guard.**

The guard must await `auth.initialize()` before evaluating route metadata. It must preserve only the target path in the `redirect` query, avoid redirecting `/login` to itself, and use `getFirstAccessiblePath` for `/`. It must never send an authenticated user without permissions to a protected page.

- [ ] **Step 6: Wire API unauthorized handling to the Store.**

In `src/main.ts`, create Pinia before the API client configuration, obtain `useAuthStore(pinia)`, and configure the client with:

```ts
configureApiClient({
  readToken: () => auth.token,
  onUnauthorized: () => auth.clear(),
})
```

Keep router installation after the Store and client are configured so the first protected navigation sees the correct initialization state.

- [ ] **Step 7: Run authentication tests and commit.**

Run:

```bash
npm run test -- src/stores/__tests__ src/router/__tests__
npm run type-check
```

Expected: all Store and guard tests PASS and type-check exits 0.

```bash
git add src/stores src/router src/main.ts
git commit -m "feat: add admin authentication and route guards"
```

---

### Task 5: Implement the login page, backend layout and no-permission page

**Files:**
- Create: `src/layouts/AdminLayout.vue`
- Create: `src/components/layout/Sidebar.vue`
- Create: `src/components/layout/Topbar.vue`
- Create: `src/views/LoginView.vue`
- Create: `src/views/ForbiddenView.vue`
- Create: `src/views/__tests__/LoginView.spec.ts`
- Modify: `src/assets/main.css`

- [ ] **Step 1: Write the login interaction test.**

Mount `LoginView` with a real test Pinia, a spied Store method and a memory router; do not inject an arbitrary `auth` object because the component uses `useAuthStore()`. Verify empty username/password prevents submission, Enter submits valid credentials, the button is disabled while pending, and a rejected login renders the backend message while keeping the username field:

```ts
it('submits valid credentials and preserves the username on failure', async () => {
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/login', component: LoginView }] })
  await router.push('/login')
  await router.isReady()
  const login = vi.spyOn(auth, 'login').mockRejectedValue(
    new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' }),
  )
  const wrapper = mount(LoginView, { global: { plugins: [pinia, router] } })
  await wrapper.get('input[name="username"]').setValue('admin')
  await wrapper.get('input[name="password"]').setValue('password123')
  await wrapper.get('input[name="password"]').trigger('keyup.enter')
  await flushPromises()
  expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' })
  expect(wrapper.text()).toContain('用户名或密码错误')
  expect(wrapper.get('input[name="username"]').element.value).toBe('admin')
})
```

Mock Element Plus form components only where necessary; test the actual input names and button disabled state.

- [ ] **Step 2: Implement `LoginView.vue`.**

Use an `el-card` centered in the viewport with the approved branding. The form model is `{ username: '', password: '' }`; validation rules require both fields, cap username at 50 characters and password at 72 characters. Use `el-input` with `show-password` for the password, `@keyup.enter` to submit, and `el-button :loading="submitting" :disabled="submitting"`.

The submit function must call `auth.login(form)`, then `router.replace(route.query.redirect ?? getFirstAccessiblePath(auth.permissionCodes))`. Catch `ApiError` and display its message through `ElMessage.error`; do not clear the username or password fields after a failed request.

- [ ] **Step 3: Implement the sidebar and topbar with permission filtering.**

`Sidebar.vue` receives the auth Store and renders these groups:

```ts
const navigationGroups = [
  { label: '工作台', items: [{ label: '运营概览', path: '/dashboard', permission: 'admin:dashboard:read' }] },
  { label: '系统管理', items: [] },
  { label: 'AI 配置', items: [] },
  { label: '数据分析', items: [] },
]
```

Filter items with `hasPermission`; do not render empty groups. Highlight the route matching `useRoute().path`. On widths below 900px, collapse to an icon rail and expose an `aria-label="展开导航"` button.

`Topbar.vue` displays the current route title, a help button with an accessible name, the current nickname/username, and an `el-dropdown` with “退出当前会话” and “退出全部会话”. Each action awaits the corresponding Store method and then routes to `/login`.

- [ ] **Step 4: Implement `AdminLayout.vue` and `ForbiddenView.vue`.**

`AdminLayout.vue` composes `Sidebar`, `Topbar` and `<RouterView />` in a full-height grid. The content area must scroll independently and never create a page-wide horizontal scrollbar.

`ForbiddenView.vue` states that the account has no available backend permission and provides a button to call `getFirstAccessiblePath(auth.permissionCodes)`; if it resolves back to `/forbidden`, the button returns to `/login` after clearing the Store.

- [ ] **Step 5: Add responsive and focus styles.**

Add styles for the dark sidebar, pale content background, white cards, 8px radii, primary/focus colors, disabled controls, and a media query at 900px that changes the sidebar width and at 640px that reduces content padding. Every icon-only control must have an `aria-label`; keyboard focus must remain visible.

- [ ] **Step 6: Run view tests and commit.**

Run:

```bash
npm run test -- src/views/__tests__/LoginView.spec.ts
npm run type-check
```

Expected: login interaction tests PASS and type-check exits 0.

```bash
git add src/layouts src/components/layout src/views/LoginView.vue src/views/ForbiddenView.vue src/views/__tests__ src/assets/main.css
git commit -m "feat: add admin shell and login flow"
```

---

### Task 6: Implement the dashboard data components and partial-failure behavior

**Files:**
- Create: `src/components/dashboard/MetricCard.vue`
- Create: `src/components/dashboard/DateRangePicker.vue`
- Create: `src/components/dashboard/UsageTrendChart.vue`
- Create: `src/components/dashboard/AiSuccessChart.vue`
- Create: `src/views/DashboardView.vue`
- Create: `src/views/__tests__/DashboardView.spec.ts`

- [ ] **Step 1: Write Dashboard tests for parallel requests and independent errors.**

Mock `getDashboardOverview` and `getDashboardTrend`. The first test must assert both functions are called before either result is awaited; the second must resolve overview and reject trend and verify metric values remain visible with a retry message; the third must verify a valid date change sends `to` as the next day.

Use fixtures matching the backend fields:

```ts
const overview = {
  totalUsers: 12_846, totalSessions: 38_291, aiCalls: 96_420, totalTokens: 8_600_000,
  successfulAiCalls: 79_055, failedAiCalls: 17_365, aiSuccessRate: 0.82,
}
const trend = [{ date: '2026-10-24', activeUsers: 420, newSessions: 180, newUsers: 35, messages: 900, aiCalls: 210, successfulAiCalls: 190, totalTokens: 24000 }]
```

Run the file and expect FAIL until the dashboard view exists.

- [ ] **Step 2: Implement `MetricCard.vue` and the date range component.**

`MetricCard.vue` accepts `{ label: string, value: string, trend?: string, tone?: 'default' | 'success' | 'warning' }` and renders a semantic article with a visible label and value.

`DateRangePicker.vue` accepts `modelValue: DateRange`, emits `update:modelValue` only after a complete selection, and emits `confirm`. It provides shortcuts for 7, 30 and 90 days. On confirm, call `validateDateRange`; when it returns a message, emit `invalid` and do not trigger a load. The custom picker displays the inclusive UI dates.

- [ ] **Step 3: Implement the chart components with explicit lifecycle cleanup.**

`UsageTrendChart.vue` accepts `items: DashboardTrendItem[]` and `loading: boolean`. On mount, initialize ECharts on a `ref<HTMLDivElement>`, set two line series using `activeUsers` and `newSessions`, and use `date` as the category axis. Watch `items` and update the option; register a resize listener and remove it in `onBeforeUnmount`, then call `chart.dispose()`.

`AiSuccessChart.vue` accepts `successRate`, `successfulCalls`, and `failedCalls`; render a donut series with success and failure values, a centered percentage label, and a legend. Dispose the chart in `onBeforeUnmount`. When no calls exist, show a zero-state instead of a misleading success ring.

- [ ] **Step 4: Implement `DashboardView.vue` local state and loaders.**

Import `getApiErrorMessage` from `@/api/client` alongside the dashboard API functions. Use this state shape:

```ts
const range = ref<DateRange>(getDefaultDateRange(new Date()))
const overviewState = reactive<AsyncState<DashboardOverview>>({ data: null, loading: false, error: null })
const trendState = reactive<AsyncState<DashboardTrendItem[]>>({ data: null, loading: false, error: null })
```

Implement one `loadDashboard()` function that creates both promises before awaiting:

```ts
async function loadDashboard() {
  const validationError = validateDateRange(range.value)
  if (validationError) {
    overviewState.error = validationError
    trendState.error = validationError
    return
  }

  overviewState.loading = true
  trendState.loading = true
  overviewState.error = null
  trendState.error = null
  const overviewPromise = getDashboardOverview(range.value)
  const trendPromise = getDashboardTrend(range.value)
  const [overviewResult, trendResult] = await Promise.allSettled([overviewPromise, trendPromise])
  overviewState.loading = false
  trendState.loading = false
  if (overviewResult.status === 'fulfilled') overviewState.data = overviewResult.value
  else overviewState.error = getApiErrorMessage(overviewResult.reason)
  if (trendResult.status === 'fulfilled') trendState.data = trendResult.value
  else trendState.error = getApiErrorMessage(trendResult.reason)
}
```

Call `loadDashboard()` on mount and after `DateRangePicker` emits `confirm`. Keep previously successful data during refresh. Render four metric cards, the trend panel, the AI success panel, loading indicators, empty states and independent retry buttons.

- [ ] **Step 5: Add dashboard formatting and accessibility.**

Format large values with `Intl.NumberFormat('zh-CN')`, format total tokens with a readable compact value only in the display layer, and format `aiSuccessRate` as a percentage from the backend decimal. Provide headings for each panel, descriptive chart containers, and text alternatives for the success count and failure count. Never use array index to pair trend data with other date series.

- [ ] **Step 6: Complete the dashboard tests.**

Mock ECharts with an object exposing `init`, `setOption`, `resize`, `dispose`, and `on` so jsdom does not require a real canvas. Run:

```bash
npm run test -- src/views/__tests__/DashboardView.spec.ts
```

Expected: tests verify both API calls, successful metrics, a trend-only error and retry behavior. Half-open query conversion is covered by `src/api/__tests__/dashboard.spec.ts`.

- [ ] **Step 7: Commit the dashboard slice.**

```bash
git add src/components/dashboard src/views/DashboardView.vue src/views/__tests__/DashboardView.spec.ts
git commit -m "feat: add dashboard overview and charts"
```

---

### Task 7: Integrate, run Node 20 verification, and perform browser acceptance

**Files:**
- Modify: `src/router/index.ts` if route nesting or redirects need integration fixes.
- Modify: `src/main.ts` if API client, Store and router initialization order needs correction.
- Modify: `src/assets/base.css`, `src/assets/main.css` for verified responsive issues.
- Modify: `README.md` with local startup and backend proxy instructions.
- Create: `.env.example` with non-secret local defaults.

- [ ] **Step 1: Add safe local environment documentation.**

Create `.env.example` containing only:

```dotenv
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://localhost:8080
```

Do not include credentials, API keys or tokens. Update `README.md` with:

```sh
npm install
npm run dev
```

and state that the backend is expected at `http://localhost:8080`, while the frontend sends requests through the `/api` development proxy.

- [ ] **Step 2: Run the complete automated verification under Node 20.20.2.**

Use the project’s Node 20.20.2 runtime and run:

```bash
node --version
npm ci
npm run test
npm run type-check
npm run build
```

Expected: the version begins with `v20.20.2`; all Vitest suites pass; Vue type-check exits 0; Vite production build exits 0. If a failure occurs, fix the underlying type, test, or runtime issue rather than bypassing the check.

- [ ] **Step 3: Start the real frontend and exercise the browser golden path.**

Run `npm run dev -- --host 127.0.0.1`, open the printed URL, and verify against a running backend:

1. `/login` renders without console errors.
2. Invalid credentials show the backend message and preserve form input.
3. Valid credentials save the backend’s dynamic token name and value, call `/api/auth/me`, and enter `/dashboard`.
4. Refreshing `/dashboard` restores the session through `/api/auth/me`.
5. `/api/admin/dashboard/overview` and `/api/admin/dashboard/trend` are requested with the selected closed-to-open date range.
6. A failure from either statistics request leaves the other panel usable and offers a local retry.
7. Logout and logout-all return to `/login` and remove local storage.
8. A user lacking `admin:dashboard:read` reaches `/forbidden`, and no unauthorized sidebar item is visible.

- [ ] **Step 4: Verify responsive layout and browser cleanup.**

Check the page at 1280px, 900px, 640px and a narrow mobile viewport. Confirm the sidebar collapses, the dashboard does not create an overall horizontal scrollbar, focus rings remain visible, icon-only buttons have accessible names, and charts resize without duplicate canvas instances.

- [ ] **Step 5: Review the final diff and commit integration fixes.**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Inspect every changed file for secrets, accidental starter components, hardcoded `satoken`, fake dashboard data or unrequested features. If integration changes are needed:

```bash
git add README.md .env.example src/router/index.ts src/main.ts src/assets/base.css src/assets/main.css

git commit -m "chore: verify admin dashboard integration"
```

Do not commit `.env` files containing local secrets, `dist/`, coverage output or visual brainstorming artifacts.

---

## Plan self-review

- **Spec coverage:** Tasks 1 and 7 cover Node 20, Vite proxy, dependencies, build and browser verification. Tasks 2–4 cover API unwrapping, dynamic Token Header, authentication initialization, 401/403 behavior, permissions, route selection and date conversion. Task 5 covers login, layout, no-permission page, sidebar filtering, logout and responsive/accessibility rules. Task 6 covers parallel dashboard requests, four metrics, trends, AI success rate, independent errors, retry and ECharts cleanup. The specified non-goals remain outside every task.
- **Placeholder scan:** The plan contains no `TODO`, `TBD`, “implement later”, or undefined follow-up. Every task names exact files, commands and expected outcomes.
- **Type consistency:** `AuthToken`, `DateRange`, `AsyncState<T>`, `DashboardOverview`, `DashboardTrendItem`, `ApiError`, `createApiClient`, `getFirstAccessiblePath`, and Store method names are used consistently across tasks.
- **Scope check:** The plan contains one vertical slice only. User/RBAC/AI configuration/secondary analytics are explicitly deferred to later plans.
