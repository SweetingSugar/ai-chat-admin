# Model Vision Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the backend `supportVision` model capability in the admin model list and model create/edit form.

**Architecture:** Extend the existing `ModelRecord` and `ModelPayload` contracts with the backend's boolean response and binary request field. Keep the capability in the existing capability-tag column, and bind a new form switch through the existing `toModelPayload` conversion so the backend receives `0` or `1`.

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vitest, Vue Test Utils, Vite.

---

## File Map

- Modify `src/types/ai-config.ts`: add `supportVision` to model response and request types.
- Modify `src/views/ai/ModelManagementView.vue`: add the form state, reset/edit mapping, payload mapping, capability tag, and switch.
- Modify `src/views/ai/__tests__/ModelManagementView.spec.ts`: add the new response field to fixtures and test list rendering, form submission, and edit-state hydration.

## Task 1: Add failing coverage for visual capability

**Files:**
- Modify: `src/views/ai/__tests__/ModelManagementView.spec.ts:38-55` (model fixture)
- Modify: `src/views/ai/__tests__/ModelManagementView.spec.ts:71-150` (model management tests)

- [ ] **Step 1: Extend the model fixture with the backend response field**

Add `supportVision: false` after `supportStream` in the existing `model` fixture:

```ts
  supportStream: true,
  supportVision: false,
  defaultModel: false,
```

- [ ] **Step 2: Add a failing test for the list capability tag**

Add this test inside the `ModelManagementView` describe block:

```ts
  it('shows the visual capability tag for vision models', async () => {
    vi.mocked(aiApi.listModels).mockResolvedValueOnce([{ ...model, supportVision: true }])
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.text()).toContain('视觉')
  })
```

This fails before implementation because the fixture field is not rendered anywhere.

- [ ] **Step 3: Add a failing test for form submission and edit hydration**

Add this test to verify edit-state hydration, conversion to `0` after disabling the switch, and conversion to `1` after enabling it for a new model:

```ts
  it('hydrates visual capability and submits binary values for disabled and enabled models', async () => {
    vi.mocked(aiApi.listModels).mockResolvedValueOnce([{ ...model, supportVision: true }])
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="model-edit-4"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="model-vision"]').attributes('aria-checked')).toBe('true')

    await wrapper.find('[data-test="model-vision"]').trigger('click')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.updateModel).toHaveBeenCalledWith(4, expect.objectContaining({
      supportVision: 0,
    }))

    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-vision"]').trigger('click')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({
      supportVision: 1,
    }))
  })
```

- [ ] **Step 4: Make the existing create submission test assert the default binary value**

Extend the existing `expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({ ... }))` assertion with:

```ts
      supportVision: 0,
```

This protects the default-off behavior for newly created models.

- [ ] **Step 5: Run the focused test and verify it fails for the missing implementation**

Run:

```bash
npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected: FAIL because `ModelRecord` does not yet declare `supportVision`, the list has no `视觉` tag, and the form has no `model-vision` switch.

## Task 2: Implement the type, form, request, and list changes

**Files:**
- Modify: `src/types/ai-config.ts:33-66`
- Modify: `src/views/ai/ModelManagementView.vue:12-26, 41-55, 83-98, 124-139, 149-166, 253-291`

- [ ] **Step 1: Extend the API model types**

Add the boolean response property after `supportStream` and the binary request property after `supportStream`:

```ts
export interface ModelRecord {
  // existing properties remain unchanged
  supportStream: boolean
  supportVision: boolean
  defaultModel: boolean
  // existing properties remain unchanged
}

export interface ModelPayload {
  // existing properties remain unchanged
  supportStream?: BinaryStatus
  supportVision?: BinaryStatus
  isDefault?: BinaryStatus
  // existing properties remain unchanged
}
```

- [ ] **Step 2: Add the form field and default value**

Add the property after `supportStream` in `ModelForm`:

```ts
  supportStream: boolean
  supportVision: boolean
  isDefault: boolean
```

Add the default in the initial `reactive` object and in `resetForm`:

```ts
  supportStream: true,
  supportVision: false,
  isDefault: false,
```

- [ ] **Step 3: Convert the form value into the backend request field**

Add the conversion after `supportStream` in `toModelPayload`:

```ts
    supportStream: (value.supportStream ? 1 : 0) as BinaryStatus,
    supportVision: (value.supportVision ? 1 : 0) as BinaryStatus,
    isDefault: (value.isDefault ? 1 : 0) as BinaryStatus,
```

- [ ] **Step 4: Hydrate the field when editing an existing model**

Add the mapping after `supportStream` in `openEdit`:

```ts
    supportStream: model.supportStream,
    supportVision: model.supportVision,
    isDefault: model.defaultModel,
```

- [ ] **Step 5: Render the visual capability tag in the existing capability column**

Keep the current capability column and add the visual tag after the stream tag:

```vue
          <el-table-column label="能力" width="150">
            <template #default="{ row }">
              <el-tag v-if="row.supportStream" size="small" type="success">流式</el-tag>
              <el-tag v-if="row.supportVision" size="small" type="success">视觉</el-tag>
              <el-tag v-if="row.defaultModel" size="small" type="warning">默认</el-tag>
            </template>
          </el-table-column>
```

- [ ] **Step 6: Add the form switch with a stable test selector**

Add the switch after the existing stream switch:

```vue
        <el-form-item label="支持流式"><el-switch v-model="form.supportStream" /></el-form-item>
        <el-form-item label="支持视觉识图">
          <el-switch v-model="form.supportVision" data-test="model-vision" />
        </el-form-item>
        <el-form-item label="设为默认"><el-switch v-model="form.isDefault" /><span class="field-hint">设为默认会清除其他模型的默认标记。</span></el-form-item>
```

- [ ] **Step 7: Run the focused test and verify the implementation passes**

Run:

```bash
npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected: PASS for all `ModelManagementView` tests, including the visual tag, edit hydration, and `supportVision: 0/1` submission assertions.

## Task 3: Run repository verification

**Files:**
- No additional files.

- [ ] **Step 1: Run the complete frontend test suite**

Run:

```bash
npm run test
```

Expected: PASS with no failed test files.

- [ ] **Step 2: Run the TypeScript project check**

Run:

```bash
npm run type-check
```

Expected: exit code 0 with no TypeScript or Vue template errors.

- [ ] **Step 3: Build the production bundle**

Run:

```bash
npm run build
```

Expected: exit code 0; type-check and Vite production build both complete successfully.

- [ ] **Step 4: Review the final diff and working tree**

Run:

```bash
git diff -- src/types/ai-config.ts src/views/ai/ModelManagementView.vue src/views/ai/__tests__/ModelManagementView.spec.ts
git status --short
```

Expected: only the three planned source/test files contain changes, with no generated or credential files present.
