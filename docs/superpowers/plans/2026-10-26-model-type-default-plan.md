# Model Type Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the new-model form submit `CHAT` as the default `modelType` while preserving the backend-provided type when editing an existing model.

**Architecture:** Keep the existing `ModelForm` and payload conversion unchanged. Update the two create/reset initialization paths in the model management view, and add a component test that opens a fresh create form without entering a type and verifies the submitted payload.

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vitest, Vue Test Utils, Node 20.20.2.

---

## Files and responsibilities

- Modify `src/views/ai/ModelManagementView.vue:41-55` and `src/views/ai/ModelManagementView.vue:124-140`: define `CHAT` as the new-form default in both initialization paths. Leave `openEdit()` and `toModelPayload()` unchanged.
- Modify `src/views/ai/__tests__/ModelManagementView.spec.ts:79-90`: assert that a newly opened form submits `modelType: 'CHAT'` without setting the field manually, while retaining the existing boolean flag assertions.
- Create `docs/superpowers/plans/2026-10-26-model-type-default-plan.md`: this implementation plan only; no production documentation or API changes are needed.

### Task 1: Add a failing regression test for the create default

**Files:**
- Modify: `src/views/ai/__tests__/ModelManagementView.spec.ts:79-90`

- [ ] **Step 1: Remove the manual lowercase type input and assert the required payload value.**

Replace the existing test body with:

```ts
  it('submits CHAT as the default model type when creating a model', async () => {
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-code"]').setValue('deepseek-chat')
    await wrapper.find('[data-test="model-name"]').setValue('DeepSeek Chat')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()
    expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 1,
      modelType: 'CHAT',
      supportStream: 1,
      isDefault: 0,
      status: 1,
    }))
  })
```

The test deliberately does not call `setValue` on `[data-test="model-type"]`; it verifies the value supplied by `openCreate()` and `resetForm()` rather than a manually entered value.

- [ ] **Step 2: Run only the changed test to verify it fails against the current implementation.**

Run:

```bash
nvm use 20.20.2 && npm test -- --run src/views/ai/__tests__/ModelManagementView.spec.ts -t "submits CHAT as the default model type"
```

Expected result: **FAIL**, because the current form initialization and reset value is `chat`, so `createModel` receives `modelType: 'chat'`.

### Task 2: Update the two new-form defaults

**Files:**
- Modify: `src/views/ai/ModelManagementView.vue:45`
- Modify: `src/views/ai/ModelManagementView.vue:129`

- [ ] **Step 1: Change the initial reactive form value from lowercase to uppercase.**

Change:

```ts
  modelType: 'chat',
```

to:

```ts
  modelType: 'CHAT',
```

- [ ] **Step 2: Change the reset value used whenever the create drawer opens.**

In `resetForm()`, change:

```ts
    modelType: 'chat',
```

to:

```ts
    modelType: 'CHAT',
```

Do not change this edit path:

```ts
    modelType: model.modelType,
```

Do not change `toModelPayload()`; it must continue trimming and submitting the selected form value without normalizing existing edit values.

- [ ] **Step 3: Re-run the focused regression test and verify it passes.**

Run:

```bash
nvm use 20.20.2 && npm test -- --run src/views/ai/__tests__/ModelManagementView.spec.ts -t "submits CHAT as the default model type"
```

Expected result: **PASS**.

### Task 3: Run the complete verification suite

**Files:**
- No additional files.

- [ ] **Step 1: Run all unit tests.**

Run:

```bash
nvm use 20.20.2 && npm test
```

Expected result: all Vitest test files pass, including the model-management regression test.

- [ ] **Step 2: Run the TypeScript check.**

Run:

```bash
nvm use 20.20.2 && npm run type-check
```

Expected result: `vue-tsc --build` exits successfully with no type errors.

- [ ] **Step 3: Run the production build.**

Run:

```bash
nvm use 20.20.2 && npm run build
```

Expected result: the type check and Vite production build both complete successfully.

- [ ] **Step 4: Review the final diff for scope.**

Run:

```bash
git diff -- src/views/ai/ModelManagementView.vue src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected result: only the two create defaults and the focused regression assertion changed; edit assignment, payload conversion, API contracts, and unrelated files remain untouched.
