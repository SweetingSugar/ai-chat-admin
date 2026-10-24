import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import ElementPlus from 'element-plus'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import LoginView from '@/views/LoginView.vue'

async function mountLogin() {
  const pinia = createPinia()
  const auth = useAuthStore(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/dashboard', component: { template: '<div />' } },
    ],
  })
  await router.push('/login')
  await router.isReady()
  return { auth, router, wrapper: mount(LoginView, { global: { plugins: [pinia, router, ElementPlus] } }) }
}

afterEach(() => vi.restoreAllMocks())

it('does not submit empty credentials', async () => {
  const { auth, wrapper } = await mountLogin()
  const login = vi.spyOn(auth, 'login')

  await wrapper.get('button[type="submit"]').trigger('click')
  await flushPromises()

  expect(login).not.toHaveBeenCalled()
})

it('submits valid credentials and preserves the username on failure', async () => {
  const { auth, wrapper } = await mountLogin()
  const login = vi.spyOn(auth, 'login').mockRejectedValue(
    new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' }),
  )

  await wrapper.get('input[name="username"]').setValue('admin')
  await wrapper.get('input[name="password"]').setValue('password123')
  await wrapper.get('input[name="password"]').trigger('keyup.enter')
  await flushPromises()

  expect(login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' })
  expect(document.body.textContent).toContain('用户名或密码错误')
  expect((wrapper.get('input[name="username"]').element as HTMLInputElement).value).toBe('admin')
})

it('disables the submit button while login is pending', async () => {
  const { auth, wrapper } = await mountLogin()
  const login = vi.spyOn(auth, 'login').mockReturnValue(new Promise(() => undefined))

  await wrapper.get('input[name="username"]').setValue('admin')
  await wrapper.get('input[name="password"]').setValue('password123')
  await wrapper.get('input[name="password"]').trigger('keyup.enter')
  await flushPromises()

  expect(login).toHaveBeenCalledOnce()
  expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
})
