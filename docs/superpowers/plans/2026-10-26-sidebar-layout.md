# 侧栏布局稳定性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让侧栏在展开、收起再展开后始终保持第一张效果图的紧凑导航布局。

**Architecture:** 保留 `Sidebar.vue` 现有的响应式收起状态和宽度过渡，只让状态切换影响宽度及文本可见性。通过显式固定导航项高度、分组间距和从顶部开始的网格排列，避免内容或布局重排改变纵向尺寸；用组件测试验证切换前后的 DOM 和计算样式保持一致。

**Tech Stack:** Vue 3、TypeScript、Vue Test Utils、Vitest、Vite、Node 20.20.2。

---

## 文件结构

- Create: `src/components/layout/__tests__/Sidebar.spec.ts` — 侧栏收起/展开行为和固定尺寸约束测试。
- Modify: `src/components/layout/Sidebar.vue:82-195` — 固定侧栏导航的纵向尺寸和网格排列规则。
- No changes: 路由、权限 store、管理页面和页面内容布局。

## Task 1: 先写侧栏收起/展开的失败测试

**Files:**
- Create: `src/components/layout/__tests__/Sidebar.spec.ts`

- [ ] **Step 1: 创建可挂载侧栏的测试夹具**

使用内存路由和 Pinia，为所有现有导航项提供读取权限，并从 `/dashboard` 开始挂载：

```ts
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import Sidebar from '@/components/layout/Sidebar.vue'
import { useAuthStore } from '@/stores/auth'

const routes = [{ path: '/dashboard', component: { template: '<div />' } }]
const permissionCodes = [
  'admin:dashboard:read',
  'system:user:read',
  'system:role:read',
  'system:permission:read',
  'ai:provider:read',
  'ai:model:read',
]

async function mountSidebar() {
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes })
  const auth = useAuthStore(pinia)
  auth.user = {
    id: 1,
    username: 'admin',
    nickname: '管理员',
    email: null,
    phone: null,
    avatar: null,
    status: 1,
    lastLoginTime: null,
    createTime: '2026-10-26T00:00:00',
    roleCodes: ['admin'],
    permissionCodes,
  }
  await router.push('/dashboard')
  await router.isReady()

  return mount(Sidebar, { global: { plugins: [pinia, router] } })
}
```

- [ ] **Step 2: 添加展开状态和切换行为测试**

验证初始展开状态包含所有文字，点击收起后隐藏文字，第二次点击后恢复文字且导航项数量不变：

```ts
describe('Sidebar', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the same navigation structure after collapsing and expanding', async () => {
    const wrapper = await mountSidebar()
    const initialItems = wrapper.findAll('.nav-item')

    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('is-collapsed')
    expect(wrapper.text()).toContain('运营概览')
    expect(initialItems).toHaveLength(6)

    await wrapper.get('.sidebar-toggle').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).toContain('is-collapsed')
    expect(wrapper.text()).not.toContain('运营概览')
    expect(wrapper.findAll('.nav-item')).toHaveLength(6)

    await wrapper.get('.sidebar-toggle').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('is-collapsed')
    expect(wrapper.text()).toContain('运营概览')
    expect(wrapper.findAll('.nav-item')).toHaveLength(6)

    wrapper.unmount()
  })
})
```

- [ ] **Step 3: 添加固定尺寸在切换前后不变的测试**

使用 `Sidebar.vue?raw` 检查固定 CSS 契约，并在收起/展开后验证 DOM 结构仍保持一致。Vitest 默认不会把 Vue SFC 的 scoped CSS 注入 jsdom，因此不使用失真的 `getComputedStyle` 布局结果：

```ts
it('keeps compact navigation dimensions across state changes', async () => {
  const wrapper = await mountSidebar()
  const navItemRule = sidebarSource.match(/\.nav-item\s*\{[\s\S]*?height:\s*36px;/)?.[0]
  const sidebarNavRule = sidebarSource.match(/\.sidebar-nav\s*\{[\s\S]*?align-content:\s*start;/)?.[0]
  const navGroupRule = sidebarSource.match(/\.nav-group\s*\{[\s\S]*?align-content:\s*start;/)?.[0]

  expect(navItemRule).toBeDefined()
  expect(sidebarNavRule).toBeDefined()
  expect(navGroupRule).toBeDefined()

  await wrapper.get('.sidebar-toggle').trigger('click')
  await wrapper.get('.sidebar-toggle').trigger('click')

  expect(wrapper.find('.admin-sidebar').classes()).not.toContain('is-collapsed')
  expect(wrapper.findAll('.nav-item')).toHaveLength(6)

  wrapper.unmount()
})
```

在测试文件顶部同时引入 `import sidebarSource from '@/components/layout/Sidebar.vue?raw'`。

- [ ] **Step 4: 运行新增测试，确认在实现前失败**

Run: `npx vitest run src/components/layout/__tests__/Sidebar.spec.ts`

Expected: the structure test may pass against the existing component, while the fixed-dimension test fails because `.nav-item` has no explicit `height: 36px` and `.sidebar-nav` has no explicit `align-content: start` rule. Do not change the test to make it pass; proceed to the CSS implementation.

## Task 2: 用显式 CSS 约束固定紧凑布局

**Files:**
- Modify: `src/components/layout/Sidebar.vue:144-195`

- [ ] **Step 1: 固定导航容器和分组从顶部开始排列**

在 `.sidebar-nav` 和 `.nav-group` 中加入 `align-content: start`，保持现有 `gap: 15px` 和 `gap: 3px`：

```css
.sidebar-nav {
  display: grid;
  align-content: start;
  gap: 15px;
}

.nav-group {
  display: grid;
  align-content: start;
  gap: 3px;
}
```

- [ ] **Step 2: 将导航项固定为紧凑高度**

在 `.nav-item` 中将现有 `min-height: 36px` 改为同时声明固定高度和最小高度，确保展开及收起状态都使用同一行高：

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 36px;
  min-height: 36px;
  padding: 0 9px;
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  font-size: 13px;
}
```

不要修改 `.is-collapsed .nav-item` 的宽度规则；收起状态仍只改变宽度和文字显示。

- [ ] **Step 3: 运行侧栏测试确认实现通过**

Run: `npx vitest run src/components/layout/__tests__/Sidebar.spec.ts`

Expected: all Sidebar tests pass, including `36px` 高度和 `align-content: start` 检查。

## Task 3: 执行全量验证并检查真实交互

**Files:**
- Verify: `src/components/layout/Sidebar.vue`
- Verify: `src/components/layout/__tests__/Sidebar.spec.ts`

- [ ] **Step 1: 运行完整测试套件**

Run: `npm run test`

Expected: all existing and new tests pass with no failures.

- [ ] **Step 2: 运行 TypeScript 类型检查**

Run: `npm run type-check`

Expected: command exits with code 0 and reports no type errors.

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: type-check and Vite production build both complete successfully.

- [ ] **Step 4: 在 Node 20.20.2 下启动应用并完成浏览器检查**

Run: `node --version && npm run dev -- --host 127.0.0.1`

Expected: Node 版本为 `v20.20.2`，Vite 启动成功。打开管理后台后，依次执行“展开 → 收起 → 展开”，确认：

1. 侧栏宽度行为保持现状。
2. 导航项高度和分组间距与首次展开完全一致，呈现第一张效果图的紧凑样式。
3. 当前路由高亮、权限过滤和主内容区域没有变化。

不创建 Git 提交，除非用户明确要求提交变更。
