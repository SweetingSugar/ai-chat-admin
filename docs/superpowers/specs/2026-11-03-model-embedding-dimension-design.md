# 模型 Embedding 维度前端支持设计

## 目标

后端 `ai_model` 已新增 `embedding_dimension` 字段，前端模型管理页面需要在查询、新增和编辑流程中支持该字段，并将新建模型表单的默认值设为 `1024`。

## 背景与约束

后端管理接口使用 camelCase JSON 字段 `embeddingDimension`，类型为整数。模型类型决定该字段的有效性：

- `EMBEDDING` 模型必须提供正整数维度；
- `CHAT` 模型不能提供 Embedding 维度，提交时应发送 `null`；
- 编辑页面应优先回显后端返回的维度；当后端值为空时回退到表单默认值 `1024`。

前端当前由 `ModelRecord` 表示查询结果，由 `ModelPayload` 表示新增和编辑请求，新增和编辑共用 `ModelManagementView.vue` 中的抽屉表单。

## 方案

采用单一数字表单字段并在请求转换阶段按模型类型处理：

1. 在 `ModelRecord` 和 `ModelPayload` 增加可空的 `embeddingDimension` 字段。
2. 在模型列表增加“Embedding 维度”列，展示查询结果；空值显示现有页面约定的占位符。
3. 在新增/编辑表单增加整数输入项“Embedding 维度”，最小值为 `1`。
4. 新建或重置表单时将维度设为 `1024`。
5. 编辑模型时使用接口返回的 `embeddingDimension`，后端返回空值时回退为 `1024`。
6. 生成请求 payload 时：
   - `modelType` 为 `EMBEDDING` 时发送输入的正整数；
   - 其他类型发送 `null`，避免后端拒绝 `CHAT` 模型。

不增加额外的模型类型联动、字段隐藏或 API 封装，保持现有页面结构和请求流程不变。

## 数据流

```text
listModels() -> ModelRecord.embeddingDimension -> 列表展示
                                      -> 编辑表单回显

新建/编辑表单 -> toModelPayload()
              -> embeddingDimension（EMBEDDING 为数值，否则为 null）
              -> createModel() / updateModel()
```

## 修改范围

- `src/types/ai-config.ts`
  - 扩展 `ModelRecord` 和 `ModelPayload`。
- `src/views/ai/ModelManagementView.vue`
  - 扩展表单状态、默认值、编辑回显和 payload 转换；
  - 增加列表列和表单输入项。
- `src/views/ai/__tests__/ModelManagementView.spec.ts`
  - 覆盖列表显示维度；
  - 覆盖新建默认值和 Embedding 请求值；
  - 覆盖编辑回显；
  - 覆盖 CHAT 模型提交 `null`。

## 错误处理

沿用现有模型保存失败的 API 错误提示。数字输入由 Element Plus 的 `el-input-number` 限制为不小于 `1`；模型类型对应的空值处理由 payload 转换逻辑保证，后端仍负责最终业务校验。

## 验证

按 Node 20.20.2 验证：

```sh
npm test -- src/views/ai/__tests__/ModelManagementView.spec.ts
npm run type-check
npm run build
```

完成后检查 `git diff --check`，并在开发服务器中确认模型列表、创建表单和编辑表单均能正确显示和保存 Embedding 维度。
