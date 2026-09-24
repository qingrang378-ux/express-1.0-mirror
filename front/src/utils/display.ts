/**
 * @file utils/display.ts
 * 文件作用：全站统一的枚举中文文案、格式化与脱敏工具。
 * 业务页面只从此处取展示文案，避免各页面硬编码散落、文案不一致。
 */
import type {
  CommunicationRole,
  ExceptionType,
  FeedbackStatus,
  NodeType,
  Priority,
  TicketStatus,
  TimeoutStatus,
  WaybillStatus,
} from '@/api/api-contracts';

/** 异常类型中文文案 */
export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  DELAY: '延误',
  DAMAGE: '物品破损',
  LABEL_DAMAGED: '标签破损',
  CONTACT_ABNORMAL: '联系人异常',
  SIGN_DISPUTE: '签收争议',
};

/** 工单状态中文文案（与 StatusBadge 保持一致） */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  PENDING_CS_CONFIRM: '待客服确认',
  PENDING_CUSTOMER_CONFIRM: '待客户确认',
  CLOSED: '已关闭',
};

/** 超时状态中文文案 */
export const TIMEOUT_STATUS_LABELS: Record<TimeoutStatus, string> = {
  NORMAL: '正常',
  WARNING: '即将超时',
  OVERDUE: '已超时',
};

/** 反馈状态中文文案 */
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  PENDING_ACCEPT: '待受理',
  CONVERTED: '已转工单',
  CLOSED: '已关闭',
};

/** 运单状态中文文案 */
export const WAYBILL_STATUS_LABELS: Record<WaybillStatus, string> = {
  PICKED_UP: '已揽收',
  IN_TRANSIT: '运输中',
  DELIVERING: '派送中',
  SIGNED: '已签收',
  EXCEPTION: '异常',
};

/** 运输节点类型中文文案 */
export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  PICKUP: '揽收',
  TRANSIT: '中转',
  ARRIVAL: '到达',
  DELIVERY: '派送',
  SIGNED: '签收',
};

/** 优先级中文文案 */
export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  URGENT: '紧急',
};

/** 沟通角色中文文案 */
export const ROLE_LABELS: Record<CommunicationRole, string> = {
  CUSTOMER: '客户',
  CS: '客服',
  OPS: '运营',
};

/**
 * 各异常类型的 SLA 处理时限（小时）
 * 延误 24h / 物品破损 48h / 标签破损 12h / 联系人异常 12h / 签收争议 48h
 */
export const SLA_HOURS: Record<ExceptionType, number> = {
  DELAY: 24,
  DAMAGE: 48,
  LABEL_DAMAGED: 12,
  CONTACT_ABNORMAL: 12,
  SIGN_DISPUTE: 48,
};

/** ISO 时间 → 本地化完整时间（YYYY/MM/DD HH:mm:ss） */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 手机号脱敏：保留前 3 后 4，如 138****1234
 * 非 11 位号码退化为首尾各保留 2 位
 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  if (/^1\d{10}$/.test(phone)) {
    return `${phone.slice(0, 3)}****${phone.slice(7)}`;
  }
  return phone.length > 6 ? `${phone.slice(0, 2)}****${phone.slice(-2)}` : phone;
}

/** 姓名脱敏：保留首字，其余以 * 代替（单字不脱敏） */
export function maskName(name: string): string {
  if (!name) return '';
  return name.length <= 1 ? name : name[0] + '*'.repeat(name.length - 1);
}

/** 长文本摘要：超出 maxLen 截断加省略号 */
export function truncate(text: string, maxLen = 40): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/** 依据异常类型 SLA 计算预计处理期限（ISO 字符串），默认从当前时间起算 */
export function computeDeadline(type: ExceptionType, from: number = Date.now()): string {
  return new Date(from + SLA_HOURS[type] * 60 * 60 * 1000).toISOString();
}
