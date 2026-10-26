import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { describe, expect, it } from 'vitest'
import AssignmentDrawer from '@/components/management/AssignmentDrawer.vue'

const groups = [
  {
    id: 'system',
    label: '系统管理',
    options: [
      { id: 1, label: '用户查看', description: 'system:user:read' },
      { id: 2, label: '用户更新', description: 'system:user:update' },
    ],
  },
]

describe('AssignmentDrawer', () => {
  it('filters grouped options and emits a full replacement set on save', async () => {
    const wrapper = mount(AssignmentDrawer, {
      props: { modelValue: true, title: '分配权限', groups, selectedIds: [1] },
      global: { plugins: [ElementPlus] },
    })
    await flushPromises()
    const input = wrapper.find('input[placeholder="搜索权限"]')
    await input.setValue('更新')
    expect(wrapper.text()).toContain('用户更新')
    expect(wrapper.text()).not.toContain('用户查看')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('[data-test="assignment-save"]').trigger('click')
    expect(wrapper.emitted('save')?.[0]).toEqual([[1, 2]])
  })

  it('emits close without changing the selected prop', async () => {
    const wrapper = mount(AssignmentDrawer, {
      props: { modelValue: true, title: '分配角色', groups, selectedIds: [1] },
      global: { plugins: [ElementPlus] },
    })
    await wrapper.find('[data-test="assignment-close"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.props('selectedIds')).toEqual([1])
  })
})
