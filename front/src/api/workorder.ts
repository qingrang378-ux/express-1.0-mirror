/**
 * @file workorder.ts
 * 文件作用：工单模块请求函数（API.md §5/§6/§7），覆盖三类角色共 15 个接口：
 * 客户 4 + 客服 6 + 运营 5。
 */
import { apiClient } from './apiClient';
import type {
  ApiResponse,
  AssignTicketRequest,
  ConfirmCustomerFeedbackRequest,
  CreateInternalRecordRequest,
  CreateTicketRequest,
  CursorPageRequest,
  CursorPageResponse,
  CustomerTicket,
  InternalTicket,
  RejectTicketRequest,
  SubmitHandlingResultRequest,
} from './api-contracts';

/* ----------------------------- 客户视角 ----------------------------- */

/**
 * 查询本人工单列表
 * GET /api/v1/customer/tickets
 */
export async function getMyTickets(
  params?: CursorPageRequest,
): Promise<CursorPageResponse<CustomerTicket>> {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<CustomerTicket>>>(
    '/customer/tickets',
    { params },
  );
  return resp.data.data;
}

/**
 * 查询工单公开进度
 * GET /api/v1/customer/tickets/{id}
 * 仅返回 CUSTOMER_VISIBLE 记录
 */
export async function getCustomerTicketDetail(id: number): Promise<CustomerTicket> {
  const resp = await apiClient.get<ApiResponse<CustomerTicket>>(
    `/customer/tickets/${id}`,
  );
  return resp.data.data;
}

/**
 * 客户确认处理结果
 * POST /api/v1/customer/tickets/{id}/confirm
 * 工单状态必须为 PENDING_CUSTOMER_CONFIRM
 */
export async function confirmTicket(id: number): Promise<void> {
  await apiClient.post<ApiResponse<void>>(`/customer/tickets/${id}/confirm`);
}

/**
 * 客户不认可并申请继续处理
 * POST /api/v1/customer/tickets/{ticketId}/reject
 * 工单状态必须为 PENDING_CUSTOMER_CONFIRM
 */
export async function rejectTicket(data: RejectTicketRequest): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    `/customer/tickets/${data.ticketId}/reject`,
    data,
  );
}

/* ----------------------------- 客服视角 ----------------------------- */

/**
 * 创建工单
 * POST /api/v1/cs/tickets
 * @returns 新建工单 id
 */
export async function createTicket(data: CreateTicketRequest): Promise<number> {
  const resp = await apiClient.post<ApiResponse<number>>('/cs/tickets', data);
  return resp.data.data;
}

/**
 * 分派工单给运营
 * POST /api/v1/cs/tickets/{ticketId}/assign
 */
export async function assignTicket(data: AssignTicketRequest): Promise<void> {
  await apiClient.post<ApiResponse<void>>(`/cs/tickets/${data.ticketId}/assign`, data);
}

/**
 * 查询工单列表（客服视角）
 * GET /api/v1/cs/tickets
 */
export async function getCsTickets(
  params?: CursorPageRequest,
): Promise<CursorPageResponse<InternalTicket>> {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<InternalTicket>>>(
    '/cs/tickets',
    { params },
  );
  return resp.data.data;
}

/**
 * 查询工单详情（客服视角，包含内部记录）
 * GET /api/v1/cs/tickets/{id}
 */
export async function getCsTicketDetail(id: number): Promise<InternalTicket> {
  const resp = await apiClient.get<ApiResponse<InternalTicket>>(`/cs/tickets/${id}`);
  return resp.data.data;
}

/**
 * 客服确认对外说明
 * POST /api/v1/cs/tickets/{ticketId}/customer-feedback
 * 工单状态必须为 PENDING_CS_CONFIRM
 */
export async function confirmCustomerFeedback(
  data: ConfirmCustomerFeedbackRequest,
): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    `/cs/tickets/${data.ticketId}/customer-feedback`,
    data,
  );
}

/**
 * 关闭工单
 * POST /api/v1/cs/tickets/{id}/close
 * 幂等约束：已关闭工单重复关闭返回 40900
 */
export async function closeTicket(id: number): Promise<void> {
  await apiClient.post<ApiResponse<void>>(`/cs/tickets/${id}/close`);
}

/* ----------------------------- 运营视角 ----------------------------- */

/**
 * 查询本人待办工单
 * GET /api/v1/ops/tickets
 * 仅返回 assigneeId 等于当前运营的工单
 */
export async function getOpsTickets(
  params?: CursorPageRequest,
): Promise<CursorPageResponse<InternalTicket>> {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<InternalTicket>>>(
    '/ops/tickets',
    { params },
  );
  return resp.data.data;
}

/**
 * 查询工单详情（运营视角，包含内部记录）
 * GET /api/v1/ops/tickets/{id}
 */
export async function getOpsTicketDetail(id: number): Promise<InternalTicket> {
  const resp = await apiClient.get<ApiResponse<InternalTicket>>(`/ops/tickets/${id}`);
  return resp.data.data;
}

/**
 * 受理工单
 * POST /api/v1/ops/tickets/{id}/accept
 * 仅 assigneeId 等于当前运营可操作；工单状态必须为 PENDING
 */
export async function acceptTicket(id: number): Promise<void> {
  await apiClient.post<ApiResponse<void>>(`/ops/tickets/${id}/accept`);
}

/**
 * 记录内部核实过程
 * POST /api/v1/ops/tickets/{ticketId}/internal-records
 * 记录标记为 INTERNAL_ONLY
 * @returns 新建内部记录 id
 */
export async function createInternalRecord(
  data: CreateInternalRecordRequest,
): Promise<number> {
  const resp = await apiClient.post<ApiResponse<number>>(
    `/ops/tickets/${data.ticketId}/internal-records`,
    data,
  );
  return resp.data.data;
}

/**
 * 提交处理结果
 * POST /api/v1/ops/tickets/{ticketId}/handling-result
 * 仅 assigneeId 等于当前运营可操作；工单状态必须为 PROCESSING
 * 提交后工单状态变为 PENDING_CS_CONFIRM
 */
export async function submitHandlingResult(
  data: SubmitHandlingResultRequest,
): Promise<void> {
  await apiClient.post<ApiResponse<void>>(
    `/ops/tickets/${data.ticketId}/handling-result`,
    data,
  );
}
