# 模型视觉识图能力设计

## 背景

后端模型管理查询接口已返回 `supportVision` 布尔字段，模型新增/编辑接口也接受 `supportVision` 的 `0/1` 值。管理后台需要消费该字段，让管理员能够在模型列表中识别视觉识图能力，并在维护模型时配置该能力。

## 目标

- 在模型管理列表的现有“能力”列展示视觉识图能力。
- 在新建和编辑模型抽屉中提供“支持视觉识图”开关。
- 创建或更新模型时将开关转换为后端要求的 `supportVision: 0 | 1`。
- 保持现有表格结构和能力标签样式，不额外增加独立表格列或筛选器。

## 方案

### 类型与接口

在 `ModelRecord` 中增加 `supportVision: boolean`，在 `ModelPayload` 中增加可选的 `supportVision?: BinaryStatus`。`listModels`、`createModel` 和 `updateModel` 已通过这些类型复用现有 API 客户端，无需新增接口。

### 模型表单

在 `ModelForm` 中增加默认值为 `false` 的 `supportVision`。重置表单时恢复为 `false`，编辑已有模型时从 `model.supportVision` 回填。`toModelPayload` 将其转换为 `1` 或 `0`，与 `supportStream`、`isDefault` 的现有处理保持一致。抽屉中新增“支持视觉识图”开关。

### 模型列表

复用“能力”列：当 `supportVision` 为真时显示绿色“视觉”标签；现有“流式”和“默认”标签保持不变。能力列宽度保持现有值，必要时允许标签自然换行，不改变表格其他列和操作列布局。

## 数据流

1. `listModels()` 获取包含 `supportVision` 的模型管理响应。
2. `ModelRecord.supportVision` 驱动列表“视觉”标签及编辑表单初始状态。
3. 管理员在新建或编辑抽屉中切换开关。
4. `toModelPayload()` 将布尔值转换为 `supportVision: 0 | 1`。
5. `createModel()` 或 `updateModel()` 提交 payload；保存成功后沿用现有 `loadModels()` 刷新列表。

## 错误处理

沿用现有模型加载、保存和错误提示流程。本次不新增接口错误处理、兼容层或字段缺失兜底；后端管理接口契约明确返回该字段。

## 测试

- 更新模型测试夹具，包含 `supportVision`。
- 验证启用视觉能力的模型在列表中显示“视觉”标签。
- 验证创建模型时打开开关会提交 `supportVision: 1`，关闭时提交 `supportVision: 0`。
- 验证编辑模型会正确回填视觉能力开关。
- 运行 `npm run test`、`npm run type-check` 和 `npm run build`，并按项目要求使用 Node 20.20.2 验证。

## 不在范围内

- 不新增视觉能力筛选器。
- 不改动后端项目。
- 不改变聊天端模型选择或图片上传逻辑。
