/**
 * @file api-contracts.ts
 * 文件作用：前端接口契约的【单一事实来源】，与 docs/API.md（Frozen 已冻结）逐字对齐。
 * 包含：统一响应结构 ApiResponse<T>、游标分页、全部枚举、全部实体 VO / DTO 类型、
 *       业务异常类与业务码。所有 API 请求模块、Pinia Store、公共组件均从此处导入类型。
 *
 * 约定：
 * - 字段名小驼峰；枚举值大写下划线；时间字段统一 ISO 字符串。
 * - 严禁在前端渲染 INTERNAL_ONLY 记录给客户视角。
 * - 认证相关 LoginRole / LoginUser 为前端 provisional 类型，待认证接口冻结后对齐。
 */

/* ================================================================== *
 * 1. 统一响应结构与分页
 * ================================================================== */

/** 后端统一响应结构（对应 Java Result<T>） */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，20000 表示成功 */
  code: number;
  /** 面向前端用户的提示文本 */
  message: string;
  /** 数据载荷 */
  data: T;
  /** 时间戳（秒） */
  timestamp: number;
}

/** 游标分页请求参数（Cursor-based Pagination） */
export interface CursorPageRequest {
  /** 游标，首次请求为空 */
  cursor?: string;
  /** 单页大小，默认 20，最大 100 */
  size?: number;
}

/** 游标分页响应结构 */
export interface CursorPageResponse<T> {
  items: T[];
  /** 下一页游标，无更多数据时为 null */
  nextCursor: string | null;
  /** 是否还有更多数据 */
  hasMore: boolean;
}

/* ================================================================== *
 * 2. 全局枚举
 * ================================================================== */

/** 异常类型：延误 / 物品破损 / 标签破损 / 联系人异常 / 签收争议 */
export type ExceptionType =
  | 'DELAY'
  | 'DAMAGE'
  | 'LABEL_DAMAGED'
  | 'CONTACT_ABNORMAL'
  | 'SIGN_DISPUTE';

/** 工单状态 */
export type TicketStatus =
  | 'PENDING' // 待处理
  | 'PROCESSING' // 处理中
  | 'PENDING_CS_CONFIRM' // 待客服确认
  | 'PENDING_CUSTOMER_CONFIRM' // 待客户确认
  | 'CLOSED'; // 已关闭

/** 超时状态 */
export type TimeoutStatus =
  | 'NORMAL' // 正常
  | 'WARNING' // 即将超时
  | 'OVERDUE'; // 已超时

/** 记录可见性 */
export type Visibility =
  | 'CUSTOMER_VISIBLE' // 客户可见
  | 'INTERNAL_ONLY'; // 仅内部可见

/** 异常反馈状态 */
export type FeedbackStatus =
  | 'PENDING_ACCEPT' // 待受理
  | 'CONVERTED' // 已转工单
  | 'CLOSED'; // 已关闭

/** 沟通角色 */
export type CommunicationRole =
  | 'CUSTOMER' // 客户
  | 'CS' // 客服
  | 'OPS'; // 运营

/** 工单优先级 */
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** 运单状态 */
export type WaybillStatus =
  | 'PICKED_UP' // 已揽收
  | 'IN_TRANSIT' // 运输中
  | 'DELIVERING' // 派送中
  | 'SIGNED' // 已签收
  | 'EXCEPTION'; // 异常

/** 运输节点类型 */
export type NodeType =
  | 'PICKUP' // 揽收
  | 'TRANSIT' // 中转
  | 'ARRIVAL' // 到达
  | 'DELIVERY' // 派送
  | 'SIGNED'; // 签收

/* ================================================================== *
 * 3. 运单与轨迹（Waybill & Tracking）
 * ================================================================== */

/** 运输节点（TransportNodeVO） */
export interface TransportNode {
  id: number;
  nodeType: NodeType;
  location: string;
  /** ISO 格式 */
  occurredAt: string;
  description: string;
}

/** 轨迹记录（TrackRecordVO） */
export interface TrackRecord {
  id: number;
  waybillId: number;
  nodeId: number;
  content: string;
  /** ISO 格式 */
  occurredAt: string;
}

/** 运单列表项（WaybillBriefVO） */
export interface WaybillBrief {
  id: number;
  waybillNo: string;
  status: WaybillStatus;
  senderCity: string;
  receiverCity: string;
  /** ISO 格式 */
  createdAt: string;
  /** ISO 格式 */
  updatedAt: string;
}

/** 运单详情（WaybillDetailVO，仅返回属于当前客户的运单） */
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
  /** ISO 格式 */
  createdAt: string;
  /** ISO 格式 */
  updatedAt: string;
}

/**
 * 术语对齐别名：领域术语表中实体名为 Waybill，
 * 冻结契约里的字段名是 WaybillDetail，这里以别名同时满足两侧命名约束。
 */
export type Waybill = WaybillDetail;

/* ================================================================== *
 * 4. 异常反馈（ExceptionFeedback）
 * ================================================================== */

/** 提交异常反馈入参（CreateFeedbackDTO） */
export interface CreateFeedbackRequest {
  waybillNo: string;
  type: ExceptionType;
  description: string;
}

/** 异常反馈详情（ExceptionFeedbackVO） */
export interface ExceptionFeedback {
  id: number;
  waybillId: number;
  waybillNo: string;
  type: ExceptionType;
  description: string;
  status: FeedbackStatus;
  /** ISO 格式 */
  createdAt: string;
  /** ISO 格式 */
  updatedAt: string;
}

/* ================================================================== *
 * 5. 工单沟通记录（TicketCommunication）
 * ================================================================== */

/** 沟通记录（CommunicationVO） */
export interface Communication {
  id: number;
  role: CommunicationRole;
  visibility: Visibility;
  content: string;
  /** ISO 格式 */
  createdAt: string;
}

/** 术语对齐别名：领域术语表名称 TicketCommunication */
export type TicketCommunication = Communication;

/* ================================================================== *
 * 6. 客户视角工单（CustomerTicket）
 * ================================================================== */

/** 客户可见工单详情（CustomerTicketVO，仅含 CUSTOMER_VISIBLE 记录） */
export interface CustomerTicket {
  id: number;
  ticketNo: string;
  waybillNo: string;
  type: ExceptionType;
  status: TicketStatus;
  deadlineAt: string;
  timeoutStatus: TimeoutStatus;
  /** 仅 CUSTOMER_VISIBLE */
  communications: Communication[];
  /** 仅 CUSTOMER_VISIBLE */
  customerFeedbacks: Communication[];
  /** ISO 格式 */
  createdAt: string;
  /** ISO 格式 */
  updatedAt: string;
}

/** 客户确认处理结果入参 */
export interface ConfirmTicketRequest {
  ticketId: number;
  remark?: string;
}

/** 客户不认可、申请继续处理入参 */
export interface RejectTicketRequest {
  ticketId: number;
  reason: string;
}

/* ================================================================== *
 * 7. 内部工单（InternalTicket：客服 / 运营视角）
 * ================================================================== */

/** 创建工单入参（CreateTicketDTO） */
export interface CreateTicketRequest {
  feedbackId: number;
  type: ExceptionType;
  priority: Priority;
}

/** 分派工单入参（AssignTicketDTO） */
export interface AssignTicketRequest {
  ticketId: number;
  assigneeId: number;
}

/** 确认对外说明入参（ConfirmCustomerFeedbackDTO） */
export interface ConfirmCustomerFeedbackRequest {
  ticketId: number;
  content: string;
}

/** 内部工单详情（InternalTicketVO，客服与运营可见，含 INTERNAL_ONLY 记录） */
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
  /** 全部沟通记录 */
  communications: Communication[];
  /** 仅 INTERNAL_ONLY 内部核实记录（InternalHandlingRecord） */
  internalRecords: Communication[];
  /** 仅 CUSTOMER_VISIBLE 客户反馈记录（CustomerFeedbackRecord） */
  customerFeedbacks: Communication[];
  /** ISO 格式 */
  createdAt: string;
  /** ISO 格式 */
  updatedAt: string;
}

/* ================================================================== *
 * 8. 运营视角入参（Ops Ticket DTO）
 * ================================================================== */

/** 记录内部核实过程入参（CreateInternalRecordDTO） */
export interface CreateInternalRecordRequest {
  ticketId: number;
  content: string;
}

/** 提交处理结果入参（SubmitHandlingResultDTO） */
export interface SubmitHandlingResultRequest {
  ticketId: number;
  plan: string;
  result: string;
}

/* ================================================================== *
 * 9. 错误码与业务异常
 * ================================================================== */

/**
 * 业务异常类
 * 响应拦截器解析到非成功业务码时抛出，业务层可通过 instanceof 精确捕获，
 * 与网络层的 AxiosError 区分。
 */
export class BusinessError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
  }
}

/**
 * 业务码（API.md §8.1）
 * 使用 as const 对象而非 const enum，兼容 esbuild 的 isolatedModules。
 */
export const BizCode = {
  SUCCESS: 20000,
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  CONFLICT: 40900,
  SERVER_ERROR: 50000,
} as const;

export type BizCode = (typeof BizCode)[keyof typeof BizCode];

/* ================================================================== *
 * 10. 认证相关（provisional，待登录接口冻结后对齐）
 * ================================================================== */

/** 登录角色：客户 / 客服 / 运营 */
export type LoginRole = 'CUSTOMER' | 'CS' | 'OPS';

/** 登录用户信息（前端暂定，登录接口冻结后以后端契约为准） */
export interface LoginUser {
  userId: number;
  username: string;
  role: LoginRole;
  realName?: string;
}

/** 登录接口入参（前端暂定） */
export interface LoginRequest {
  username: string;
  password: string;
}

/** 登录接口返回（前端暂定） */
export interface LoginResult {
  token: string;
  user: LoginUser;
}

/**
 * 运营分派候选人（provisional）
 * 阶段 3「客服创建并分派工单」页需要运营姓名 + 当前待办数，
 * 冻结版 API.md 尚未提供该查询接口，待后端补齐后由专门接口返回。
 */
export interface OpsAssignee {
  /** 运营用户 id（分派接口 assigneeId） */
  userId: number;
  /** 运营姓名 */
  realName: string;
  /** 当前待办工单数 */
  todoCount: number;
}
