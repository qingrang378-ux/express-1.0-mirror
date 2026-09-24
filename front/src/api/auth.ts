/**
 * @file auth.ts
 * 文件作用：认证模块请求函数。
 *
 * 说明：冻结版 API.md（§3-§7）只覆盖运单 / 异常反馈 / 工单业务接口，
 * 尚未定义登录接口。此处按项目接口前缀约定（/api/v1）预留登录端点，
 * 出入参沿用 api-contracts.ts 中的 provisional 认证类型，待后端认证
 * 接口冻结后仅需对齐路径与字段，调用方（LoginView / auth store）无需改动。
 */
import { apiClient } from './apiClient';
import type { ApiResponse, LoginRequest, LoginResult } from './api-contracts';

/**
 * 登录
 * POST /api/v1/auth/login
 * 【provisional】登录接口未在冻结版 API.md 中定义，路径与出入参以后端
 * 最终契约为准；当前实现保证前端调用链路（apiClient → 拦截器 → 代理）畅通。
 * @returns { token, user } 登录成功后的 JWT 与用户信息
 */
export async function login(data: LoginRequest): Promise<LoginResult> {
  const resp = await apiClient.post<ApiResponse<LoginResult>>('/auth/login', data);
  return resp.data.data;
}
