/**
 * @file mock/index.ts
 * 文件作用：开发态前端 Mock（仅 dev + VITE_ENABLE_MOCK=true 时启用）。
 *
 * 背景：后端尚未实现，冻结版 API.md 也未含登录接口。为便于预览页面效果，
 * 通过覆盖 apiClient 的 axios adapter，按 method+url 模式匹配返回构造的
 * ApiResponse<T>，覆盖登录 / 运单 / 异常反馈 / 工单（客户/客服/运营）全部接口。
 *
 * 特性：
 * - 三套测试账号：customer01 / cs01 / ops01，密码均为 123456
 * - 内存可变数据：受理、关闭、确认、分派等操作会改变工单状态，刷新前持续生效
 * - 工单流转对齐 PRD §3.3 状态机：不认可回 PENDING、对外说明/处理结果会落库沟通记录，
 *   内部视角与客户视角是同一实体的两个投影，状态双向同步
 * - 300ms 模拟延迟，便于观察 loading 态
 *
 * 关闭：将 .env.development 中 VITE_ENABLE_MOCK 改为 false，或后端就绪后删除即可。
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/api/apiClient';
import { SLA_HOURS } from '@/utils/display';
import type {
  ApiResponse,
  Communication,
  CursorPageResponse,
  CustomerTicket,
  ExceptionFeedback,
  ExceptionType,
  InternalTicket,
  LoginUser,
  OpsAssignee,
  StatusLog,
  TicketStatus,
  TimeoutStatus,
  TrackRecord,
  WaybillBrief,
  WaybillDetail,
} from '@/api/api-contracts';

/* ============================== 基础工具 ============================== */

/** 模拟网络延迟 */
function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 构造成功响应 */
function ok<T>(data: T): ApiResponse<T> {
  return { code: 20000, message: 'ok', data, timestamp: Math.floor(Date.now() / 1000) };
}

/** 构造业务错误响应（HTTP 仍 200，由响应拦截器解包抛 BusinessError） */
function err(code: number, message: string): ApiResponse<never> {
  return { code, message, data: undefined as never, timestamp: Math.floor(Date.now() / 1000) };
}

/** 构造分页响应（mock 一次性返回全部，无下一页游标） */
function page<T>(items: T[]): CursorPageResponse<T> {
  return { items, nextCursor: null, hasMore: false };
}

/** 构造 AxiosResponse */
function makeResponse(
  config: InternalAxiosRequestConfig,
  payload: ApiResponse<unknown>,
  status = 200,
): AxiosResponse<ApiResponse<unknown>> {
  return {
    data: payload,
    status,
    statusText: status === 200 ? 'OK' : 'ERROR',
    headers: {},
    config,
  };
}

/** 生成 ISO 时间字符串（相对当前时间偏移 offsetHours 小时） */
const iso = (offsetHours: number): string =>
  new Date(Date.now() + offsetHours * 3600_000).toISOString();

/** 预警提前量：warningAt = deadlineAt 前 6 小时（术语表 WarningAt） */
const WARNING_LEAD_HOURS = 6;

/** 依据异常类型 SLA 计算处理期限与预警时间（相对 fromHours 偏移，单位小时） */
function slaFor(type: ExceptionType, fromHours = 0): { deadlineAt: string; warningAt: string } {
  const deadlineAt = iso(fromHours + SLA_HOURS[type]);
  const warningAt = iso(fromHours + SLA_HOURS[type] - WARNING_LEAD_HOURS);
  return { deadlineAt, warningAt };
}

/**
 * 动态计算超时状态（AC 8.2/8.3）：
 * 已过期 deadlineAt → OVERDUE；到达 warningAt → WARNING；否则 NORMAL。
 * 已关闭工单不再标记超时。
 */
function computeTimeout(t: {
  status: TicketStatus;
  warningAt: string;
  deadlineAt: string;
}): TimeoutStatus {
  if (t.status === 'CLOSED') return 'NORMAL';
  const now = Date.now();
  if (now > Date.parse(t.deadlineAt)) return 'OVERDUE';
  if (now >= Date.parse(t.warningAt)) return 'WARNING';
  return 'NORMAL';
}

/** 返回给前端前重算超时状态（mock 不再依赖种子里的硬编码值） */
function freshTimeout<T extends CustomerTicket | InternalTicket>(t: T): T {
  return { ...t, timeoutStatus: computeTimeout(t) };
}

/* ============================== 种子数据 ============================== */

/** 测试账号（密码统一 123456） */
const USERS: Record<string, LoginUser> = {
  customer01: { userId: 1001, username: 'customer01', role: 'CUSTOMER', realName: '张客户' },
  cs01: { userId: 2001, username: 'cs01', role: 'CS', realName: '李客服' },
  ops01: { userId: 3001, username: 'ops01', role: 'OPS', realName: '王运营' },
};

/** 运单列表项 */
let waybillBriefs: WaybillBrief[] = [
  { id: 1, waybillNo: 'WB20240924001', status: 'IN_TRANSIT', senderCity: '北京', receiverCity: '上海', createdAt: iso(-48), updatedAt: iso(-8) },
  { id: 2, waybillNo: 'WB20240924002', status: 'SIGNED', senderCity: '广州', receiverCity: '深圳', createdAt: iso(-72), updatedAt: iso(-30) },
  { id: 3, waybillNo: 'WB20240924003', status: 'EXCEPTION', senderCity: '杭州', receiverCity: '成都', createdAt: iso(-36), updatedAt: iso(-4) },
];

/** 运单详情（含节点与轨迹） */
const waybillDetails: WaybillDetail[] = [
  {
    id: 1, waybillNo: 'WB20240924001', status: 'IN_TRANSIT',
    senderName: '张客户', senderPhone: '13800000001', senderAddress: '北京市朝阳区科技园 1 号',
    receiverName: '李收件', receiverPhone: '13900000001', receiverAddress: '上海市浦东新区张江路 88 号',
    nodes: [
      { id: 1, nodeType: 'PICKUP', location: '北京分拨中心', occurredAt: iso(-48), description: '已揽收' },
      { id: 2, nodeType: 'TRANSIT', location: '北京中转场', occurredAt: iso(-40), description: '运输中' },
      { id: 3, nodeType: 'ARRIVAL', location: '上海中转场', occurredAt: iso(-8), description: '到达中转场' },
    ],
    tracks: [
      { id: 1, waybillId: 1, nodeId: 1, content: '快件已揽收', occurredAt: iso(-48) },
      { id: 2, waybillId: 1, nodeId: 2, content: '快件到达北京中转场', occurredAt: iso(-40) },
      { id: 3, waybillId: 1, nodeId: 3, content: '快件到达上海中转场', occurredAt: iso(-8) },
    ],
    createdAt: iso(-48), updatedAt: iso(-8),
  },
  {
    id: 2, waybillNo: 'WB20240924002', status: 'SIGNED',
    senderName: '张客户', senderPhone: '13800000001', senderAddress: '广州市天河区天河路 100 号',
    receiverName: '陈收件', receiverPhone: '13700000002', receiverAddress: '深圳市南山区科技园 5 号',
    nodes: [
      { id: 4, nodeType: 'PICKUP', location: '广州分拨中心', occurredAt: iso(-72), description: '已揽收' },
      { id: 5, nodeType: 'DELIVERY', location: '深圳派送站', occurredAt: iso(-32), description: '派送中' },
      { id: 6, nodeType: 'SIGNED', location: '深圳南山区', occurredAt: iso(-30), description: '已签收' },
    ],
    tracks: [
      { id: 4, waybillId: 2, nodeId: 4, content: '快件已揽收', occurredAt: iso(-72) },
      { id: 5, waybillId: 2, nodeId: 5, content: '快件派送中', occurredAt: iso(-32) },
      { id: 6, waybillId: 2, nodeId: 6, content: '快件已签收', occurredAt: iso(-30) },
    ],
    createdAt: iso(-72), updatedAt: iso(-30),
  },
  {
    id: 3, waybillNo: 'WB20240924003', status: 'EXCEPTION',
    senderName: '张客户', senderPhone: '13800000001', senderAddress: '杭州市西湖区文三路 9 号',
    receiverName: '周收件', receiverPhone: '13600000003', receiverAddress: '成都市武侯区天府大道 2 号',
    nodes: [
      { id: 7, nodeType: 'PICKUP', location: '杭州分拨中心', occurredAt: iso(-36), description: '已揽收' },
      { id: 8, nodeType: 'TRANSIT', location: '杭州中转场', occurredAt: iso(-30), description: '运输中（包裹破损滞留）' },
    ],
    tracks: [
      { id: 7, waybillId: 3, nodeId: 7, content: '快件已揽收', occurredAt: iso(-36) },
      { id: 8, waybillId: 3, nodeId: 8, content: '快件因破损在中转场滞留', occurredAt: iso(-30) },
    ],
    createdAt: iso(-36), updatedAt: iso(-4),
  },
];

/** 异常反馈 */
let feedbacks: ExceptionFeedback[] = [
  { id: 201, waybillId: 3, waybillNo: 'WB20240924003', type: 'DAMAGE', description: '收到时外箱严重破损，内件碎裂', status: 'PENDING_ACCEPT', createdAt: iso(-20), updatedAt: iso(-20) },
  { id: 202, waybillId: 1, waybillNo: 'WB20240924001', type: 'DELAY', description: '运单 3 天未更新', status: 'CONVERTED', createdAt: iso(-28), updatedAt: iso(-24) },
];

/** 沟通记录工厂 */
function comm(id: number, role: Communication['role'], visibility: Communication['visibility'], content: string, offsetHours: number): Communication {
  return { id, role, visibility, content, createdAt: iso(offsetHours) };
}

/** 状态变更日志工厂 */
function slog(
  id: number,
  fromStatus: StatusLog['fromStatus'],
  toStatus: TicketStatus,
  operatorRole: StatusLog['operatorRole'],
  operatorId: number,
  offsetHours: number,
  reason?: string,
): StatusLog {
  return { id, fromStatus, toStatus, operatorRole, operatorId, reason, createdAt: iso(offsetHours) };
}

/** 客户视角工单（仅 CUSTOMER_VISIBLE 记录） */
let customerTickets: CustomerTicket[] = [
  {
    id: 101, ticketNo: 'T20240924001', waybillNo: 'WB20240924001', type: 'DELAY',
    status: 'PENDING_CUSTOMER_CONFIRM', ...slaFor('DELAY', -18), timeoutStatus: 'WARNING',
    communications: [
      comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24),
      comm(2, 'OPS', 'CUSTOMER_VISIBLE', '经核实因中转场爆仓延误，预计明日送达，已加急处理', -6),
    ],
    customerFeedbacks: [comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24)],
    createdAt: iso(-24), updatedAt: iso(-6),
  },
  {
    id: 102, ticketNo: 'T20240924002', waybillNo: 'WB20240924003', type: 'DAMAGE',
    status: 'PROCESSING', ...slaFor('DAMAGE', -20), timeoutStatus: 'NORMAL',
    communications: [
      comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20),
    ],
    customerFeedbacks: [comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20)],
    createdAt: iso(-20), updatedAt: iso(-4),
  },
  {
    id: 103, ticketNo: 'T20240924003', waybillNo: 'WB20240924002', type: 'SIGN_DISPUTE',
    status: 'CLOSED', ...slaFor('SIGN_DISPUTE', -40), timeoutStatus: 'NORMAL',
    communications: [
      comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40),
      comm(5, 'CS', 'CUSTOMER_VISIBLE', '已核实为代收点签收，问题已解决', -32),
    ],
    customerFeedbacks: [comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40)],
    createdAt: iso(-40), updatedAt: iso(-32),
  },
  {
    id: 104, ticketNo: 'T20240925001', waybillNo: 'WB20240924001', type: 'CONTACT_ABNORMAL',
    status: 'PENDING', ...slaFor('CONTACT_ABNORMAL', -2), timeoutStatus: 'NORMAL',
    communications: [
      comm(14, 'CUSTOMER', 'CUSTOMER_VISIBLE', '派送员反馈收件人电话无法接通，请协助提供备用联系方式', -2),
    ],
    customerFeedbacks: [comm(14, 'CUSTOMER', 'CUSTOMER_VISIBLE', '派送员反馈收件人电话无法接通，请协助提供备用联系方式', -2)],
    createdAt: iso(-2), updatedAt: iso(-2),
  },
];

/** 内部工单（客服/运营视角，含 INTERNAL_ONLY 记录与状态变更日志） */
let internalTickets: InternalTicket[] = [
  {
    id: 101, ticketNo: 'T20240924001', waybillNo: 'WB20240924001', type: 'DELAY',
    status: 'PENDING_CUSTOMER_CONFIRM', priority: 'HIGH',
    assigneeId: 3001, handlerId: 2001, feedbackId: 202,
    ...slaFor('DELAY', -18), timeoutStatus: 'WARNING',
    communications: [
      comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24),
      comm(2, 'OPS', 'CUSTOMER_VISIBLE', '经核实因中转场爆仓延误，预计明日送达，已加急处理', -6),
    ],
    internalRecords: [comm(11, 'OPS', 'INTERNAL_ONLY', '联系中转场确认积压，已协调增派车辆', -10)],
    customerFeedbacks: [comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24)],
    statusLogs: [
      slog(1, null, 'PENDING', 'CS', 2001, -24, '由异常反馈 #202 转化'),
      slog(2, 'PENDING', 'PROCESSING', 'OPS', 3001, -12),
      slog(3, 'PROCESSING', 'PENDING_CS_CONFIRM', 'OPS', 3001, -8),
      slog(4, 'PENDING_CS_CONFIRM', 'PENDING_CUSTOMER_CONFIRM', 'CS', 2001, -6),
    ],
    createdAt: iso(-24), updatedAt: iso(-6),
  },
  {
    id: 102, ticketNo: 'T20240924002', waybillNo: 'WB20240924003', type: 'DAMAGE',
    status: 'PROCESSING', priority: 'URGENT',
    assigneeId: 3001, handlerId: 2001, feedbackId: 201,
    ...slaFor('DAMAGE', -20), timeoutStatus: 'NORMAL',
    communications: [comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20)],
    internalRecords: [comm(12, 'OPS', 'INTERNAL_ONLY', '已联系理赔组介入，等待定损照片', -8)],
    customerFeedbacks: [comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20)],
    statusLogs: [
      slog(5, null, 'PENDING', 'CS', 2001, -20, '由异常反馈 #201 转化'),
      slog(6, 'PENDING', 'PROCESSING', 'OPS', 3001, -16),
    ],
    createdAt: iso(-20), updatedAt: iso(-4),
  },
  {
    id: 103, ticketNo: 'T20240924003', waybillNo: 'WB20240924002', type: 'SIGN_DISPUTE',
    status: 'CLOSED', priority: 'MEDIUM',
    assigneeId: 3001, handlerId: 2001, feedbackId: 0,
    ...slaFor('SIGN_DISPUTE', -40), timeoutStatus: 'NORMAL',
    communications: [
      comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40),
      comm(5, 'CS', 'CUSTOMER_VISIBLE', '已核实为代收点签收，问题已解决', -32),
    ],
    internalRecords: [comm(13, 'OPS', 'INTERNAL_ONLY', '调取签收底单，确认代收点签收', -36)],
    customerFeedbacks: [comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40)],
    statusLogs: [
      slog(7, null, 'PENDING', 'CS', 2001, -40),
      slog(8, 'PENDING', 'PROCESSING', 'OPS', 3001, -38),
      slog(9, 'PROCESSING', 'PENDING_CS_CONFIRM', 'OPS', 3001, -34),
      slog(10, 'PENDING_CS_CONFIRM', 'PENDING_CUSTOMER_CONFIRM', 'CS', 2001, -33),
      slog(11, 'PENDING_CUSTOMER_CONFIRM', 'CLOSED', 'CUSTOMER', 1001, -32),
    ],
    createdAt: iso(-40), updatedAt: iso(-32),
  },
  {
    id: 104, ticketNo: 'T20240925001', waybillNo: 'WB20240924001', type: 'CONTACT_ABNORMAL',
    status: 'PENDING', priority: 'MEDIUM',
    assigneeId: 3001, handlerId: 2001, feedbackId: 0,
    ...slaFor('CONTACT_ABNORMAL', -2), timeoutStatus: 'NORMAL',
    communications: [
      comm(14, 'CUSTOMER', 'CUSTOMER_VISIBLE', '派送员反馈收件人电话无法接通，请协助提供备用联系方式', -2),
    ],
    internalRecords: [],
    customerFeedbacks: [
      comm(14, 'CUSTOMER', 'CUSTOMER_VISIBLE', '派送员反馈收件人电话无法接通，请协助提供备用联系方式', -2),
    ],
    statusLogs: [slog(12, null, 'PENDING', 'CS', 2001, -2)],
    createdAt: iso(-2), updatedAt: iso(-2),
  },
];

/** 自增 id 计数器 */
let nextFeedbackId = 203;
let nextTicketId = 105;
let nextCommId = 100;
let nextLogId = 100;

/* ============================== 路由匹配 ============================== */

interface ParsedBody {
  username?: string;
  password?: string;
  waybillNo?: string;
  type?: string;
  description?: string;
  feedbackId?: number;
  priority?: string;
  ticketId?: number;
  assigneeId?: number;
  content?: string;
  plan?: string;
  result?: string;
  reason?: string;
  remark?: string;
}

/** 当前会话用户（由 mock-jwt-{userId} token 解析） */
interface Session {
  userId: number;
  role: LoginUser['role'];
}

function sessionOf(userId: number | null): Session | null {
  if (userId == null) return null;
  const user = Object.values(USERS).find((u) => u.userId === userId);
  return user ? { userId: user.userId, role: user.role } : null;
}

/** 状态流转统一入口：同步双投影状态 + 记录 TicketStatusLog（AC 11.1） */
function transition(
  id: number,
  to: TicketStatus,
  session: Session | null,
  reason?: string,
): void {
  const from = internalTickets.find((t) => t.id === id)?.status
    ?? customerTickets.find((t) => t.id === id)?.status
    ?? null;
  setTicketStatus(id, to);
  internalTickets = internalTickets.map((t) =>
    t.id === id
      ? {
          ...t,
          statusLogs: [
            ...t.statusLogs,
            slog(nextLogId++, from, to, session?.role ?? null, session?.userId ?? 0, 0, reason),
          ],
        }
      : t,
  );
}

/** 工单关闭时，关联异常反馈随之流转 CLOSED（v1.1 提案语义，见 API.md §11） */
function closeLinkedFeedback(ticketId: number): void {
  const feedbackId = internalTickets.find((t) => t.id === ticketId)?.feedbackId;
  const fb = feedbacks.find((f) => f.id === feedbackId);
  if (fb) fb.status = 'CLOSED';
}

/**
 * 分派独占校验（AC 4.3/5.3、API §9）：
 * 仅被分派运营可受理 / 记录核实 / 提交结果，否则 40300。
 */
function requireAssignee(t: InternalTicket, session: Session | null): ApiResponse<never> | null {
  if (!session) return err(40100, '未登录');
  if (t.assigneeId !== session.userId || session.role !== 'OPS') {
    return err(40300, '仅被分派运营可操作该工单');
  }
  return null;
}

/** 主路由：按 method + url 返回 ApiResponse */
function route(
  method: string,
  url: string,
  _params: Record<string, unknown>,
  body: ParsedBody,
  currentUserId: number | null,
): ApiResponse<unknown> {
  const session = sessionOf(currentUserId);
  let m: RegExpMatchArray | null;

  /* ---------------------------- 登录 ---------------------------- */
  if (method === 'post' && url === '/auth/login') {
    const user = body.username ? USERS[body.username] : undefined;
    if (!user || body.password !== '123456') {
      return err(40100, '用户名或密码错误');
    }
    return ok({ token: `mock-jwt-${user.userId}`, user });
  }

  /* ---------------------------- 运单（客户） ---------------------------- */
  if (method === 'get' && url === '/customer/waybills') {
    return ok(page(waybillBriefs));
  }
  if (method === 'get' && (m = url.match(/^\/customer\/waybills\/([^/]+)\/tracks$/))) {
    const w = waybillDetails.find((x) => x.waybillNo === m![1]);
    return w ? ok(w.tracks as TrackRecord[]) : err(40400, '运单不存在或无权查看');
  }
  if (method === 'get' && (m = url.match(/^\/customer\/waybills\/([^/]+)$/))) {
    const w = waybillDetails.find((x) => x.waybillNo === m![1]);
    return w ? ok(w) : err(40400, '运单不存在或无权查看');
  }

  /* ---------------------------- 异常反馈（客户） ---------------------------- */
  if (method === 'post' && url === '/customer/exception-feedbacks') {
    // 归属校验（PRD §3.2 / AC 2.3）：运单不存在或不属于当前客户时拒绝提交，不创建记录
    const src = waybillDetails.find((x) => x.waybillNo === body.waybillNo);
    if (!src) return err(40400, '运单不存在或无权查看');
    const fb: ExceptionFeedback = {
      id: nextFeedbackId,
      waybillId: src.id,
      waybillNo: src.waybillNo,
      type: (body.type as ExceptionFeedback['type']) ?? 'DELAY',
      description: body.description ?? '',
      status: 'PENDING_ACCEPT',
      createdAt: iso(0), updatedAt: iso(0),
    };
    feedbacks = [fb, ...feedbacks];
    return ok(fb.id);
  }
  if (method === 'get' && (m = url.match(/^\/customer\/exception-feedbacks\/(\d+)$/))) {
    const fb = feedbacks.find((x) => x.id === Number(m![1]));
    return fb ? ok(fb) : err(40400, '反馈不存在');
  }

  /* ---------------------------- 工单（客户） ---------------------------- */
  if (method === 'get' && url === '/customer/tickets') {
    return ok(page(customerTickets.map(freshTimeout)));
  }
  if (method === 'post' && (m = url.match(/^\/customer\/tickets\/(\d+)\/confirm$/))) {
    const id = Number(m![1]);
    const t = customerTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    if (t.status !== 'PENDING_CUSTOMER_CONFIRM') return err(40900, '仅待客户确认的工单可确认结果');
    // 客户确认 → CLOSED（PRD §3.3），内部视角同步关闭；关联反馈流转 CLOSED（#17）
    const remark = body.remark?.trim();
    if (remark) {
      appendCommunication(
        id,
        comm(nextCommId++, 'CUSTOMER', 'CUSTOMER_VISIBLE', `客户确认处理结果：${remark}`, 0),
      );
    }
    transition(id, 'CLOSED', session, remark || undefined);
    closeLinkedFeedback(id);
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/customer\/tickets\/(\d+)\/reject$/))) {
    const id = Number(m![1]);
    const t = customerTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    if (t.status !== 'PENDING_CUSTOMER_CONFIRM') return err(40900, '仅待客户确认的工单可不认可');
    // 客户不认可 → 重新打开回 PENDING（PRD §3.3 / AC 7.3），
    // 追加不认可沟通记录 + 状态日志，原记录全部保留（AC 9.3 / 11.3）
    const reason = body.reason?.trim() || '（未填写理由）';
    transition(id, 'PENDING', session, `客户不认可：${reason}`);
    appendCommunication(
      id,
      comm(nextCommId++, 'CUSTOMER', 'CUSTOMER_VISIBLE', `客户不认可处理结果，申请继续处理：${reason}`, 0),
    );
    return ok(null);
  }
  if (method === 'get' && (m = url.match(/^\/customer\/tickets\/(\d+)$/))) {
    const t = customerTickets.find((x) => x.id === Number(m![1]));
    return t ? ok(freshTimeout(t)) : err(40400, '工单不存在');
  }

  /* ---------------------------- 客服 ---------------------------- */
  if (method === 'get' && url === '/cs/feedbacks') {
    const status = _params.status as string | undefined;
    const list = status && status !== 'ALL'
      ? feedbacks.filter((f) => f.status === status)
      : feedbacks;
    return ok(page(list));
  }
  // 运营候选人 + 当前待办数（provisional，API.md §11 提案：GET /cs/ops-staff）
  if (method === 'get' && url === '/cs/ops-staff') {
    const ops = Object.values(USERS).filter((u) => u.role === 'OPS');
    const list: OpsAssignee[] = ops.map((u) => ({
      userId: u.userId,
      realName: u.realName ?? u.username,
      todoCount: internalTickets.filter((t) => t.assigneeId === u.userId && t.status !== 'CLOSED')
        .length,
    }));
    return ok(list);
  }
  if (method === 'post' && url === '/cs/tickets') {
    const src = feedbacks.find((x) => x.id === body.feedbackId);
    const newId = nextTicketId++;
    const tNo = `T20240924${String(newId).padStart(3, '0')}`;
    const type = (body.type ?? src?.type ?? 'DELAY') as InternalTicket['type'];
    const sla = slaFor(type);
    const newTicket: InternalTicket = {
      id: newId, ticketNo: tNo, waybillNo: src?.waybillNo ?? '', type,
      status: 'PENDING', priority: (body.priority as InternalTicket['priority']) ?? 'MEDIUM',
      assigneeId: body.assigneeId ?? 0, handlerId: session?.userId ?? 0,
      feedbackId: src?.id ?? 0, ...sla, timeoutStatus: 'NORMAL',
      communications: [], internalRecords: [], customerFeedbacks: [],
      statusLogs: [slog(nextLogId++, null, 'PENDING', session?.role ?? null, session?.userId ?? 0, 0, `由异常反馈 #${src?.id ?? '?'} 转化`)],
      createdAt: iso(0), updatedAt: iso(0),
    };
    internalTickets = [newTicket, ...internalTickets];
    // 同步生成客户视角投影（同一工单实体的两个视图，客户可见初始沟通记录）
    const initComm = comm(nextCommId++, 'CUSTOMER', 'CUSTOMER_VISIBLE', src?.description ?? '', 0);
    const customerProjection: CustomerTicket = {
      id: newId, ticketNo: tNo, waybillNo: newTicket.waybillNo, type: newTicket.type,
      status: 'PENDING', deadlineAt: newTicket.deadlineAt, warningAt: newTicket.warningAt,
      timeoutStatus: 'NORMAL',
      communications: [initComm], customerFeedbacks: [initComm],
      createdAt: iso(0), updatedAt: iso(0),
    };
    customerTickets = [customerProjection, ...customerTickets];
    if (src) src.status = 'CONVERTED';
    return ok(newId);
  }
  if (method === 'get' && url === '/cs/tickets') {
    return ok(page(internalTickets.map(freshTimeout)));
  }
  if (method === 'post' && (m = url.match(/^\/cs\/tickets\/(\d+)\/assign$/))) {
    const id = Number(m![1]);
    if (!internalTickets.some((x) => x.id === id)) return err(40400, '工单不存在');
    patchInternal(id, { assigneeId: body.assigneeId ?? 0 });
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/cs\/tickets\/(\d+)\/customer-feedback$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    // 客服确认对外说明（AC 6.2）：保存 CUSTOMER_VISIBLE 反馈记录，进入待客户确认
    const content = body.content?.trim();
    if (!content) return err(40000, '对外说明不能为空');
    if (t.status !== 'PENDING_CS_CONFIRM') return err(40900, '仅待客服确认的工单可生成对外说明');
    const record = comm(nextCommId++, 'CS', 'CUSTOMER_VISIBLE', content, 0);
    appendCommunication(id, record);
    appendCustomerFeedback(id, record);
    transition(id, 'PENDING_CUSTOMER_CONFIRM', session);
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/cs\/tickets\/(\d+)\/close$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    if (t.status === 'CLOSED') return err(40900, '工单已关闭，请勿重复操作');
    transition(id, 'CLOSED', session);
    closeLinkedFeedback(id);
    return ok(null);
  }
  if (method === 'get' && (m = url.match(/^\/cs\/tickets\/(\d+)$/))) {
    const t = internalTickets.find((x) => x.id === Number(m![1]));
    return t ? ok(freshTimeout(t)) : err(40400, '工单不存在');
  }

  /* ---------------------------- 运营 ---------------------------- */
  // 待办列表仅返回分派给当前运营的工单（AC 4.1）
  if (method === 'get' && url === '/ops/tickets') {
    if (!session) return err(40100, '未登录');
    const mine = internalTickets.filter((t) => t.assigneeId === session.userId);
    return ok(page(mine.map(freshTimeout)));
  }
  if (method === 'post' && (m = url.match(/^\/ops\/tickets\/(\d+)\/accept$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    const denied = requireAssignee(t, session);
    if (denied) return denied;
    if (t.status !== 'PENDING') return err(40900, '仅待处理工单可受理');
    // 受理不改 handlerId（负责人仍是建单客服，术语表 Handler=负责客服）
    transition(id, 'PROCESSING', session);
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/ops\/tickets\/(\d+)\/internal-records$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    const denied = requireAssignee(t, session);
    if (denied) return denied;
    if (t.status !== 'PROCESSING') return err(40900, '仅处理中工单可记录核实过程');
    // 内部核实记录：INTERNAL_ONLY，仅写入内部视角，不进入客户投影（AC 5.1 / US-10）
    const record = comm(nextCommId++, 'OPS', 'INTERNAL_ONLY', body.content ?? '', 0);
    appendInternalRecord(id, record);
    return ok(record.id);
  }
  if (method === 'post' && (m = url.match(/^\/ops\/tickets\/(\d+)\/handling-result$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (!t) return err(40400, '工单不存在');
    const denied = requireAssignee(t, session);
    if (denied) return denied;
    if (t.status !== 'PROCESSING') return err(40900, '仅处理中工单可提交处理结果');
    // 提交处理结果（AC 5.2）：保存内部处理方案与结果，进入待客服确认
    const record = comm(
      nextCommId++,
      'OPS',
      'INTERNAL_ONLY',
      `【处理方案】${body.plan ?? ''}\n【处理结果】${body.result ?? ''}`,
      0,
    );
    appendInternalRecord(id, record);
    transition(id, 'PENDING_CS_CONFIRM', session);
    return ok(null);
  }
  if (method === 'get' && (m = url.match(/^\/ops\/tickets\/(\d+)$/))) {
    const t = internalTickets.find((x) => x.id === Number(m![1]));
    return t ? ok(freshTimeout(t)) : err(40400, '工单不存在');
  }

  /* ---------------------------- 未匹配 ---------------------------- */
  // eslint-disable-next-line no-console
  console.warn(`[mock] 未匹配的请求: ${method.toUpperCase()} ${url}`);
  return err(40400, `Mock 未覆盖该接口: ${method.toUpperCase()} ${url}`);
}

/** 同步更新内部视角工单字段（不同步客户投影的字段：分派、负责人） */
function patchInternal(
  id: number,
  patch: Partial<Pick<InternalTicket, 'assigneeId' | 'handlerId'>>,
): void {
  internalTickets = internalTickets.map((t) =>
    t.id === id ? { ...t, ...patch, updatedAt: iso(0) } : t,
  );
}

/** 同步更新工单状态：内部视角与客户视角是同一实体的两个投影，状态必须一致 */
function setTicketStatus(id: number, status: TicketStatus): void {
  internalTickets = internalTickets.map((t) =>
    t.id === id ? { ...t, status, updatedAt: iso(0) } : t,
  );
  customerTickets = customerTickets.map((t) =>
    t.id === id ? { ...t, status, updatedAt: iso(0) } : t,
  );
}

/**
 * 追加沟通记录：写入内部视角的 communications（全部）；
 * 仅 CUSTOMER_VISIBLE 记录同步进入客户视角投影（AC 10.3）。
 */
function appendCommunication(id: number, c: Communication): void {
  internalTickets = internalTickets.map((t) =>
    t.id === id ? { ...t, communications: [...t.communications, c], updatedAt: iso(0) } : t,
  );
  if (c.visibility === 'CUSTOMER_VISIBLE') {
    customerTickets = customerTickets.map((t) =>
      t.id === id ? { ...t, communications: [...t.communications, c], updatedAt: iso(0) } : t,
    );
  }
}

/** 追加对外反馈记录（CustomerFeedbackRecord，两视角的 customerFeedbacks） */
function appendCustomerFeedback(id: number, c: Communication): void {
  internalTickets = internalTickets.map((t) =>
    t.id === id ? { ...t, customerFeedbacks: [...t.customerFeedbacks, c], updatedAt: iso(0) } : t,
  );
  customerTickets = customerTickets.map((t) =>
    t.id === id ? { ...t, customerFeedbacks: [...t.customerFeedbacks, c], updatedAt: iso(0) } : t,
  );
}

/** 追加内部核实/处理记录（INTERNAL_ONLY，仅存在内部视角） */
function appendInternalRecord(id: number, c: Communication): void {
  internalTickets = internalTickets.map((t) =>
    t.id === id ? { ...t, internalRecords: [...t.internalRecords, c], updatedAt: iso(0) } : t,
  );
}

/* ============================== 装配 ============================== */

/**
 * 从请求头的 mock token（`Bearer mock-jwt-<userId>`）解析当前登录用户 id。
 * 真实后端以 JWT 解析用户，mock 用同一入口保证会话一致。
 */
function userIdFromToken(config: InternalAxiosRequestConfig): number | null {
  const raw = (config.headers?.Authorization ?? config.headers?.authorization) as
    | string
    | undefined;
  const match = raw?.match(/mock-jwt-(\d+)/);
  return match ? Number(match[1]) : null;
}

/** 安装 mock：覆盖 apiClient 的 adapter */
export function setupMock(): void {
  apiClient.defaults.adapter = async (
    config: InternalAxiosRequestConfig,
  ): Promise<AxiosResponse<ApiResponse<unknown>>> => {
    await delay();

    const method = (config.method ?? 'get').toLowerCase();
    const url = (config.url ?? '').split('?')[0];
    const params = (config.params as Record<string, unknown>) ?? {};

    let body: ParsedBody = {};
    if (config.data) {
      try {
        body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      } catch {
        body = {};
      }
    }

    const payload = route(method, url, params, body, userIdFromToken(config));
    return makeResponse(config, payload);
  };

  // eslint-disable-next-line no-console
  console.info(
    '%c[mock] 已启用前端 Mock',
    'color:#00E5FF',
    '— 账号: customer01 / cs01 / ops01，密码: 123456',
  );
}
