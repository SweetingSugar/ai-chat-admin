# 后台管理功能设计：人员、权限与 AI 配置

## 1. 背景与目标

前端已经完成登录、认证守卫、管理壳和运营概览。后端 `/Users/ice/dev/project/AI-Chat` 已实现用户、角色、权限、AI 供应商和模型的管理接口，本次工作将这些接口接入前端，形成可用的后台配置闭环。

首个版本覆盖四个管理域：

- 用户管理：查看用户、编辑基本资料、启停账号、分配角色。
- 角色管理：角色增删改查、分配权限。
- 权限管理：权限增删改查、表格搜索和筛选。
- AI 配置：供应商与模型增删改查。

本次不新增后端接口、不实现新的统计维度、不引入新的权限模型或图标库。

## 2. 设计决策

### 2.1 页面组织

采用“四个管理域、五个独立路由页面 + 共享管理组件”的方案：

- 系统管理
  - 用户管理
  - 角色管理
  - 权限管理
- AI 配置
  - 供应商管理
  - 模型管理

供应商和模型使用 AI 配置下的两个子路由，由同一个 AI 配置页面壳提供标签切换；每个子路由仍可直接访问、刷新和按权限独立守卫。

权限管理采用已确认的“分组权限表格”方案，而不是树形权限中心。角色权限分配也采用可搜索的分组选择面板，以保持信息结构一致。

### 2.2 视觉与交互

页面沿用现有的浅色背景、白色卡片、深色侧栏、紧凑表格和现有 CSS 变量。每个页面包含：

1. 标题与说明。
2. 搜索、筛选、刷新和主操作工具栏。
3. 表格、加载态、空态、错误态和重试入口。
4. 右侧抽屉形式的新增/编辑表单，保持列表上下文。

用户和角色的关联分配在详情/操作抽屉中完成：

- 用户详情获得 `roleIds` 后显示角色复选列表。
- 角色详情获得 `permissionIds` 后显示可搜索、按模块分组的权限复选列表。
- 分组支持当前分组全选，并显示已选数量。
- 提交前明确提示“本次保存将替换当前全部关联关系”，再进行二次确认。
- 空数组允许提交，但同样必须经过二次确认。

删除操作统一使用确认框。供应商删除失败时保留当前页面并展示后端关于关联模型的冲突消息。

## 3. 路由与权限

新增路由及页面权限如下：

| 路由 | 页面 | 读取权限 | 写入权限 |
| --- | --- | --- | --- |
| `/system/users` | 用户管理 | `system:user:read` | `system:user:update`、`system:user:assign-role` |
| `/system/roles` | 角色管理 | `system:role:read` | `system:role:create`、`system:role:update`、`system:role:delete`、`system:role:assign-permission` |
| `/system/permissions` | 权限管理 | `system:permission:read` | `system:permission:create`、`system:permission:update`、`system:permission:delete` |
| `/ai/providers` | 供应商管理 | `ai:provider:read` | `ai:provider:create`、`ai:provider:update`、`ai:provider:delete` |
| `/ai/models` | 模型管理 | `ai:model:read` | `ai:model:create`、`ai:model:update`、`ai:model:delete` |

侧栏、路由守卫、页面主操作和表格行操作均按权限码控制。无读取权限时沿用现有 `/forbidden`；无写入权限时隐藏对应按钮，而不是仅在点击后失败。

## 4. 数据与 API 层

API 客户端补充 `put`、`patch` 和 `delete` 方法，沿用现有响应解包、认证 Header 和 `ApiError` 逻辑。

新增 API 模块：

- `src/api/users.ts`
- `src/api/roles.ts`
- `src/api/permissions.ts`
- `src/api/ai-config.ts`

新增类型模块：

- `src/types/system.ts`
- `src/types/ai-config.ts`

接口映射如下：

- 用户：`GET /api/system/users`、`GET /{id}`、`PUT /{id}`、`PATCH /{id}/status`、`PUT /{id}/roles`。
- 角色：`GET /api/system/roles`、`GET /{id}`、`POST`、`PUT /{id}`、`DELETE /{id}`、`PUT /{id}/permissions`。
- 权限：`GET /api/system/permissions`、`GET /{id}`、`POST`、`PUT /{id}`、`DELETE /{id}`。
- 供应商：`GET /api/admin/ai/providers`、`GET /{id}`、`POST`、`PUT /{id}`、`DELETE /{id}`。
- 模型：`GET /api/admin/ai/models`、`GET /{id}`、`POST`、`PUT /{id}`、`DELETE /{id}`。

后端列表接口返回数组，本版本不伪造服务端分页；搜索和筛选在当前列表上本地执行。

数据约定：

- 用户和角色详情分别回填 `roleIds` 与 `permissionIds`。
- 权限按照 `permissionType` 显示目录、菜单、按钮等类型，并依据 `parentId` 做模块分组。
- 供应商响应只包含 `hasApiKey`，不回传密钥。编辑时 API Key 为空表示保留已有密钥；新增时要求填写。
- 模型表单中的 `supportStream`、`isDefault` 和 `status` 在 UI 中使用布尔值，提交时转为后端所需的 `0/1`。
- 数值字段在表单中做即时范围校验，服务端校验仍是最终依据。

## 5. 状态与错误处理

页面采用“加载列表 → 打开详情/表单 → 提交 → 成功后刷新”的单向流程：

- 初次加载失败显示错误和重试入口。
- 单项操作失败只提示错误，不清空已有列表。
- 加载和提交期间禁用对应操作，避免重复请求。
- `401` 由现有客户端清理登录态；`403` 显示权限提示；`409` 优先展示后端冲突信息；`400` 展示字段或业务校验信息。
- 更新状态失败时恢复开关原值。
- 分配成功后重新获取详情，确保页面反映全量替换后的真实关联。
- 删除成功后刷新当前列表；删除冲突时保留列表和抽屉上下文。

## 6. 组件边界

新增共享组件用于减少五个管理页面之间的重复：

- 管理页面头部与工具栏布局。
- 状态标签和通用空/错/加载状态。
- 抽屉表单的提交、取消和错误展示骨架。
- 关联分配抽屉的搜索、分组、全选和确认流程。

页面组件只负责数据加载、表格列和表单字段组合；API 模块负责请求；类型模块负责请求/响应契约。共享组件不持有具体业务 API 或权限码。

## 7. 测试与验收

单元和组件测试覆盖：

- API 方法的 HTTP 动词、路径、请求体、数值转换和错误传播。
- 路由与侧栏按权限码显示，缺少权限进入 `/forbidden`。
- 用户、角色、权限、供应商和模型表单的新建/编辑字段映射。
- API Key 保留规则、布尔值与 `0/1` 转换。
- 详情回填、全量替换确认和空数组提交。
- 列表加载成功、空列表、加载失败重试、成功刷新和删除冲突。

验收标准：

1. 拥有相应权限的账号可完成五个页面的列表查看和所允许的增删改操作。
2. 用户可以分配角色，角色可以分配权限，并能安全处理清空关联关系的场景。
3. 供应商 API Key 永不显示在页面或响应中；新增和编辑均符合后端保留规则。
4. 模型可以绑定供应商并维护默认、启用、流式和参数配置。
5. 页面在窄屏下可用，表格支持横向滚动，抽屉不溢出视口。
6. 在 Node 20.20.2 下通过 `npm run test`、`npm run type-check` 和 `npm run build`，并完成真实浏览器主流程检查。
