# 快递公司异常处理系统 (Express Exception Handling) - 接口契约文件

| 项目 | 内容 |
| :--- | :--- |
| 文档路径 | `docs/02-design/api-contracts.ts` |
| 状态 | **Frozen (已冻结)** |
| 适用范围 | MVP 阶段前后端联调与接口契约验收 |
| 对应后端 | Java 21 + Spring Boot 4 |
| 对应前端 | Vue 3 + TypeScript + Axios |

---

## 1. 统一响应结构与基础类型

```typescript
/**
 * 后端统一响应结构 (对应 Java 的 Result<T>)
 */
export interface ApiResponse<T = any> {
  code: number;        // 业务状态码，200 表示成功
  message: string;     // 面向前端用户的提示文本
  data: T;             // 数据载荷
  timestamp: number;   // 时间戳（秒）
}

/**
 * 分页请求参数（Cursor-based Pagination）
 */
export interface CursorPageRequest {
  cursor?: string;     // 游标，首次请求为空
  size?: number;       // 单页大小，默认 20，最大 100
}

/**
 * 分页响应结构
 */
export interface CursorPageResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

---

## 2. 全局枚举定义

```typescript
/**
 * 异常类型枚举
 */
export type ExceptionType =
  | 'DELAY'              // 延误
  | 'DAMAGE'             // 物品破损
  | 'LABEL_DAMAGED'      // 订单标签破损
  | 'CONTACT_ABNORMAL'   // 联系人异常
  | 'SIGN_DISPUTE';      // 签收争议

/**
 * 工单状态枚举
 */
export type TicketStatus =
  | 'PENDING'                    // 待处理
  | 'PROCESSING'                 // 处理中
  | 'PENDING_CS_CONFIRM'         // 待客服确认
  | 'PENDING_CUSTOMER_CONFIRM'   // 待客户确认
  | 'CLOSED';                    // 已关闭

/**
 * 超时状态枚举
 */
export type TimeoutStatus =
  | 'NORMAL'    // 正常
  | 'WARNING'   // 即将超时
  | 'OVERDUE';  // 已超时

/**
 * 记录可见性枚举
 */
export type Visibility =
  | 'CUSTOMER_VISIBLE'   // 客户可见
  | 'INTERNAL_ONLY';     // 仅内部可见

/**
 * 异常反馈状态枚举
 */
export type FeedbackStatus =
  | 'PENDING_ACCEPT'   // 待受理
  | 'CONVERTED'        // 已转工单
  | 'CLOSED';          // 已关闭

/**
 * 沟通角色枚举
 */
export type CommunicationRole =
  | 'CUSTOMER'   // 客户
  | 'CS'         // 客服
  | 'OPS';       // 运营

/**
 * 工单优先级枚举
 */
export type Priority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'URGENT';

/**
 * 运单状态枚举
 */
export type WaybillStatus =
  | 'PICKED_UP'    // 已揽收
  | 'IN_TRANSIT'   // 运输中
  | 'DELIVERING'   // 派送中
  | 'SIGNED'       // 已签收
  | 'EXCEPTION';   // 异常

/**
 * 运输节点类型枚举
 */
export type NodeType =
  | 'PICKUP'      // 揽收
  | 'TRANSIT'     // 中转
  | 'ARRIVAL'     // 到达
  | 'DELIVERY'    // 派送
  | 'SIGNED';     // 签收
```

---

## 3. 运单与轨迹模块 (Waybill & Tracking)

### 3.1 类型定义

```typescript
/**
 * 运输节点 (对应后端 TransportNodeVO)
 */
export interface TransportNode {
  id: number;
  nodeType: NodeType;
  location: string;
  occurredAt: string;      // ISO 格式
  description: string;
}

/**
 * 轨迹记录 (对应后端 TrackRecordVO)
 */
export interface TrackRecord {
  id: number;
  waybillId: number;
  nodeId: number;
  content: string;
  occurredAt: string;      // ISO 格式
}

/**
 * 运单列表项 (对应后端 WaybillBriefVO)
 */
export interface WaybillBrief {
  id: number;
  waybillNo: string;
  status: WaybillStatus;
  senderCity: string;
  receiverCity: string;
  createdAt: string;       // ISO 格式
  updatedAt: string;       // ISO 格式
}

/**
 * 运单详情 (对应后端 WaybillDetailVO)
 * 注意：仅返回属于当前客户的运单
 */
export interface WaybillDetail {
  id: number;
  waybillNo: string;
  status: WaybillStatus;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  nodes: TransportNode[];
  tracks: TrackRecord[];
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 接口路径

| HTTP 方法 | 路径 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| GET | `/api/v1/customer/waybills` | 查询本人运单列表 | 客户 |
| GET | `/api/v1/customer/waybills/{waybillNo}` | 查询本人运单详情与轨迹 | 客户 |
| GET | `/api/v1/customer/waybills/{waybillNo}/tracks` | 查询运单轨迹列表 | 客户 |

### 3.3 请求函数

```typescript
/**
 * 查询本人运单列表
 */
export const getMyWaybills = async (
  params?: CursorPageRequest
): Promise<CursorPageResponse<WaybillBrief>> => {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<WaybillBrief>>>(
    '/customer/waybills',
    { params }
  );
  return resp.data.data;
};

/**
 * 查询本人运单详情与轨迹
 * 运单不存在或不属于当前客户时，后端返回 40400
 */
export const getWaybillDetail = async (waybillNo: string): Promise<WaybillDetail> => {
  const resp = await apiClient.get<ApiResponse<WaybillDetail>>(
    `/customer/waybills/${waybillNo}`
  );
  return resp.data.data;
};

/**
 * 查询运单轨迹列表
 */
export const getWaybillTracks = async (waybillNo: string): Promise<TrackRecord[]> => {
  const resp = await apiClient.get<ApiResponse<TrackRecord[]>>(
    `/customer/waybills/${waybillNo}/tracks`
  );
  return resp.data.data;
};
```

---

## 4. 异常反馈模块 (Exception Feedback)

### 4.1 类型定义

```typescript
/**
 * 提交异常反馈请求参数 (对应后端 CreateFeedbackDTO)
 */
export interface CreateFeedbackRequest {
  waybillNo: string;
  type: ExceptionType;
  description: string;
}

/**
 * 异常反馈详情 (对应后端 ExceptionFeedbackVO)
 */
export interface ExceptionFeedback {
  id: number;
  waybillId: number;
  waybillNo: string;
  type: ExceptionType;
  description: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 接口路径

| HTTP 方法 | 路径 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| POST | `/api/v1/customer/exception-feedbacks` | 提交异常反馈 | 客户 |
| GET | `/api/v1/customer/exception-feedbacks/{id}` | 查询异常反馈详情 | 客户 |

### 4.3 请求函数

```typescript
/**
 * 提交异常反馈
 * 运单不存在或不属于当前客户时，后端返回 40400
 */
export const createFeedback = async (data: CreateFeedbackRequest): Promise<number> => {
  const resp = await apiClient.post<ApiResponse<number>>(
    '/customer/exception-feedbacks',
    data
  );
  return resp.data.data;
};

/**
 * 查询异常反馈详情
 */
export const getFeedbackDetail = async (id: number): Promise<ExceptionFeedback> => {
  const resp = await apiClient.get<ApiResponse<ExceptionFeedback>>(
    `/customer/exception-feedbacks/${id}`
  );
  return resp.data.data;
};
```

---

## 5. 工单模块 - 客户视角 (Customer Ticket)

### 5.1 类型定义

```typescript
/**
 * 沟通记录 (对应后端 CommunicationVO)
 */
export interface Communication {
  id: number;
  role: CommunicationRole;
  visibility: Visibility;
  content: string;
  createdAt: string;
}

/**
 * 客户可见工单详情 (对应后端 CustomerTicketVO)
 * 注意：该 VO 仅包含 CUSTOMER_VISIBLE 记录，不得包含 INTERNAL_ONLY 记录
 */
export interface CustomerTicket {
  id: number;
  ticketNo: string;
  waybillNo: string;
  type: ExceptionType;
  status: TicketStatus;
  deadlineAt: string;
  timeoutStatus: TimeoutStatus;
  communications: Communication[];       // 仅 CUSTOMER_VISIBLE
  customerFeedbacks: Communication[];    // 仅 CUSTOMER_VISIBLE
  createdAt: string;
  updatedAt: string;
}

/**
 * 客户确认结果请求参数
 */
export interface ConfirmTicketRequest {
  ticketId: number;
  remark?: string;
}

/**
 * 客户不认可请求参数
 */
export interface RejectTicketRequest {
  ticketId: number;
  reason: string;
}
```

### 5.2 接口路径

| HTTP 方法 | 路径 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| GET | `/api/v1/customer/tickets` | 查询本人工单列表 | 客户 |
| GET | `/api/v1/customer/tickets/{id}` | 查询工单公开进度 | 客户 |
| POST | `/api/v1/customer/tickets/{id}/confirm` | 确认处理结果 | 客户 |
| POST | `/api/v1/customer/tickets/{id}/reject` | 不认可并申请继续处理 | 客户 |

### 5.3 请求函数

```typescript
/**
 * 查询本人工单列表
 */
export const getMyTickets = async (
  params?: CursorPageRequest
): Promise<CursorPageResponse<CustomerTicket>> => {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<CustomerTicket>>>(
    '/customer/tickets',
    { params }
  );
  return resp.data.data;
};

/**
 * 查询工单公开进度
 * 仅返回 CUSTOMER_VISIBLE 记录
 */
export const getCustomerTicketDetail = async (id: number): Promise<CustomerTicket> => {
  const resp = await apiClient.get<ApiResponse<CustomerTicket>>(
    `/customer/tickets/${id}`
  );
  return resp.data.data;
};

/**
 * 客户确认处理结果
 * 工单状态必须为 PENDING_CUSTOMER_CONFIRM
 */
export const confirmTicket = async (id: number): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    `/customer/tickets/${id}/confirm`
  );
};

/**
 * 客户不认可并申请继续处理
 * 工单状态必须为 PENDING_CUSTOMER_CONFIRM
 */
export const rejectTicket = async (data: RejectTicketRequest): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    `/customer/tickets/${data.ticketId}/reject`,
    data
  );
};
```

---

## 6. 工单模块 - 客服视角 (CS Ticket)

### 6.1 类型定义

```typescript
/**
 * 创建工单请求参数 (对应后端 CreateTicketDTO)
 */
export interface CreateTicketRequest {
  feedbackId: number;
  type: ExceptionType;
  priority: Priority;
}

/**
 * 分派工单请求参数 (对应后端 AssignTicketDTO)
 */
export interface AssignTicketRequest {
  ticketId: number;
  assigneeId: number;
}

/**
 * 确认对外说明请求参数 (对应后端 ConfirmCustomerFeedbackDTO)
 */
export interface ConfirmCustomerFeedbackRequest {
  ticketId: number;
  content: string;
}

/**
 * 内部工单详情 (对应后端 InternalTicketVO)
 * 仅客服与运营可见，包含 INTERNAL_ONLY 记录
 */
export interface InternalTicket {
  id: number;
  ticketNo: string;
  waybillNo: string;
  type: ExceptionType;
  status: TicketStatus;
  priority: Priority;
  assigneeId: number;
  handlerId: number;
  deadlineAt: string;
  timeoutStatus: TimeoutStatus;
  communications: Communication[];       // 全部
  internalRecords: Communication[];      // 仅 INTERNAL_ONLY
  customerFeedbacks: Communication[];    // 仅 CUSTOMER_VISIBLE
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 接口路径

| HTTP 方法 | 路径 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| POST | `/api/v1/cs/tickets` | 创建工单 | 客服 |
| POST | `/api/v1/cs/tickets/{id}/assign` | 分派工单 | 客服 |
| GET | `/api/v1/cs/tickets` | 查询工单列表 | 客服 |
| GET | `/api/v1/cs/tickets/{id}` | 查询工单详情 | 客服 |
| POST | `/api/v1/cs/tickets/{id}/customer-feedback` | 确认对外说明 | 客服 |
| POST | `/api/v1/cs/tickets/{id}/close` | 关闭工单 | 客服 |

### 6.3 请求函数

```typescript
/**
 * 创建工单
 */
export const createTicket = async (data: CreateTicketRequest): Promise<number> => {
  const resp = await apiClient.post<ApiResponse<number>>('/cs/tickets', data);
  return resp.data.data;
};

/**
 * 分派工单给运营
 */
export const assignTicket = async (data: AssignTicketRequest): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    `/cs/tickets/${data.ticketId}/assign`,
    data
  );
};

/**
 * 查询工单列表（客服视角）
 */
export const getCsTickets = async (
  params?: CursorPageRequest
): Promise<CursorPageResponse<InternalTicket>> => {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<InternalTicket>>>(
    '/cs/tickets',
    { params }
  );
  return resp.data.data;
};

/**
 * 查询工单详情（客服视角，包含内部记录）
 */
export const getCsTicketDetail = async (id: number): Promise<InternalTicket> => {
  const resp = await apiClient.get<ApiResponse<InternalTicket>>(
    `/cs/tickets/${id}`
  );
  return resp.data.data;
};

/**
 * 客服确认对外说明
 * 工单状态必须为 PENDING_CS_CONFIRM
 */
export const confirmCustomerFeedback = async (
  data: ConfirmCustomerFeedbackRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    `/cs/tickets/${data.ticketId}/customer-feedback`,
    data
  );
};

/**
 * 关闭工单
 * 幂等约束：已关闭工单重复关闭返回 40900
 */
export const closeTicket = async (id: number): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/cs/tickets/${id}/close`);
};
```

---

## 7. 工单模块 - 运营视角 (Ops Ticket)

### 7.1 类型定义

```typescript
/**
 * 记录内部核实过程请求参数 (对应后端 CreateInternalRecordDTO)
 */
export interface CreateInternalRecordRequest {
  ticketId: number;
  content: string;
}

/**
 * 提交处理结果请求参数 (对应后端 SubmitHandlingResultDTO)
 */
export interface SubmitHandlingResultRequest {
  ticketId: number;
  plan: string;
  result: string;
}
```

### 7.2 接口路径

| HTTP 方法 | 路径 | 说明 | 权限 |
| :--- | :--- | :--- | :--- |
| GET | `/api/v1/ops/tickets` | 查询本人待办工单 | 运营 |
| GET | `/api/v1/ops/tickets/{id}` | 查询工单详情 | 运营 |
| POST | `/api/v1/ops/tickets/{id}/accept` | 受理工单 | 运营（仅被分派） |
| POST | `/api/v1/ops/tickets/{id}/internal-records` | 记录内部核实过程 | 运营（仅被分派） |
| POST | `/api/v1/ops/tickets/{id}/handling-result` | 提交处理结果 | 运营（仅被分派） |

### 7.3 请求函数

```typescript
/**
 * 查询本人待办工单
 * 仅返回 assigneeId 等于当前运营的工单
 */
export const getOpsTickets = async (
  params?: CursorPageRequest
): Promise<CursorPageResponse<InternalTicket>> => {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<InternalTicket>>>(
    '/ops/tickets',
    { params }
  );
  return resp.data.data;
};

/**
 * 查询工单详情（运营视角，包含内部记录）
 */
export const getOpsTicketDetail = async (id: number): Promise<InternalTicket> => {
  const resp = await apiClient.get<ApiResponse<InternalTicket>>(
    `/ops/tickets/${id}`
  );
  return resp.data.data;
};

/**
 * 受理工单
 * 仅 assigneeId 等于当前运营可操作
 * 工单状态必须为 PENDING
 */
export const acceptTicket = async (id: number): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/ops/tickets/${id}/accept`);
};

/**
 * 记录内部核实过程
 * 记录标记为 INTERNAL_ONLY
 */
export const createInternalRecord = async (
  data: CreateInternalRecordRequest
): Promise<number> => {
  const resp = await apiClient.post<ApiResponse<number>>(
    `/ops/tickets/${data.ticketId}/internal-records`,
    data
  );
  return resp.data.data;
};

/**
 * 提交处理结果
 * 仅 assigneeId 等于当前运营可操作
 * 工单状态必须为 PROCESSING
 * 提交后工单状态变为 PENDING_CS_CONFIRM
 */
export const submitHandlingResult = async (
  data: SubmitHandlingResultRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    `/ops/tickets/${data.ticketId}/handling-result`,
    data
  );
};
```

---

## 8. 错误码与异常处理

### 8.1 业务异常码规范

| 异常码 | 含义 | HTTP 状态码 | 场景示例 |
| :--- | :--- | :---: | :--- |
| `20000` | 成功 | 200 | 正常返回 |
| `40000` | 参数校验失败 | 400 | 必填字段缺失、格式错误 |
| `40100` | 未登录 | 401 | Token 缺失或失效 |
| `40300` | 无权操作 | 403 | 非被分派运营尝试受理工单 |
| `40400` | 资源不存在 | 404 | 运单不存在或无权查看 |
| `40900` | 状态冲突 | 409 | 已关闭工单重复关闭 |
| `50000` | 系统异常 | 500 | 未捕获的运行时异常 |

### 8.2 前端统一处理

```typescript
/**
 * 业务异常类
 */
export class BusinessError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'BusinessError';
  }
}

/**
 * 响应拦截器中的业务异常处理
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    const res = response.data;
    if (res.code !== 20000 && res.code !== 200) {
      console.warn(`[业务处理未成功] Code: ${res.code}, Message: ${res.message}`);
      throw new BusinessError(res.code, res.message);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const message = error.response?.data?.message;

    if (status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    } else if (status === 403) {
      alert('没有权限执行该操作');
    } else if (status === 404) {
      alert(message || '资源不存在或无权查看');
    } else if (status === 409) {
      alert(message || '操作状态冲突，请刷新后重试');
    } else {
      alert(message || '网络请求发生异常，请检查网络');
    }
    return Promise.reject(error);
  }
);
```

---

## 9. 接口契约检查清单

| 检查项 | 说明 | 状态 |
| :--- | :--- | :---: |
| 字段名统一小驼峰 | 后端 Java 与前端 TypeScript 均使用 `camelCase` | ✅ |
| 枚举值统一大写下划线 | 如 `PENDING_CS_CONFIRM`、`INTERNAL_ONLY` | ✅ |
| 时间字段统一 ISO 字符串 | 后端 `LocalDateTime` 序列化为 ISO 格式 | ✅ |
| 客户与内部 VO 分离 | `CustomerTicket` 与 `InternalTicket` 严格区分 | ✅ |
| 所有接口返回 `ApiResponse<T>` | 统一响应结构，前端拦截器统一解包 | ✅ |
| 所有错误走全局异常处理 | 不允许 Controller 直接返回裸错误 | ✅ |
| 幂等接口有防重机制 | 关闭工单、受理、提交结果需防重 | ✅ |
| 分页使用 Cursor-based | 单页大小默认 20，最大 100 | ✅ |
| 运单归属校验 | 客户查询非本人运单返回 `40400` | ✅ |
| 分派独占校验 | 非被分派运营操作返回 `40300` | ✅ |
| 重复关闭校验 | 已关闭工单重复关闭返回 `40900` | ✅ |
| 内部记录不返回客户 | 客户接口不返回 `INTERNAL_ONLY` 记录 | ✅ |

---

## 10. 接口总览

| 模块 | 接口数 | 主要权限 |
| :--- | :---: | :--- |
| 运单与轨迹 | 3 | 客户 |
| 异常反馈 | 2 | 客户 |
| 工单 - 客户视角 | 4 | 客户 |
| 工单 - 客服视角 | 6 | 客服 |
| 工单 - 运营视角 | 5 | 运营 |
| **合计** | **20** | — |