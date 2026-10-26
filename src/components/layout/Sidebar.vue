<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const collapsed = ref(false)

const navigationGroups = [
  {
    label: '工作台',
    items: [{ label: '运营概览', path: '/dashboard', permission: 'admin:dashboard:read' }],
  },
  {
    label: '系统管理',
    items: [
      { label: '用户管理', path: '/system/users', permission: 'system:user:read' },
      { label: '角色管理', path: '/system/roles', permission: 'system:role:read' },
      { label: '权限管理', path: '/system/permissions', permission: 'system:permission:read' },
    ],
  },
  {
    label: 'AI 配置',
    items: [
      { label: '供应商管理', path: '/ai/providers', permission: 'ai:provider:read' },
      { label: '模型管理', path: '/ai/models', permission: 'ai:model:read' },
    ],
  },
  { label: '数据分析', items: [] },
]

const visibleGroups = computed(() =>
  navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => auth.hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0),
)

function isActive(path: string): boolean {
  return route.path === path
}
</script>

<template>
  <aside class="admin-sidebar" :class="{ 'is-collapsed': collapsed }">
    <div class="sidebar-brand">
      <span class="brand-mark">AI</span>
      <span v-if="!collapsed" class="brand-name">AI Chat Admin</span>
    </div>
    <button
      class="sidebar-toggle"
      type="button"
      :aria-label="collapsed ? '展开导航' : '收起导航'"
      @click="collapsed = !collapsed"
    >
      <span aria-hidden="true">{{ collapsed ? '→' : '←' }}</span>
      <span v-if="!collapsed">收起导航</span>
    </button>
    <nav class="sidebar-nav" aria-label="主导航">
      <section v-for="group in visibleGroups" :key="group.label" class="nav-group">
        <h2 v-if="!collapsed" class="nav-group-label">{{ group.label }}</h2>
        <RouterLink
          v-for="item in group.items"
          :key="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          :to="item.path"
          :title="collapsed ? item.label : undefined"
        >
          <span class="nav-mark" aria-hidden="true">•</span>
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </section>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  display: flex;
  flex-direction: column;
  width: 232px;
  min-height: 100vh;
  padding: 22px 14px;
  color: var(--color-sidebar-text);
  background: var(--color-sidebar);
  transition: width 0.15s ease;
}

.admin-sidebar.is-collapsed {
  width: 72px;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 34px;
  padding: 0 8px 22px;
  color: #fff;
}

.brand-mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  color: #fff;
  background: var(--color-primary);
  font-size: 11px;
  font-weight: 800;
}

.brand-name {
  white-space: nowrap;
  font-size: 15px;
  font-weight: 700;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 30px;
  margin-bottom: 12px;
  border: 0;
  border-radius: var(--radius-sm);
  color: #aebed6;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
}

.sidebar-toggle:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-nav {
  display: grid;
  gap: 15px;
}

.nav-group {
  display: grid;
  gap: 3px;
}

.nav-group-label {
  margin: 0 8px 4px;
  color: #8296b6;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 36px;
  padding: 0 9px;
  border-radius: var(--radius-sm);
  color: var(--color-sidebar-text);
  font-size: 13px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  color: #fff;
  background: var(--color-primary);
  font-weight: 600;
}

.nav-mark {
  color: currentColor;
  font-size: 18px;
  line-height: 0;
}

.is-collapsed .sidebar-toggle,
.is-collapsed .nav-item {
  width: 42px;
  margin-right: auto;
  margin-left: auto;
}

@media (max-width: 900px) {
  .admin-sidebar {
    width: 72px;
  }

  .admin-sidebar:not(.is-collapsed) {
    width: 232px;
  }
}
</style>
