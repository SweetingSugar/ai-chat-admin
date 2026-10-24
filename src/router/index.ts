import { defineComponent } from 'vue'
import {
  createRouter,
  createWebHistory,
  type RouteLocationRaw,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const RoutePlaceholder = defineComponent({
  name: 'RoutePlaceholder',
  template: '<div />',
})

export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: RoutePlaceholder, meta: { guestOnly: true } },
  {
    path: '/dashboard',
    component: RoutePlaceholder,
    meta: { requiresAuth: true, permission: 'admin:dashboard:read' },
  },
  { path: '/forbidden', component: RoutePlaceholder, meta: { requiresAuth: true } },
]

export function getFirstAccessiblePath(permissionCodes: string[]): '/dashboard' | '/forbidden' {
  return permissionCodes.includes('admin:dashboard:read') ? '/dashboard' : '/forbidden'
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
