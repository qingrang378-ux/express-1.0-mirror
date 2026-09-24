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
 * - 300ms 模拟延迟，便于观察 loading 态
 *
 * 关闭：将 .env.development 中 VITE_ENABLE_MOCK 改为 false，或后端就绪后删除即可。
 */
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '@/api/apiClient';
import type {
  ApiResponse,
  Communication,
  CursorPageResponse,
  CustomerTicket,
  ExceptionFeedback,
  InternalTicket,
  LoginUser,
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

/** 客户视角工单（仅 CUSTOMER_VISIBLE 记录） */
let customerTickets: CustomerTicket[] = [
  {
    id: 101, ticketNo: 'T20240924001', waybillNo: 'WB20240924001', type: 'DELAY',
    status: 'PENDING_CUSTOMER_CONFIRM', deadlineAt: iso(6), timeoutStatus: 'WARNING',
    communications: [
      comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24),
      comm(2, 'OPS', 'CUSTOMER_VISIBLE', '经核实因中转场爆仓延误，预计明日送达，已加急处理', -6),
    ],
    customerFeedbacks: [comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24)],
    createdAt: iso(-24), updatedAt: iso(-6),
  },
  {
    id: 102, ticketNo: 'T20240924002', waybillNo: 'WB20240924003', type: 'DAMAGE',
    status: 'PROCESSING', deadlineAt: iso(30), timeoutStatus: 'NORMAL',
    communications: [
      comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20),
    ],
    customerFeedbacks: [comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20)],
    createdAt: iso(-20), updatedAt: iso(-4),
  },
  {
    id: 103, ticketNo: 'T20240924003', waybillNo: 'WB20240924002', type: 'SIGN_DISPUTE',
    status: 'CLOSED', deadlineAt: iso(-2), timeoutStatus: 'NORMAL',
    communications: [
      comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40),
      comm(5, 'CS', 'CUSTOMER_VISIBLE', '已核实为代收点签收，问题已解决', -32),
    ],
    customerFeedbacks: [comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40)],
    createdAt: iso(-40), updatedAt: iso(-32),
  },
];

/** 内部工单（客服/运营视角，含 INTERNAL_ONLY 记录） */
let internalTickets: InternalTicket[] = [
  {
    id: 101, ticketNo: 'T20240924001', waybillNo: 'WB20240924001', type: 'DELAY',
    status: 'PENDING_CUSTOMER_CONFIRM', priority: 'HIGH', assigneeId: 3001, handlerId: 3001,
    deadlineAt: iso(6), timeoutStatus: 'WARNING',
    communications: [
      comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24),
      comm(2, 'OPS', 'CUSTOMER_VISIBLE', '经核实因中转场爆仓延误，预计明日送达，已加急处理', -6),
    ],
    internalRecords: [comm(11, 'OPS', 'INTERNAL_ONLY', '联系中转场确认积压，已协调增派车辆', -10)],
    customerFeedbacks: [comm(1, 'CUSTOMER', 'CUSTOMER_VISIBLE', '运单已 3 天未更新，疑似延误', -24)],
    createdAt: iso(-24), updatedAt: iso(-6),
  },
  {
    id: 102, ticketNo: 'T20240924002', waybillNo: 'WB20240924003', type: 'DAMAGE',
    status: 'PROCESSING', priority: 'URGENT', assigneeId: 3001, handlerId: 3001,
    deadlineAt: iso(30), timeoutStatus: 'NORMAL',
    communications: [comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20)],
    internalRecords: [comm(12, 'OPS', 'INTERNAL_ONLY', '已联系理赔组介入，等待定损照片', -8)],
    customerFeedbacks: [comm(3, 'CUSTOMER', 'CUSTOMER_VISIBLE', '收到时外箱破损，内件碎裂', -20)],
    createdAt: iso(-20), updatedAt: iso(-4),
  },
  {
    id: 103, ticketNo: 'T20240924003', waybillNo: 'WB20240924002', type: 'SIGN_DISPUTE',
    status: 'CLOSED', priority: 'MEDIUM', assigneeId: 3001, handlerId: 3001,
    deadlineAt: iso(-2), timeoutStatus: 'NORMAL',
    communications: [
      comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40),
      comm(5, 'CS', 'CUSTOMER_VISIBLE', '已核实为代收点签收，问题已解决', -32),
    ],
    internalRecords: [comm(13, 'OPS', 'INTERNAL_ONLY', '调取签收底单，确认代收点签收', -36)],
    customerFeedbacks: [comm(4, 'CUSTOMER', 'CUSTOMER_VISIBLE', '未本人签收但显示已签收', -40)],
    createdAt: iso(-40), updatedAt: iso(-32),
  },
];

/** 自增 id 计数器 */
let nextFeedbackId = 203;
let nextTicketId = 104;
let nextCommId = 100;

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
}

/** 主路由：按 method + url 返回 ApiResponse */
function route(
  method: string,
  url: string,
  _params: Record<string, unknown>,
  body: ParsedBody,
): ApiResponse<unknown> {
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
    const fb: ExceptionFeedback = {
      id: nextFeedbackId,
      waybillId: waybillDetails.find((x) => x.waybillNo === body.waybillNo)?.id ?? 0,
      waybillNo: body.waybillNo ?? '',
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
    return ok(page(customerTickets));
  }
  if (method === 'post' && (m = url.match(/^\/customer\/tickets\/(\d+)\/confirm$/))) {
    updateTicket(Number(m![1]), { status: 'CLOSED' });
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/customer\/tickets\/(\d+)\/reject$/))) {
    updateTicket(Number(m![1]), { status: 'PROCESSING' });
    return ok(null);
  }
  if (method === 'get' && (m = url.match(/^\/customer\/tickets\/(\d+)$/))) {
    const t = customerTickets.find((x) => x.id === Number(m![1]));
    return t ? ok(t) : err(40400, '工单不存在');
  }

  /* ---------------------------- 客服 ---------------------------- */
  if (method === 'get' && url === '/cs/feedbacks') {
    return ok(page(feedbacks));
  }
  if (method === 'post' && url === '/cs/tickets') {
    const src = feedbacks.find((x) => x.id === body.feedbackId);
    const newId = nextTicketId++;
    const tNo = `T20240924${String(newId).padStart(3, '0')}`;
    const newTicket: InternalTicket = {
      id: newId, ticketNo: tNo, waybillNo: src?.waybillNo ?? '', type: (src?.type ?? 'DELAY') as InternalTicket['type'],
      status: 'PENDING', priority: (body.priority as InternalTicket['priority']) ?? 'MEDIUM',
      assigneeId: body.assigneeId ?? 3001, handlerId: 0, deadlineAt: iso(24), timeoutStatus: 'NORMAL',
      communications: [], internalRecords: [], customerFeedbacks: [],
      createdAt: iso(0), updatedAt: iso(0),
    };
    internalTickets = [newTicket, ...internalTickets];
    if (src) src.status = 'CONVERTED';
    return ok(newId);
  }
  if (method === 'get' && url === '/cs/tickets') {
    return ok(page(internalTickets));
  }
  if (method === 'post' && (m = url.match(/^\/cs\/tickets\/(\d+)\/assign$/))) {
    updateInternal(Number(m![1]), { assigneeId: body.assigneeId ?? 3001 });
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/cs\/tickets\/(\d+)\/customer-feedback$/))) {
    // 客服确认对外说明 → 进入待客户确认
    updateInternal(Number(m![1]), { status: 'PENDING_CUSTOMER_CONFIRM' });
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/cs\/tickets\/(\d+)\/close$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (t?.status === 'CLOSED') return err(40900, '工单已关闭，请勿重复操作');
    updateInternal(id, { status: 'CLOSED' });
    return ok(null);
  }
  if (method === 'get' && (m = url.match(/^\/cs\/tickets\/(\d+)$/))) {
    const t = internalTickets.find((x) => x.id === Number(m![1]));
    return t ? ok(t) : err(40400, '工单不存在');
  }

  /* ---------------------------- 运营 ---------------------------- */
  if (method === 'get' && url === '/ops/tickets') {
    return ok(page(internalTickets));
  }
  if (method === 'post' && (m = url.match(/^\/ops\/tickets\/(\d+)\/accept$/))) {
    updateInternal(Number(m![1]), { status: 'PROCESSING', handlerId: 3001 });
    return ok(null);
  }
  if (method === 'post' && (m = url.match(/^\/ops\/tickets\/(\d+)\/internal-records$/))) {
    const id = Number(m![1]);
    const t = internalTickets.find((x) => x.id === id);
    if (t) {
      const record = comm(nextCommId++, 'OPS', 'INTERNAL_ONLY', body.content ?? '', 0);
      t.internalRecords = [...t.internalRecords, record];
      t.updatedAt = iso(0);
    }
    return ok(nextCommId - 1);
  }
  if (method === 'post' && (m = url.match(/^\/ops\/tickets\/(\d+)\/handling-result$/))) {
    updateInternal(Number(m![1]), { status: 'PENDING_CS_CONFIRM' });
    return ok(null);
  }
  if (method === 'get' && (m = url.match(/^\/ops\/tickets\/(\d+)$/))) {
    const t = internalTickets.find((x) => x.id === Number(m![1]));
    return t ? ok(t) : err(40400, '工单不存在');
  }

  /* ---------------------------- 未匹配 ---------------------------- */
  // eslint-disable-next-line no-console
  console.warn(`[mock] 未匹配的请求: ${method.toUpperCase()} ${url}`);
  return err(40400, `Mock 未覆盖该接口: ${method.toUpperCase()} ${url}`);
}

/** 同步更新客户视角工单状态 */
function updateTicket(id: number, patch: Partial<Pick<CustomerTicket, 'status'>>): void {
  customerTickets = customerTickets.map((t) =>
    t.id === id ? { ...t, ...patch, updatedAt: iso(0) } : t,
  );
}

/** 同步更新内部工单字段 */
function updateInternal(
  id: number,
  patch: Partial<Pick<InternalTicket, 'status' | 'assigneeId' | 'handlerId'>>,
): void {
  internalTickets = internalTickets.map((t) =>
    t.id === id ? { ...t, ...patch, updatedAt: iso(0) } : t,
  );
  // 同步客户视角工单状态
  if (patch.status) updateTicket(id, { status: patch.status });
}

/* ============================== 装配 ============================== */

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

    const payload = route(method, url, params, body);
    return makeResponse(config, payload);
  };

  // eslint-disable-next-line no-console
  console.info(
    '%c[mock] 已启用前端 Mock',
    'color:#00E5FF',
    '— 账号: customer01 / cs01 / ops01，密码: 123456',
  );
}
