/**
 * @file exception.ts
 * 文件作用：异常反馈模块请求函数。
 * - 客户视角（API.md §4 冻结）：提交反馈 / 查询反馈详情
 * - 客服视角（阶段 3 页面规格扩展，provisional）：异常反馈池列表
 *   注意：GET /cs/feedbacks 尚未包含在已冻结 API.md 中，待后端补齐；
 *   后端契约确认后如路径/参数调整，仅需修改本函数。
 */
import { apiClient } from './apiClient';
import type {
  ApiResponse,
  CreateFeedbackRequest,
  CursorPageRequest,
  CursorPageResponse,
  ExceptionFeedback,
  FeedbackStatus,
} from './api-contracts';

/**
 * 提交异常反馈
 * POST /api/v1/customer/exception-feedbacks
 * 运单不存在或不属于当前客户时，后端返回 40400
 * @returns 新建的异常反馈 id
 */
export async function createFeedback(data: CreateFeedbackRequest): Promise<number> {
  const resp = await apiClient.post<ApiResponse<number>>(
    '/customer/exception-feedbacks',
    data,
  );
  return resp.data.data;
}

/**
 * 查询异常反馈详情
 * GET /api/v1/customer/exception-feedbacks/{id}
 */
export async function getFeedbackDetail(id: number): Promise<ExceptionFeedback> {
  const resp = await apiClient.get<ApiResponse<ExceptionFeedback>>(
    `/customer/exception-feedbacks/${id}`,
  );
  return resp.data.data;
}

/** 客服反馈池查询参数（provisional，随 /cs/feedbacks 一并待后端确认） */
export interface CsFeedbackPoolQuery extends CursorPageRequest {
  /** 按反馈状态过滤：PENDING_ACCEPT / CONVERTED / CLOSED */
  status?: FeedbackStatus;
}

/**
 * 查询客服异常反馈池
 * GET /api/v1/cs/feedbacks?status=&cursor=&size=
 * 【provisional】该接口在冻结版 API.md 中缺失，按阶段 3 页面规格预留。
 */
export async function getCsFeedbackPool(
  params?: CsFeedbackPoolQuery,
): Promise<CursorPageResponse<ExceptionFeedback>> {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<ExceptionFeedback>>>(
    '/cs/feedbacks',
    { params },
  );
  return resp.data.data;
}
