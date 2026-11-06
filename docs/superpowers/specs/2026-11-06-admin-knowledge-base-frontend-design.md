# 管理员知识库与文档查看前端设计

## 背景

后端已提供管理员只读知识库接口，允许具备 `knowledge:read` 权限的管理员分页查看全部未删除知识库、知识库下的文档以及文本文档原始内容。管理员还可以通过现有文件管理接口获取文件文档的预签名地址。

前端需要在现有 Vue 3 管理后台中增加对应界面，并沿用当前页面的布局、颜色、表格、分页、抽屉、错误提示和权限控制方式。

## 目标

- 增加管理员知识库分页列表。
- 展示知识库所属用户 ID 及现有知识库主要状态字段。
- 在文档抽屉中分页查看指定知识库的文档元数据。
- 查看 `TEXT` 文档的原始内容。
- 查看 `FILE` 文档：先获取文件元数据，再获取管理员预签名地址，并复用现有文件预览规则。
- 通过 `knowledge:read` 控制导航入口和路由访问。
- 保持页面只读，不增加知识库或文档的写操作。

## 非目标

- 创建、编辑、删除知识库或文档。
- 重试索引、切换向量模型或修改索引状态。
- 修改后端接口或普通用户知识库页面。
- 解析不支持的文件格式或在前端新增文件上传能力。
- 跨数据源查询用户昵称等额外用户信息。

## 页面与路由

新增 `/system/knowledge-bases` 路由，使用现有 `AdminLayout`，路由权限为 `knowledge:read`，标题为“知识库管理”。

在侧边栏“系统管理”分组增加“知识库管理”入口，仅当当前管理员拥有 `knowledge:read` 时显示。路由仍由现有全局守卫进行权限校验，直接访问无权限页面时进入 `/forbidden`。

页面使用现有 `PageHeader` 和管理页样式：

- 标题：知识库管理。
- 描述：查看平台知识库及其文档内容。
- 操作区：刷新按钮。
- 主内容：带分页的知识库表格。

知识库表格展示名称、描述、所属用户 ID、状态、索引状态、创建时间、更新时间和操作列。操作列只提供“查看文档”。

## API 与类型

新增 `src/types/knowledge.ts`，定义与后端响应一致的类型：

- `KnowledgeBaseStatus`：`ACTIVE`、`DISABLED`。
- `KnowledgeDocumentSourceType`：`TEXT`、`FILE`。
- `KnowledgeDocumentStatus`：使用后端现有文档状态枚举值。
- `KnowledgeBaseAdmin`：包含 `id`、`userId`、`name`、`description`、embedding model 字段、索引字段、状态和时间字段。
- `KnowledgeDocument`：包含标题、来源类型、`fileId`、索引状态、分块数、错误信息和时间字段。
- `KnowledgeDocumentContent`：包含 `documentId`、`title`、`content`。
- 知识库和文档分页响应类型，沿用现有分页字段 `records`、`total`、`current`、`size`、`pages`。

新增 `src/api/knowledge.ts`，封装：

- `listKnowledgeBases(query)` → `GET admin/knowledge-bases`。
- `listKnowledgeDocuments(knowledgeBaseId, query)` → `GET admin/knowledge-bases/{id}/documents`。
- `getKnowledgeDocumentContent(knowledgeBaseId, documentId)` → `GET admin/knowledge-bases/{id}/documents/{documentId}/content`。

文件预览直接复用 `src/api/files.ts` 的 `getFile` 和 `getAdminFilePresignedUrl`，不复制文件 API 封装。

## 页面交互与数据流

新增 `src/views/system/KnowledgeBaseManagementView.vue`，页面内部维护三组独立状态：知识库列表、文档抽屉、内容/文件预览抽屉。

### 知识库列表

页面挂载时以 `page=1`、`size=20` 请求知识库列表。分页切换和修改分页大小时重新加载；修改分页大小会回到第一页。列表请求失败时沿用文件管理页的行内错误提示和重试按钮。

列表响应中的 `current` 和 `size` 用于同步前端分页状态，避免以后端归一化后的分页值不一致。

### 文档抽屉

点击知识库的“查看文档”后：

1. 设置当前知识库并打开右侧抽屉。
2. 重置文档页为第一页。
3. 请求该知识库的文档分页接口。
4. 展示文档标题、来源类型、文件 ID、文档状态、索引状态、分块数、错误信息、创建时间和更新时间。
5. 支持文档分页和刷新。

抽屉标题包含当前知识库名称，知识库切换时清空旧文档、重置分页和错误状态。

文档操作按来源类型区分：

- `TEXT` 且文档可见时显示“查看内容”。点击后请求知识库文档内容接口，在内容抽屉中展示标题和可滚动的原始文本。
- `FILE` 且存在 `fileId` 时显示“查看文件”。点击后打开文件预览抽屉并执行文件预览流程。
- 缺少 `fileId` 的文件文档不显示可执行的预览操作。

### 文件文档预览

文件预览使用现有管理员文件 API：

1. 调用 `GET admin/files/{fileId}` 获取文件元数据，尤其是 `contentType` 和文件状态。
2. 文件状态不是 `ACTIVE` 时显示不可预览提示，不请求预签名地址。
3. 文件有效时调用 `GET admin/files/{fileId}/presigned-url` 获取临时 URL。
4. 按文件类型渲染：
   - `image/*` 使用图片预览；
   - `application/pdf` 和 `text/plain` 使用内嵌文档区域；
   - 其他类型显示不支持内嵌预览提示，并提供在新窗口打开链接。
5. 预览加载失败时提供重试和新窗口打开入口。

预览抽屉关闭时清理 URL、文件元数据、错误和加载状态，不持有过期的临时地址。

## 请求并发与错误处理

知识库列表、文档列表和文件/内容预览分别使用请求序号或等价的当前请求标识。只有仍对应当前抽屉或当前页面状态的响应才能更新界面，避免快速切换知识库、文档或重复点击时旧响应覆盖新内容。

所有请求错误通过现有 `getApiErrorMessage` 转换为用户可读信息：

- 列表请求错误显示页面行内错误和“重试”。
- 文档请求错误显示在抽屉内容区域并提供重试。
- 文本内容错误显示在内容抽屉中并提供重试。
- 文件详情或预签名地址错误显示在预览区域，并在已有 URL 时保留新窗口打开入口。
- 不把后端错误对象或临时预签名地址直接显示给用户。

页面不对后端分页范围、权限或资源归属做重复业务判断，遵循现有 API 客户端和路由守卫约定。

## 文件变更范围

- 新增 `src/types/knowledge.ts`。
- 新增 `src/api/knowledge.ts`。
- 新增 `src/api/__tests__/knowledge.spec.ts`。
- 新增 `src/views/system/KnowledgeBaseManagementView.vue`。
- 新增 `src/views/system/__tests__/KnowledgeBaseManagementView.spec.ts`。
- 修改 `src/router/index.ts`。
- 修改 `src/components/layout/Sidebar.vue`。

不新增通用表格、抽屉或文件预览组件；本次页面复用现有管理页模式，避免无关重构。

## 测试策略

API 测试验证：

- 知识库列表路径和分页参数。
- 文档列表路径、知识库 ID 和分页参数。
- 文档内容路径和知识库/文档 ID。

页面测试验证：

- 挂载后请求并展示知识库、用户 ID 和主要字段。
- 刷新、分页和分页大小变更传递正确参数。
- 知识库操作打开文档抽屉并请求对应知识库。
- 文档抽屉展示文档字段并支持分页。
- 文本文档打开内容抽屉并展示原始内容。
- 文件文档请求文件详情和预签名地址，并按图片、PDF/纯文本和不支持类型分支展示。
- 非 `ACTIVE` 文件不会请求预签名地址并显示不可预览提示。
- 请求失败显示错误和重试入口。
- 快速切换知识库或预览目标时，过期响应不会覆盖当前状态。

路由测试补充 `/system/knowledge-bases` 的权限元数据和 `getFirstAccessiblePath` 行为；侧边栏测试验证 `knowledge:read` 缺失时不显示入口。

## 验收标准

- 拥有 `knowledge:read` 的管理员能够从侧边栏进入知识库管理页并分页查看知识库。
- 知识库表格显示所属用户 ID，且页面没有写操作。
- 管理员能够在抽屉中查看指定知识库的文档和分页结果。
- 文本文档能够查看原始文本内容。
- 文件文档能够通过管理员文件详情和预签名地址接口进行预览或在新窗口打开。
- 无权限管理员看不到导航入口，直接访问也会被拦截。
- 现有文件管理、登录、路由守卫和其他管理页面测试不受影响。
