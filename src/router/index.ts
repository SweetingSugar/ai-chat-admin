import {
  createRouter,
  createWebHistory,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'
import ForbiddenView from '@/views/ForbiddenView.vue'
import UserManagementView from '@/views/system/UserManagementView.vue'
import RoleManagementView from '@/views/system/RoleManagementView.vue'
import PermissionManagementView from '@/views/system/PermissionManagementView.vue'
import FileManagementView from '@/views/system/FileManagementView.vue'
import AiConfigLayout from '@/layouts/AiConfigLayout.vue'
import ProviderManagementView from '@/views/ai/ProviderManagementView.vue'
import ModelManagementView from '@/views/ai/ModelManagementView.vue'
import { useAuthStore } from '@/stores/auth'

export const routes: RouteRecordRaw[] = [
  { path: '/login', component: LoginView, meta: { guestOnly: true, title: '登录' } },
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        component: DashboardView,
        meta: { requiresAuth: true, permission: 'admin:dashboard:read', title: '运营概览' },
      },
      {
        path: 'system/users',
        component: UserManagementView,
        meta: { requiresAuth: true, permission: 'system:user:read', title: '用户管理' },
      },
      {
        path: 'system/roles',
        component: RoleManagementView,
        meta: { requiresAuth: true, permission: 'system:role:read', title: '角色管理' },
      },
      {
        path: 'system/permissions',
        component: PermissionManagementView,
        meta: { requiresAuth: true, permission: 'system:permission:read', title: '权限管理' },
      },
      {
        path: 'system/files',
        component: FileManagementView,
        meta: { requiresAuth: true, permission: 'file:read', title: '文件管理' },
      },
      {
        path: 'ai',
        component: AiConfigLayout,
        meta: { requiresAuth: true, title: 'AI 配置' },
        children: [
          { path: '', redirect: 'providers' },
          {
            path: 'providers',
            component: ProviderManagementView,
            meta: { requiresAuth: true, permission: 'ai:provider:read', title: '供应商管理' },
          },
          {
            path: 'models',
            component: ModelManagementView,
            meta: { requiresAuth: true, permission: 'ai:model:read', title: '模型管理' },
          },
        ],
      },
      {
        path: 'forbidden',
        component: ForbiddenView,
        meta: { requiresAuth: true, title: '无权限' },
      },
    ],
  },
]

const accessibleEntries = [
  ['/dashboard', 'admin:dashboard:read'],
  ['/system/users', 'system:user:read'],
  ['/system/roles', 'system:role:read'],
  ['/system/permissions', 'system:permission:read'],
  ['/system/files', 'file:read'],
  ['/ai/providers', 'ai:provider:read'],
  ['/ai/models', 'ai:model:read'],
] as const

export function getFirstAccessiblePath(permissionCodes: string[]): string {
  return accessibleEntries.find(([, permission]) => permissionCodes.includes(permission))?.[0] ?? '/forbidden'
}

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  const router = createRouter({ history, routes })

  router.beforeEach(async (to): Promise<RouteLocationRaw | true> => {
    const auth = useAuthStore()
    await auth.initialize()

    if (to.path === '/') {
      return auth.isAuthenticated ? getFirstAccessiblePath(auth.permissionCodes) : '/login'
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && auth.isAuthenticated) {
      return getFirstAccessiblePath(auth.permissionCodes)
    }

    const requiredPermission = to.meta.permission
    if (typeof requiredPermission === 'string' && !auth.hasPermission(requiredPermission)) {
      return '/forbidden'
    }

    return true
  })

  return router
}

export default createAppRouter()
