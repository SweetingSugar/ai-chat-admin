import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import Sidebar from '@/components/layout/Sidebar.vue'
import sidebarSource from '@/components/layout/Sidebar.vue?raw'
import { useAuthStore } from '@/stores/auth'

const routeComponent = { template: '<div />' }
const routes = [
  { path: '/dashboard', component: routeComponent },
  { path: '/system/users', component: routeComponent },
  { path: '/system/roles', component: routeComponent },
  { path: '/system/permissions', component: routeComponent },
  { path: '/system/files', component: routeComponent },
  { path: '/system/knowledge-bases', component: routeComponent },
  { path: '/ai/providers', component: routeComponent },
  { path: '/ai/models', component: routeComponent },
  { path: '/tools', component: routeComponent },
  { path: '/tools/mcp-servers', component: routeComponent },
  { path: '/tools/invocation-logs', component: routeComponent },
]
const permissionCodes = [
  'admin:dashboard:read',
  'system:user:read',
  'system:role:read',
  'system:permission:read',
  'file:read',
  'ai:provider:read',
  'ai:model:read',
]

async function mountSidebar(extraPermissionCodes: string[] = []) {
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
    permissionCodes: [...permissionCodes, ...extraPermissionCodes],
  }
  await router.push('/dashboard')
  await router.isReady()

  return mount(Sidebar, { global: { plugins: [pinia, router] } })
}

describe('Sidebar', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the same navigation structure after collapsing and expanding', async () => {
    const wrapper = await mountSidebar()
    const initialItems = wrapper.findAll('.nav-item')

    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('is-collapsed')
    expect(wrapper.text()).toContain('运营概览')
    expect(initialItems).toHaveLength(7)

    await wrapper.get('.sidebar-toggle').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).toContain('is-collapsed')
    expect(wrapper.text()).not.toContain('运营概览')
    expect(wrapper.findAll('.nav-item')).toHaveLength(7)

    await wrapper.get('.sidebar-toggle').trigger('click')
    expect(wrapper.find('.admin-sidebar').classes()).not.toContain('is-collapsed')
    expect(wrapper.text()).toContain('运营概览')
    expect(wrapper.findAll('.nav-item')).toHaveLength(7)

    wrapper.unmount()
  })

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
    expect(wrapper.findAll('.nav-item')).toHaveLength(7)

    wrapper.unmount()
  })

  it('shows knowledge-base management with knowledge-read permission', async () => {
    const wrapper = await mountSidebar(['knowledge:read'])

    expect(wrapper.text()).toContain('知识库管理')
    expect(wrapper.get('a[href="/system/knowledge-bases"]')).toBeTruthy()
    expect(wrapper.findAll('.nav-item')).toHaveLength(8)

    wrapper.unmount()
  })

  it('hides knowledge-base management without knowledge-read permission', async () => {
    const wrapper = await mountSidebar()

    expect(wrapper.text()).not.toContain('知识库管理')
    expect(wrapper.find('a[href="/system/knowledge-bases"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('shows tool navigation only for the matching read permissions', async () => {
    const wrapper = await mountSidebar([
      'tool:read',
      'tool:mcp-server:read',
      'tool:invocation:read',
    ])

    expect(wrapper.text()).toContain('工具管理')
    expect(wrapper.text()).toContain('MCP Server')
    expect(wrapper.text()).toContain('调用日志')
    expect(wrapper.find('a[href="/tools"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/tools/mcp-servers"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/tools/invocation-logs"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('hides each tool entry without its read permission', async () => {
    const wrapper = await mountSidebar(['tool:read'])

    expect(wrapper.find('a[href="/tools"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/tools/mcp-servers"]').exists()).toBe(false)
    expect(wrapper.find('a[href="/tools/invocation-logs"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
