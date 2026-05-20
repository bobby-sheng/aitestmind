# API 测试平台 - 权限与用户记录设计方案

## 一、现状分析

### 1.1 已有能力
- **用户模型**：`User` 表已有 `username`、`password`、`role`（admin/user）、`status`（active/inactive）、`lastLoginAt`。
- **会话**：`Session` 表 + Cookie/Token 登录，`lib/auth.ts` 提供 `getCurrentUser(request)`。
- **部分权限**：仅「用户管理」相关接口做了校验：
  - 用户列表/创建：仅 `admin` 可访问。
  - 用户详情/更新/删除：本人或 `admin` 可操作。

### 1.2 缺失能力
| 维度 | 现状 | 问题 |
|------|------|------|
| 功能权限 | 仅用户管理校验角色，其余接口未校验登录与权限 | 未登录或任意用户可操作 API 库、用例、套件、设置等 |
| 数据归属 | Api、TestCase、TestSuite、Conversation、PlatformSettings 等无 `createdBy`/`updatedBy` | 无法区分谁创建/修改，无法做「我的数据」与权限隔离 |
| 操作记录 | 仅有 logger 写文件，无按用户、按功能的持久化审计 | 无法追溯「谁在何时对哪条数据做了何操作」 |

---

## 二、设计目标

1. **统一登录校验**：除公开接口（登录、注册、健康检查）外，所有 API 要求登录。
2. **按角色控制功能**：在「登录即可见」基础上，对敏感功能（用户管理、系统设置等）按角色限制。
3. **数据归属与可追溯**：核心业务表增加创建人/更新人，并在关键操作处写入当前用户。
4. **可扩展**：为后续「细粒度权限」或「资源级权限」预留扩展点。

---

## 三、权限模型

### 3.1 角色定义（RBAC）

在保留现有 `User.role` 的前提下，明确定义角色与能力：

| 角色 | 说明 | 能力概要 |
|------|------|----------|
| **admin** | 系统管理员 | 全部功能 + 用户管理 + 系统/平台设置 + 查看全部用户数据（可选） |
| **user** | 普通用户 | API 库、用例编排、测试套件、执行、报告、AI 对话、个人设置；仅能操作自己的数据（在开启「按归属过滤」时） |

后续若需要更细粒度，可再引入「权限表」与「角色-权限」关联，本方案先采用「角色 → 能力」的简单映射。

### 3.2 功能与角色矩阵

| 功能/模块 | 接口前缀/资源 | admin | user | 未登录 |
|-----------|----------------|-------|------|--------|
| 登录/注册/登出 | /api/auth/* | ✓ | ✓ | ✓（仅 login/register） |
| 当前用户信息 | GET /api/auth/me | ✓ | ✓ | ✗ |
| 用户管理（列表/增删改） | /api/users, /api/users/[id] | ✓ | ✗（仅可改本人部分字段） | ✗ |
| 平台/全局设置 | /api/platform-settings | ✓ | ✗（或仅读，见下） | ✗ |
| 系统设置 | /api/settings | ✓ | ✗ | ✗ |
| API 库（分类/标签/APIs） | /api/api-library/* | ✓ | ✓ | ✗ |
| 测试用例 | /api/test-cases/* | ✓ | ✓ | ✗ |
| 测试套件 | /api/test-suites/* | ✓ | ✓ | ✗ |
| 套件执行/执行记录 | /api/executions/* | ✓ | ✓ | ✗ |
| AI 对话 | /api/conversations/* | ✓ | ✓ | ✗ |
| 采集/录制/MITM/代理 | /api/recording/*, /api/mitm/*, /api/proxy/* | ✓ | ✓ | ✗ |
| Dashboard 统计 | /api/dashboard/* | ✓ | ✓ | ✗ |
| 健康检查 | /api/health | ✓ | ✓ | ✓ |

说明：
- **平台/全局设置**：建议仅 admin 可改；user 可读（用于执行时用全局环境）。
- **用户管理**：保持现状，仅 admin 可列表/创建/删/改他人；user 仅能通过「个人资料」改自己（若提供该接口）。

### 3.3 数据归属策略（按用户记录）

- **策略 A（推荐先做）**：所有业务数据带 `createdBy`/`updatedBy`，查询时**不做**过滤，仅用于展示「创建人/修改人」和审计。
- **策略 B（可选后续）**：在策略 A 基础上，对「普通用户」仅返回 `createdBy = 当前用户` 的数据；admin 可看全部。适用于多租户/强隔离场景。

本方案按**策略 A** 设计表结构与写入逻辑，策略 B 仅需在查询处加 `where.createdBy` 条件即可。

---

## 四、数据模型变更

### 4.1 需要增加「用户记录」的实体

以下实体建议增加 `createdBy`、`updatedBy`（均为 `User.id`，可选关联 `User` 表）：

| 表名 | 建议字段 | 说明 |
|------|----------|------|
| Api | createdBy, updatedBy | API 库条目 |
| Category | createdBy, updatedBy | 分类（若仍在使用） |
| Classification | createdBy, updatedBy | 四层分类 |
| TestCase | createdBy, updatedBy | 测试用例 |
| TestSuite | createdBy, updatedBy | 测试套件 |
| Conversation | createdBy, updatedBy | AI 对话会话 |
| PlatformSettings | 不推荐按用户分条；若仅一条全局，可增加 lastUpdatedBy | 全局设置一般单例，仅记录最后修改人即可 |

**执行与日志类**（已有或可补充「操作人」）：

| 表名 | 建议 | 说明 |
|------|------|------|
| TestSuiteExecution | triggerUserId（或保持 triggerUser 存 username） | 执行触发人，建议存 userId |
| 其他 Execution/Log 表 | 可选 | 通过 suiteExecution.triggerUserId 已可追溯 |

### 4.2 Prisma 示例（仅展示新增字段）

```prisma
model Api {
  // ... 现有字段 ...
  createdBy String?
  updatedBy String?
  createdByUser User? @relation("ApiCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)
  updatedByUser User? @relation("ApiUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
}

model TestCase {
  // ... 现有字段 ...
  createdBy String?
  updatedBy String?
  createdByUser User? @relation("TestCaseCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)
  updatedByUser User? @relation("TestCaseUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
}

model TestSuite {
  // ... 现有字段 ...
  createdBy String?
  updatedBy String?
  createdByUser User? @relation("TestSuiteCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)
  updatedByUser User? @relation("TestSuiteUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
}

model Conversation {
  // ... 现有字段 ...
  createdBy String?
  updatedBy String?
  createdByUser User? @relation("ConversationCreatedBy", fields: [createdBy], references: [id], onDelete: SetNull)
  updatedByUser User? @relation("ConversationUpdatedBy", fields: [updatedBy], references: [id], onDelete: SetNull)
}

model User {
  // ... 现有字段 ...
  apisCreated          Api[]           @relation("ApiCreatedBy")
  apisUpdated          Api[]           @relation("ApiUpdatedBy")
  testCasesCreated     TestCase[]      @relation("TestCaseCreatedBy")
  testCasesUpdated     TestCase[]      @relation("TestCaseUpdatedBy")
  testSuitesCreated    TestSuite[]     @relation("TestSuiteCreatedBy")
  testSuitesUpdated    TestSuite[]     @relation("TestSuiteUpdatedBy")
  conversationsCreated Conversation[]  @relation("ConversationCreatedBy")
  conversationsUpdated Conversation[]  @relation("ConversationUpdatedBy")
}
```

`PlatformSettings` 若为单例，可只加：

```prisma
model PlatformSettings {
  // ... 现有字段 ...
  lastUpdatedBy String?
}
```

`TestSuiteExecution` 已有 `triggerUser`，建议增加 `triggerUserId`（或逐步改为仅存 `triggerUserId`），便于关联 User 与统计。

### 4.3 审计日志表（可选）

若需要「谁在何时对哪条数据做了何种操作」的可查记录，可新增审计表：

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())

  userId     String?  // 操作人
  username   String?  // 快照，便于查询
  action     String   // create | update | delete | execute
  resource   String   // Api | TestCase | TestSuite | User | ...
  resourceId String?
  details    String?  // JSON 或摘要
  ipAddress  String?
  userAgent  String?

  @@index([userId])
  @@index([resource], [resourceId])
  @@index([createdAt])
}
```

审计可在「用户管理、平台设置、删除用例/套件」等敏感操作中写入，其余按需扩展。

---

## 五、接口层改造要点

### 5.1 统一登录校验

- 新增中间件或工具函数，例如 `requireAuth(request)`：未登录返回 401，并统一 JSON 格式。
- 除以下接口外，全部走 `requireAuth`：
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `GET /api/health`（若存在）

### 5.2 按角色校验

- 在需要 admin 的接口中，在 `requireAuth` 之后增加 `requireRole(request, 'admin')`，否则返回 403。
- 涉及接口示例：
  - GET/POST /api/users、PUT/DELETE /api/users/[id]（保持现有逻辑即可）
  - PUT /api/platform-settings
  - GET/PUT /api/settings（若存在）

### 5.3 写入时带上当前用户

- 在 **创建** 时：从 `getCurrentUser` 取 `user.id`，写入 `createdBy`、`updatedBy`。
- 在 **更新** 时：只写 `updatedBy`。
- 执行测试套件时：将当前 `user.id` 或 `user.username` 写入 `TestSuiteExecution.triggerUserId` / `triggerUser`。

---

## 六、前端配合

1. **路由与菜单**  
   - 根据「当前用户角色」隐藏或禁用菜单项（如「用户管理」「系统/平台设置」仅对 admin 显示）。
2. **接口错误**  
   - 统一处理 401（未登录 → 跳转登录）、403（无权限 → 提示无权限）。
3. **列表展示**  
   - 在 API 库、用例、套件、对话等列表中展示「创建人/修改人」（可选），便于协作与审计。

---

## 七、实施阶段建议

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| 1 | 统一登录校验：除登录/注册/健康检查外，所有 API 必须登录 | 高 |
| 2 | 平台设置、系统设置等敏感接口增加 admin 校验 | 高 |
| 3 | 为 Api、TestCase、TestSuite、Conversation 等表增加 createdBy/updatedBy，并在创建/更新时写入当前用户 | 高 |
| 4 | 执行记录中明确写入 triggerUserId/triggerUser | 中 |
| 5 | 前端按角色隐藏/禁用菜单，并统一处理 401/403 | 中 |
| 6 | 可选：PlatformSettings 增加 lastUpdatedBy；TestSuiteExecution 增加 triggerUserId | 中 |
| 7 | 可选：审计表 + 在敏感操作写 AuditLog | 低 |

---

## 八、小结

- **权限**：在现有 User.role（admin/user）基础上，通过「统一登录校验 + 敏感接口角色校验」实现功能级权限；后续可再扩展权限表做更细粒度控制。
- **用户记录**：核心业务表增加 `createdBy`/`updatedBy`，创建/更新时写入当前用户；执行记录保留/补充触发人，便于追溯与后续按用户过滤。
- **审计**：通过现有 logger + 可选 AuditLog 表，满足「谁在何时对哪条数据做了何操作」的需求。

按上述阶段实施，即可在不大改现有架构的前提下，补齐「权限」与「每个功能的用户记录」能力。
