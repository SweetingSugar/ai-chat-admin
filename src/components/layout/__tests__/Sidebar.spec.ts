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
  { path: '/ai/providers', component: routeComponent },
  { path: '/ai/models', component: routeComponent },
]
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
})
