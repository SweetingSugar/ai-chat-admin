# 供应商超时默认值调整实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将供应商表单的连接超时和读取超时默认值统一调整为 `10000/120000`，并确保新默认值可以通过输入控件提交。

**Architecture:** 继续在 `ProviderManagementView.vue` 内维护供应商表单默认值，不新增抽象或接口。新建初始化、重置和编辑空值回退使用同一组数值；输入控件的上限同步放宽到对应默认值。通过现有供应商视图测试验证创建和编辑流程的提交 payload。

**Tech Stack:** Vue 3、TypeScript、Element Plus、Vitest、Vue Test Utils、Vite。

---

### Task 1: 为超时默认值增加回归测试

**Files:**
- Modify: `src/views/ai/__tests__/ProviderManagementView.spec.ts:74-147`

- [ ] **Step 1: 添加新建供应商默认超时值测试**

在 `describe('ProviderManagementView', () => {` 内增加测试。测试通过现有创建流程填写必填字段和 API Key，然后提交并断言创建 payload 使用新默认值：

```ts
  it('uses the new timeout defaults when creating a provider', async () => {
    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-create"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-code"]').setValue('deepseek')
    await wrapper.find('[data-test="provider-name"]').setValue('DeepSeek')
    await wrapper.find('[data-test="provider-base-url"]').setValue('https://api.deepseek.com')
    await wrapper.find('[data-test="provider-api-key"]').setValue('sk-new')
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.createProvider).toHaveBeenCalledWith(expect.objectContaining({
      connectTimeout: 10000,
      readTimeout: 120000,
    }))
    wrapper.unmount()
  })
```

- [ ] **Step 2: 添加编辑空值回退测试**

新增一个使用空超时值供应商记录的测试，验证编辑后提交时使用相同的 `10000/120000` 回退值。测试局部覆盖列表 mock，避免修改其他测试共享的正常供应商 fixture：

```ts
  it('uses the new timeout defaults when editing a provider with empty timeouts', async () => {
    const providerWithoutTimeouts = { ...provider, connectTimeout: null, readTimeout: null }
    vi.mocked(aiApi.listProviders).mockResolvedValue([providerWithoutTimeouts])

    const wrapper = mount(ProviderManagementView, { global: { plugins: [ElementPlus] } })
    await flushPromises()
    await wrapper.find('[data-test="provider-edit-2"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-test="provider-submit"]').trigger('click')
    await flushPromises()

    expect(aiApi.updateProvider).toHaveBeenCalledWith(2, expect.objectContaining({
      connectTimeout: 10000,
      readTimeout: 120000,
    }))
    wrapper.unmount()
  })
```

- [ ] **Step 3: 运行新增测试确认当前实现失败**

Run:

```sh
npx vitest run src/views/ai/__tests__/ProviderManagementView.spec.ts
```

Expected: FAIL。新建 payload 当前为 `connectTimeout: 10`、`readTimeout: 60`；空值编辑回退也当前为 `10/60`。

### Task 2: 更新供应商表单的默认值和可输入范围

**Files:**
- Modify: `src/views/ai/ProviderManagementView.vue:35-46,78-112,235-236`

- [ ] **Step 1: 更新表单初始化和重置默认值**

将 `form` reactive 对象中的超时字段改为：

```ts
  connectTimeout: 10000,
  readTimeout: 120000,
```

将 `resetForm()` 中对应字段同步改为：

```ts
    connectTimeout: 10000,
    readTimeout: 120000,
```

- [ ] **Step 2: 更新编辑表单的空值回退**

在 `openEdit()` 中将两处回退值改为：

```ts
    connectTimeout: provider.connectTimeout ?? 10000,
    readTimeout: provider.readTimeout ?? 120000,
```

编辑时 provider 返回的非空值仍直接保留，不做换算或覆盖。

- [ ] **Step 3: 同步调整输入框上限**

将模板中的两个输入框改为：

```vue
        <el-form-item label="连接超时"><el-input-number v-model="form.connectTimeout" :min="1" :max="10000" /></el-form-item>
        <el-form-item label="读取超时"><el-input-number v-model="form.readTimeout" :min="1" :max="120000" /></el-form-item>
```

保留现有最小值 `1`，不修改供应商 API payload 的字段名或类型。

- [ ] **Step 4: 运行供应商视图测试确认通过**

Run:

```sh
npx vitest run src/views/ai/__tests__/ProviderManagementView.spec.ts
```

Expected: PASS，包含新建默认值和编辑空值回退测试。

### Task 3: 完成项目级验证

**Files:**
- No additional files

- [ ] **Step 1: 运行全部单元测试**

Run:

```sh
npm test
```

Expected: 所有 Vitest 测试通过。

- [ ] **Step 2: 使用 Node 20.20.2 运行类型检查**

确认当前 Node 版本为 `20.20.2`，然后运行：

```sh
node --version
npm run type-check
```

Expected: Node 输出 `v20.20.2`，TypeScript/Vue 类型检查成功退出。

- [ ] **Step 3: 使用 Node 20.20.2 运行生产构建**

Run:

```sh
npm run build
```

Expected: 类型检查和 Vite 生产构建均成功完成。

- [ ] **Step 4: 检查最终差异**

Run:

```sh
git diff --check
git status --short
```

Expected: 没有空白错误；仅包含供应商视图测试、供应商视图实现和本次规范/计划文件的预期变更，不创建提交，除非用户另行要求。
