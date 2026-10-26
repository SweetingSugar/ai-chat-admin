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
