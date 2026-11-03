# 模型 Embedding 维度前端支持 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在模型管理页面的查询、新增和编辑流程中支持 `embeddingDimension`，新建表单默认 1024，同时遵守后端对 CHAT 模型提交空值的约束。

**Architecture:** 继续使用现有 `ModelRecord`、`ModelPayload` 和 `ModelManagementView.vue` 的数据流，不新增 API 方法。表单始终显示一个正整数输入框；请求转换函数根据 `modelType` 将 EMBEDDING 模型的维度发送为整数，将其他模型的维度发送为 `null`。

**Tech Stack:** Vue 3、TypeScript、Element Plus、Vue Test Utils、Vitest、Vite；Node 20.20.2。

---

## 文件与职责

- Modify: `src/types/ai-config.ts`
  - 为模型查询记录和新增/编辑 payload 增加 `embeddingDimension` 类型。
- Modify: `src/views/ai/ModelManagementView.vue`
  - 增加表单状态、默认值、编辑回显、请求转换、列表列和数字输入。
- Test: `src/views/ai/__tests__/ModelManagementView.spec.ts`
  - 覆盖查询展示、编辑回显、新建默认值、Embedding 请求和 CHAT 空值请求。
- Create: `docs/superpowers/specs/2026-11-03-model-embedding-dimension-design.md`
  - 记录已批准的设计；不把该设计文档内容复制到业务代码中。

### Task 1: Add failing model-dimension behavior tests

**Files:**
- Modify: `src/views/ai/__tests__/ModelManagementView.spec.ts`

- [ ] **Step 1: Extend the model fixture with a nullable dimension**

Add `embeddingDimension: null` after `modelType` in the existing `model` fixture so the fixture satisfies the updated `ModelRecord` contract while remaining a CHAT-model fixture:

```ts
  modelType: 'chat',
  embeddingDimension: null,
  contextWindow: 65536,
```

- [ ] **Step 2: Add a query-display regression test**

Add this test inside `describe('ModelManagementView', ...)`. It uses an EMBEDDING record because a non-null dimension is only valid for that model type, then verifies the list renders the value:

```ts
  it('shows embedding dimensions returned by the model query', async () => {
    vi.mocked(aiApi.listModels).mockResolvedValueOnce([{
      ...model,
      modelType: 'EMBEDDING',
      embeddingDimension: 1536,
    }])
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    expect(wrapper.text()).toContain('1536')
  })
```

- [ ] **Step 3: Add an edit-hydration and EMBEDDING-submit test**

Add this test to prove the edit form uses the backend value rather than the create default, and that the value reaches `updateModel`:

```ts
  it('hydrates and submits the embedding dimension for an embedding model', async () => {
    const embeddingModel = {
      ...model,
      modelType: 'EMBEDDING',
      embeddingDimension: 1536,
    }
    vi.mocked(aiApi.listModels).mockResolvedValueOnce([embeddingModel])
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.find('[data-test="model-edit-4"]').trigger('click')
    await flushPromises()

    const dimensionInput = wrapper.find('[data-test="model-embedding-dimension"] input')
    expect(dimensionInput.element.value).toBe('1536')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.updateModel).toHaveBeenCalledWith(4, expect.objectContaining({
      embeddingDimension: 1536,
    }))
  })
```

- [ ] **Step 4: Extend the existing create test with the default and CHAT null assertion**

In `submits CHAT as the default model type when creating a model`, after opening the create form, assert the input default before filling the required fields:

```ts
    expect(wrapper.find('[data-test="model-embedding-dimension"] input').element.value).toBe('1024')
```

Extend its final `expect.objectContaining` block with:

```ts
      embeddingDimension: null,
```

This explicitly protects the backend invariant: a form default may be 1024, but a CHAT request must not send that value.

- [ ] **Step 5: Add an EMBEDDING create-submit assertion**

Add a separate test inside the same describe block:

```ts
  it('submits the default embedding dimension for an embedding model', async () => {
    const wrapper = mount(ModelManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="model-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="model-code"]').setValue('bge-m3')
    await wrapper.find('[data-test="model-name"]').setValue('BGE M3')
    await wrapper.find('[data-test="model-type"]').setValue('EMBEDDING')
    await wrapper.find('[data-test="model-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.createModel).toHaveBeenCalledWith(expect.objectContaining({
      modelType: 'EMBEDDING',
      embeddingDimension: 1024,
    }))
  })
```

- [ ] **Step 6: Run the focused test file and verify the new assertions fail for missing support**

Run:

```sh
nvm exec 20.20.2 npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected: existing tests may run, but the new assertions fail because the type, form field, list column, and payload mapping do not yet exist. Do not change the tests to accommodate the current implementation.

### Task 2: Add the API model types

**Files:**
- Modify: `src/types/ai-config.ts:33-68`

- [ ] **Step 1: Add the nullable field to `ModelRecord`**

Insert the field immediately after `modelType`, matching the backend DTO ordering:

```ts
  modelType: string
  embeddingDimension: number | null
  contextWindow: number
```

- [ ] **Step 2: Add the optional nullable field to `ModelPayload`**

Insert the field immediately after `modelType`. It must permit `null` because CHAT requests intentionally send `null`, while remaining optional to preserve the existing payload style:

```ts
  modelType: string
  embeddingDimension?: number | null
  contextWindow?: number
```

- [ ] **Step 3: Run the type checker before page implementation**

Run:

```sh
nvm exec 20.20.2 npm run type-check
```

Expected: the checker may report fixture errors in the test until Task 1 and the page implementation are complete; no unrelated source errors should be introduced.

### Task 3: Wire the dimension through the model page

**Files:**
- Modify: `src/views/ai/ModelManagementView.vue:12-27,85-101,127-171,258-299`

- [ ] **Step 1: Add the field to `ModelForm`**

Insert a required numeric form property after `modelType`:

```ts
  modelType: string
  embeddingDimension: number
  contextWindow: number
```

- [ ] **Step 2: Set the initial form value to 1024**

Add the property to the initial `reactive<ModelForm>` object after `modelType`:

```ts
  modelType: 'CHAT',
  embeddingDimension: 1024,
  contextWindow: 8192,
```

- [ ] **Step 3: Map the field conditionally in `toModelPayload`**

Add this property after `modelType: value.modelType.trim(),`:

```ts
    embeddingDimension: value.modelType.trim().toUpperCase() === 'EMBEDDING'
      ? value.embeddingDimension
      : null,
```

The case normalization matches the backend’s case-insensitive model-type parsing and prevents a default 1024 from being sent for CHAT models.

- [ ] **Step 4: Reset the field to 1024 for new forms**

Add the property to `resetForm()` after `modelType: 'CHAT',`:

```ts
    embeddingDimension: 1024,
```

- [ ] **Step 5: Hydrate the field when editing**

Add the property to the `Object.assign(form, ...)` block in `openEdit()` after `modelType: model.modelType,`:

```ts
    embeddingDimension: model.embeddingDimension ?? 1024,
```

This preserves a returned dimension and uses the requested default for legacy/null records.

- [ ] **Step 6: Add the dimension column to the model list**

Insert this column after the existing model type column:

```vue
          <el-table-column label="Embedding 维度" width="130">
            <template #default="{ row }">{{ row.embeddingDimension ?? '—' }}</template>
          </el-table-column>
```

- [ ] **Step 7: Add the numeric input to the shared create/edit form**

Insert this form item after the model type input:

```vue
        <el-form-item label="Embedding 维度">
          <el-input-number
            v-model="form.embeddingDimension"
            data-test="model-embedding-dimension"
            :min="1"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
```

Keep the field visible for both model types so the new-model default is explicit; `toModelPayload` remains the single source of truth for CHAT null handling.

- [ ] **Step 8: Run the focused model-management tests**

Run:

```sh
nvm exec 20.20.2 npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
```

Expected: all tests in the file pass, including the new dimension tests and the existing vision, provider, concurrency, deletion, and layout tests.

### Task 4: Run repository verification

**Files:**
- No additional source files.

- [ ] **Step 1: Run the complete test suite**

Run:

```sh
nvm exec 20.20.2 npm test
```

Expected: Vitest exits with code 0 and all test files pass.

- [ ] **Step 2: Run the type checker**

Run:

```sh
nvm exec 20.20.2 npm run type-check
```

Expected: `vue-tsc --build` exits with code 0 without diagnostics.

- [ ] **Step 3: Build the production bundle**

Run:

```sh
nvm exec 20.20.2 npm run build
```

Expected: type checking and Vite production build both complete successfully.

- [ ] **Step 4: Check formatting and the final working tree**

Run:

```sh
git diff --check
git status --short
```

Expected: no whitespace errors. Only the approved design document, implementation plan, and the intended type/view/test files are changed; do not stage or commit unless the user explicitly requests it.

- [ ] **Step 5: Verify the UI in the running app**

Run:

```sh
nvm exec 20.20.2 npm run dev
```

Open the existing local admin app and visit the model-management route. Confirm the list displays the “Embedding 维度” column, the new-model drawer shows `1024`, an EMBEDDING model can be saved with 1024, and editing a returned dimension displays that value. Confirm a CHAT model save does not fail due to an embedding dimension payload.
