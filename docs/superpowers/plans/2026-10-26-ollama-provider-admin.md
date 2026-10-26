# Ollama 供应商支持实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 AI 管理后台的供应商筛选、新建和编辑表单支持 `OLLAMA`，并允许 Ollama 在没有 API Key 的情况下创建。

**Architecture:** 沿用现有供应商页面和 API wrapper，不增加新的配置抽象或接口。只扩展 `ProviderType`、补充两个下拉选项，并把新建时的 API Key 校验限制为非 Ollama 类型；编辑时沿用现有的空值保留密钥逻辑。

**Tech Stack:** Vue 3 `<script setup>`、TypeScript 6、Element Plus 2.11、Vitest 4、Vue Test Utils、Vite 8、Node 20.20.2。

---

## 文件结构

- `src/types/ai-config.ts` — 扩展 `ProviderType` 联合类型，保持 `ProviderPayload` 和 `ProviderRecord` 结构不变。
- `src/views/ai/ProviderManagementView.vue` — 增加 Ollama 筛选/表单选项，调整新建 API Key 校验和字段提示；不改变 API 调用方法。
- `src/views/ai/__tests__/ProviderManagementView.spec.ts` — 覆盖 Ollama 选项、无 API Key 新建以及非 Ollama 空 API Key 拒绝行为，保留现有编辑密钥和列表测试。
- `docs/superpowers/specs/2026-10-26-ollama-provider-admin-design.md` — 已批准的设计文档，本次计划不再扩展范围。

不修改 `/Users/ice/dev/project/AI-Chat` 后端、数据库迁移、`src/api/ai-config.ts`、路由或模型管理页面。

---

### Task 1: 先补充供应商页面的失败测试

**Files:**
- Modify: `src/views/ai/__tests__/ProviderManagementView.spec.ts:49-90`

- [ ] **Step 1: 添加下拉选项选择和 Ollama 无 Key 新建测试**

在现有 `ProviderManagementView` 测试中追加以下测试。Element Plus 的下拉选项会挂载到 `document.body`，因此通过打开选择器并从 `.el-select-dropdown__item` 中按文本点击选项；不要直接修改组件内部状态。

```ts
  it('shows Ollama in the provider type filter', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[aria-label="供应商类型筛选"]').trigger('click')
    expect(document.body.textContent).toContain('Ollama')
    wrapper.unmount()
  })

  it('shows Ollama in the provider form type selector', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-type"]').trigger('click')
    expect(document.body.textContent).toContain('Ollama')
    wrapper.unmount()
  })

  it('allows creating an Ollama provider without an API key', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-code"]').setValue('ollama')
    await wrapper.find('[data-test="provider-name"]').setValue('Ollama')
    await wrapper.find('[data-test="provider-base-url"]').setValue('http://localhost:11434')
    await wrapper.find('[data-test="provider-type"]').trigger('click')
    const option = Array.from(document.querySelectorAll<HTMLElement>('.el-select-dropdown__item'))
      .find((item) => item.textContent?.trim() === 'Ollama')
    expect(option).toBeDefined()
    option?.click()
    await flushPromises()
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.createProvider).toHaveBeenCalledWith(expect.objectContaining({
      providerCode: 'ollama',
      providerType: 'OLLAMA',
      baseUrl: 'http://localhost:11434',
      apiKey: '',
    }))
    wrapper.unmount()
  })

  it('rejects a blank API key for a non-Ollama provider', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-code"]').setValue('deepseek')
    await wrapper.find('[data-test="provider-name"]').setValue('DeepSeek')
    await wrapper.find('[data-test="provider-base-url"]').setValue('https://api.deepseek.com')
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.createProvider).not.toHaveBeenCalled()
    wrapper.unmount()
  })
```

Keep the existing tests for successful non-Ollama creation, blank API Key on edit, deletion cancellation, and API Key non-rendering. The new tests must use the current `createProvider` mock and must not add a new API mock or change the backend contract.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```sh
npm test -- src/views/ai/__tests__/ProviderManagementView.spec.ts
```

Expected: the new Ollama option test fails because the two templates do not render `Ollama`; the Ollama creation test either cannot select the option or is blocked by the current unconditional API Key warning. The existing tests should remain passing.

- [ ] **Step 3: Commit the focused test changes**

```sh
git add src/views/ai/__tests__/ProviderManagementView.spec.ts
git commit -m "test: cover Ollama provider configuration"
```

---

### Task 2: Extend the type and provider form behavior

**Files:**
- Modify: `src/types/ai-config.ts:3`
- Modify: `src/views/ai/ProviderManagementView.vue:116-119,185-188,225-232`

- [ ] **Step 1: Add `OLLAMA` to the provider type union**

Change the type declaration to exactly:

```ts
export type ProviderType = 'OPENAI' | 'DEEPSEEK' | 'QWEN' | 'OLLAMA'
```

Do not change `ProviderPayload.apiKey?: string` or any provider/model response fields.

- [ ] **Step 2: Make new-provider API Key validation conditional**

Replace the beginning of `submitProvider` with:

```ts
async function submitProvider(): Promise<void> {
  if (formId.value === null && form.providerType !== 'OLLAMA' && !form.apiKey.trim()) {
    ElMessage.warning('非 Ollama 供应商新增时必须填写 API Key')
    return
  }
  formSubmitting.value = true
```

Leave payload construction unchanged. In particular, retain:

```ts
  if (form.apiKey.trim()) payload.apiKey = form.apiKey.trim()
  try {
    if (formId.value === null) await aiApi.createProvider({ ...payload, apiKey: form.apiKey.trim() })
    else await aiApi.updateProvider(formId.value, payload)
```

This means a new Ollama request contains `apiKey: ''`, which the existing backend treats as no credential, while an edit with a blank key still omits `apiKey` from the update payload.

- [ ] **Step 3: Add Ollama to both provider type selectors**

Add one option after the QWEN option in the toolbar filter:

```vue
          <el-option label="Ollama" value="OLLAMA" />
```

Add the same option after the QWEN option in the drawer form:

```vue
            <el-option label="Ollama" value="OLLAMA" />
```

Do not add a hard-coded `baseUrl` or change the default form provider type; new forms may continue to default to `DEEPSEEK`.

- [ ] **Step 4: Update the API Key hint without changing edit behavior**

Replace the current hint with:

```vue
        <p class="field-hint">非 Ollama 供应商新增时必须填写 API Key；编辑时留空将保留当前 API Key，页面不会显示已有密钥。</p>
```

- [ ] **Step 5: Run focused tests, type-check, and verify the implementation passes**

Run:

```sh
npm test -- src/views/ai/__tests__/ProviderManagementView.spec.ts
npm run type-check
```

Expected: all provider management tests pass, including the Ollama no-Key creation test and the non-Ollama blank-Key rejection test; type-check completes without errors.

- [ ] **Step 6: Commit the implementation**

```sh
git add src/types/ai-config.ts src/views/ai/ProviderManagementView.vue
git commit -m "feat: support Ollama providers in admin"
```

---

### Task 3: Run complete automated verification and inspect the UI flow

**Files:**
- Verify: `src/types/ai-config.ts`
- Verify: `src/views/ai/ProviderManagementView.vue`
- Verify: `src/views/ai/__tests__/ProviderManagementView.spec.ts`

- [ ] **Step 1: Verify the required Node version**

Run:

```sh
node --version
```

Expected: `v20.20.2`. If another version is active, switch to the project’s Node 20.20.2 environment before running the remaining commands.

- [ ] **Step 2: Run the complete test suite**

Run:

```sh
npm run test
```

Expected: all existing authentication, dashboard, management, and provider tests pass. No test should require a running Ollama service.

- [ ] **Step 3: Run type-check and production build**

Run:

```sh
npm run type-check
npm run build
```

Expected: Vue/TypeScript checks and Vite production build complete successfully without changing generated `dist` files in the source diff.

- [ ] **Step 4: Exercise the provider flow in the real app**

Start the frontend through the project run workflow and use an account with `ai:provider:read` and `ai:provider:create` permissions. Verify:

1. The provider type filter displays `Ollama`.
2. The new-provider drawer displays `Ollama` in the type selector.
3. Selecting Ollama, entering a code, name, and `http://localhost:11434`, and leaving API Key blank allows the save request to be sent.
4. Selecting DeepSeek and leaving API Key blank shows the validation warning and does not send a create request.
5. Editing a provider with API Key blank still preserves the existing key behavior; the page never renders the stored key.
6. Existing OpenAI, DeepSeek, and Qwen options remain available.

If the backend is not running, use the existing mocked/component tests for request behavior and report the real-browser limitation rather than claiming the network request succeeded.

- [ ] **Step 5: Review the final diff and working tree**

Run:

```sh
git diff --stat
 git status --short
```

Expected: only the approved design/plan documents and the three provider type/view/test files are changed; no credentials, generated build artifacts, backend files, or unrelated refactors are included.

- [ ] **Step 6: Commit verification-only fixes as a new commit**

If verification identifies a concrete defect, fix only the affected source/test file, rerun the failing command, and create a new commit rather than amending an earlier one:

```sh
git add <specific-fixed-files>
git commit -m "fix: resolve Ollama provider verification issue"
```

---

## Plan self-review

- **Spec coverage:** The type extension and both selectors are covered by Task 2; conditional API Key handling and edit omission are covered by Tasks 1–2; error behavior remains the existing `ElMessage` path; Node 20.20.2, tests, type-check, build, and browser checks are covered by Task 3; backend and model-management exclusions are explicit in the file map and scope.
- **Placeholder scan:** No step relies on “appropriate” behavior, an unspecified file, or a future decision. Every source change includes the exact type, template option, validation condition, hint text, or test body.
- **Type consistency:** All test payloads use the `ProviderType` literal `OLLAMA`; the implementation uses the same literal in `ProviderManagementView.vue`; `ProviderPayload` remains optional for `apiKey`, matching both the existing API wrapper and backend contract.
- **Scope:** The plan changes one type declaration, one provider view, and its component tests. No new abstraction or API layer is introduced.
