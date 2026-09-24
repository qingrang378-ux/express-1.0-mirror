/**
 * @file waybill.ts
 * 文件作用：运单与轨迹模块请求函数（API.md §3，客户视角，共 3 个接口）。
 * 基础路径 /api/v1 由 apiClient 统一注入，此处只写相对路径。
 */
import { apiClient } from './apiClient';
import type {
  ApiResponse,
  CursorPageRequest,
  CursorPageResponse,
  TrackRecord,
  WaybillBrief,
  WaybillDetail,
} from './api-contracts';

/**
 * 运单与轨迹模块
 * 对应 API.md §3：客户视角的运单列表 / 详情 / 轨迹
 * 基础路径前缀（axios baseURL = /api/v1）已统一处理，函数内仅写相对路径。
 */

/**
 * 查询本人运单列表
 * GET /api/v1/customer/waybills
 */
export async function getMyWaybills(
  params?: CursorPageRequest,
): Promise<CursorPageResponse<WaybillBrief>> {
  const resp = await apiClient.get<ApiResponse<CursorPageResponse<WaybillBrief>>>(
    '/customer/waybills',
    { params },
  );
  return resp.data.data;
}

/**
 * 查询本人运单详情与轨迹
 * GET /api/v1/customer/waybills/{waybillNo}
 * 运单不存在或不属于当前客户时，后端返回 40400
 */
export async function getWaybillDetail(waybillNo: string): Promise<WaybillDetail> {
  const resp = await apiClient.get<ApiResponse<WaybillDetail>>(
    `/customer/waybills/${waybillNo}`,
  );
  return resp.data.data;
}

/**
 * 查询运单轨迹列表
 * GET /api/v1/customer/waybills/{waybillNo}/tracks
 */
export async function getWaybillTracks(waybillNo: string): Promise<TrackRecord[]> {
  const resp = await apiClient.get<ApiResponse<TrackRecord[]>>(
    `/customer/waybills/${waybillNo}/tracks`,
  );
  return resp.data.data;
}
