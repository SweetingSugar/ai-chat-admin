# AI 配置管理页面布局调整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the extra AI 配置标题、说明和页签 so supplier and model management pages start with the same page header structure as user management.

**Architecture:** Keep `AiConfigLayout` as the `/ai` nested-route container so existing route guards, sidebar navigation, and child-page permissions remain unchanged. Simplify the layout to render only `RouterView`, and add a focused layout test proving child content remains while the removed header and tabs are absent.

**Tech Stack:** Vue 3, Vue Router 4, Vue Test Utils, Vitest, TypeScript, Element Plus.

---

### Task 1: Simplify the AI configuration parent layout

**Files:**
- Modify: `src/layouts/AiConfigLayout.vue:1-55`
- Create: `src/layouts/__tests__/AiConfigLayout.spec.ts`

- [ ] **Step 1: Write the failing layout regression test**

Create `src/layouts/__tests__/AiConfigLayout.spec.ts` with a memory router whose `/ai` route uses `AiConfigLayout` and whose child route renders a known supplier page marker:

```ts
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AiConfigLayout from '@/layouts/AiConfigLayout.vue'

const child = { template: '<div data-test="ai-child">供应商页面内容</div>' }

async function mountLayout(path = '/ai/providers') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/ai',
      component: AiConfigLayout,
      children: [{ path: 'providers', component: child }],
    }],
  })
  await router.push(path)
  await router.isReady()
  return mount(AiConfigLayout, { global: { plugins: [router] } })
}

describe('AiConfigLayout', () => {
  it('renders the child page without the extra AI configuration header or tabs', async () => {
    const wrapper = await mountLayout()

    expect(wrapper.find('[data-test="ai-child"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('AI 配置')
    expect(wrapper.text()).not.toContain('供应商管理')
    expect(wrapper.text()).not.toContain('模型管理')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npx vitest run src/layouts/__tests__/AiConfigLayout.spec.ts
```

Expected: FAIL because the current layout renders `AI 配置`, `供应商管理`, and `模型管理` before the child route.

- [ ] **Step 3: Implement the minimal layout change**

Replace `src/layouts/AiConfigLayout.vue` with the route-container-only implementation:

```vue
<script setup lang="ts">
</script>

<template>
  <RouterView />
</template>
```

Remove the unused `computed`, `useRoute`, and `useRouter` imports, the tab-selection function, the header and tab markup, and the scoped styles. Do not modify `src/router/index.ts`; its nested route and permission metadata must remain intact.

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npx vitest run src/layouts/__tests__/AiConfigLayout.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run the affected management tests**

Run:

```bash
npx vitest run src/layouts/__tests__/AiConfigLayout.spec.ts src/views/ai/__tests__/ProviderManagementView.spec.ts src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected: all tests PASS; supplier and model data, forms, permissions, and existing actions remain covered.

- [ ] **Step 6: Run project verification**

Run with the repository's required Node 20 toolchain:

```bash
node --version
npm run type-check
npm run test
npm run build
```

Expected: Node `v20.20.2` (or another compatible Node 20 version), followed by successful type checking, all Vitest tests passing, and a successful production build.

- [ ] **Step 7: Verify the real UI**

Start the app with `npm run dev`, open the existing local app, and visit both `/ai/providers` and `/ai/models`. Confirm each page begins with its own `PageHeader` like `/system/users`; confirm the sidebar still navigates between the two pages and refresh, create, edit, and delete controls remain available. Stop the dev server after verification.
