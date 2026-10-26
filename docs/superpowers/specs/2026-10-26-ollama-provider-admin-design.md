# 管理后台支持 Ollama 供应商设计

## 1. 背景与目标

当前管理后台供应商类型只支持 `OPENAI`、`DEEPSEEK` 和 `QWEN`，而后端供应商契约已经支持 `OLLAMA`。本次仅修改 `ai-chat-admin`，使供应商列表筛选、新建和编辑表单可以配置 Ollama，并遵循后端对 Ollama API Key 的特殊规则。

目标：

- 在前端类型契约中支持 `OLLAMA`。
- 在供应商类型筛选器和新建/编辑表单中显示 Ollama。
- 新建 Ollama 时允许省略 API Key。
- 保持非 Ollama 供应商的新建 API Key 必填规则。
- 保持编辑时空 API Key 表示保留已有密钥的行为。
- 不修改后端、接口路径、响应结构或模型管理流程。

## 2. 现状与约束

- 供应商类型定义位于 `src/types/ai-config.ts`。
- 供应商列表、筛选、表单和提交逻辑集中在 `src/views/ai/ProviderManagementView.vue`。
- 供应商组件测试位于 `src/views/ai/__tests__/ProviderManagementView.spec.ts`。
- 后端契约规定：`providerType` 支持 `OLLAMA`；Ollama 新建时 `apiKey` 可省略；`baseUrl` 仍然必填。
- 后端通常使用 `http://localhost:11434` 作为 Ollama 地址，但地址依赖部署环境，前端不设置硬编码默认值。
- 当前项目以 Node 20.20.2 为验证基线。

## 3. 方案

采用最小完整改动，不抽取新的供应商选项配置，也不改变 API 模块：

1. 将 `ProviderType` 扩展为 `OPENAI | DEEPSEEK | QWEN | OLLAMA`。
2. 在供应商列表类型筛选器和表单类型选择器中加入 `Ollama` 选项，提交值为 `OLLAMA`。
3. 将新建表单的 API Key 校验改为仅对非 Ollama类型生效。
4. 保持现有 payload 构造逻辑：新建时传递当前 API Key（Ollama 可以是空字符串），编辑时仅在用户填写 API Key 时加入 `apiKey` 属性。
5. 更新字段提示，使其说明非 Ollama 新建时需要 API Key，同时说明编辑留空会保留已有密钥。
6. 通过组件测试验证选择项、Ollama 无 Key 新建和非 Ollama 空 Key 拒绝行为。

## 4. 数据流

### 4.1 新建供应商

1. 用户打开新建抽屉并选择 `Ollama`。
2. 用户填写供应商编码、名称和 `baseUrl`，API Key 可以留空。
3. 前端校验 `providerType !== 'OLLAMA' && !apiKey.trim()`；只有非 Ollama 类型显示必填警告并终止提交。
4. 前端以 `providerType: 'OLLAMA'` 构造 `ProviderPayload`，调用现有 `createProvider`。
5. 后端创建无 API Key 的 Ollama 供应商，成功后前端关闭抽屉并刷新列表。

非 Ollama 新建流程保持不变：API Key 为空时不发起请求。

### 4.2 编辑供应商

1. 编辑时表单回填供应商类型和其他配置，但 API Key 始终为空。
2. API Key 为空时，更新 payload 不包含 `apiKey`，后端保留已有凭据。
3. 用户填写新 API Key 时，更新 payload 包含新值，后端按现有规则更新凭据。
4. 该规则对 Ollama 和其他供应商一致，不新增前端特殊分支。

## 5. 错误处理

- API 请求仍使用现有 `getApiErrorMessage` 和 `ElMessage` 错误提示。
- 新建非 Ollama 供应商缺少 API Key 时，继续显示现有警告并阻止请求。
- Ollama 的 `baseUrl`、编码、名称等校验仍由现有表单和后端共同负责；本次不增加重复的客户端校验。
- 不新增 Ollama 健康检查、模型自动发现、API Key 测试或专用错误类型。

## 6. 测试与验收

在 `ProviderManagementView.spec.ts` 中补充或调整以下测试：

- 供应商类型筛选器和表单选择器的文本包含 `Ollama`。
- 新建 Ollama 时不填写 API Key，调用 `createProvider`，请求包含 `providerType: 'OLLAMA'`。
- 新建非 Ollama 供应商时不填写 API Key，不调用 `createProvider`。
- 编辑已有供应商时保持空 API Key 不进入 `updateProvider` 请求。
- 现有供应商列表加载和 API Key 不回显测试继续通过。

验证命令：

```sh
node --version
npm run test
npm run type-check
npm run build
```

验收标准：

1. 前端类型检查接受 `OLLAMA`，且现有三种类型行为不变。
2. 供应商筛选器、新建表单和编辑表单都能选择 Ollama。
3. Ollama 可以在不填写 API Key 的情况下提交创建请求。
4. 非 Ollama 供应商仍然要求新建时填写 API Key。
5. 编辑空 API Key 的保留规则和 API Key 不回显规则不受影响。
6. 所有自动化测试、类型检查和生产构建在 Node 20.20.2 下通过。

## 7. 范围外

- 不修改 `/Users/ice/dev/project/AI-Chat` 后端代码。
- 不修改数据库迁移、Ollama 模型调用适配器或聊天接口。
- 不新增供应商 API 封装或路由。
- 不重构现有供应商选项渲染方式。
- 不设置固定的 Ollama `baseUrl` 默认值。
