/**
 * @file apiClient.ts
 * 文件作用：Axios 实例的统一封装（baseURL="/api/v1"），是全站唯一的 HTTP 出口。
 *
 * 职责：
 * 1. 请求拦截器：自动注入 JWT（Authorization: Bearer <token>）
 * 2. 响应拦截器：解析 ApiResponse<T>，业务码非成功抛 BusinessError；
 *    HTTP 层按 401/403/404/409/400/5xx/网络异常统一全局提示
 * 3. 401 时清除 token 并跳转 /login（全量刷新保证状态干净）
 *
 * 设计约束：
 * - token 直接读写 localStorage（key 与 stores/auth.ts 共享），不反向依赖 Pinia，
 *   避免 apiClient → router → store → api → apiClient 的循环依赖。
 * - 全局提示使用零依赖的 utils/notify（Tailwind 玻璃拟态），不引入重型 UI 库。
 */
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ApiResponse, BizCode, BusinessError } from './api-contracts';
import { notify } from '@/utils/notify';

/** localStorage 中 JWT 的 key（与 stores/auth.ts 保持一致） */
export const TOKEN_KEY = 'access_token';

/** 创建 axios 实例 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ------------------------------ 请求拦截器 ------------------------------ */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/* ------------------------------ 响应拦截器 ------------------------------ */
apiClient.interceptors.response.use(
  // HTTP 2xx：进一步解析后端业务码
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data;
    // 20000 成功；兼容部分网关直接下发 200
    if (res.code !== BizCode.SUCCESS && res.code !== 200) {
      const message = res.message || '业务处理失败，请稍后重试';
      notify.error(message);
      return Promise.reject(new BusinessError(res.code, message));
    }
    return response;
  },
  // HTTP 非 2xx：按状态码统一处理
  (error) => {
    const status: number | undefined = error?.response?.status;
    const body = error?.response?.data as ApiResponse | undefined;
    const message: string | undefined = body?.message;

    if (status === 401) {
      // JWT 缺失/失效：清理登录态并跳登录页（避免在登录页重复跳转）
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('user_info');
      notify.error('登录已失效，请重新登录');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(
          window.location.pathname + window.location.search,
        )}`;
      }
    } else if (status === 403) {
      notify.error(message || '没有权限执行该操作');
    } else if (status === 404) {
      notify.error(message || '资源不存在或无权查看');
    } else if (status === 409) {
      notify.error(message || '操作状态冲突，请刷新后重试');
    } else if (status === 400) {
      notify.error(message || '请求参数有误');
    } else if (status !== undefined && status >= 500) {
      notify.error(message || '服务器异常，请稍后重试');
    } else {
      // 无 response：网络断开 / 超时 / CORS
      const timeoutOrNetwork =
        error?.code === 'ECONNABORTED' ? '请求超时，请稍后重试' : '网络异常，请检查网络连接';
      notify.error(message || timeoutOrNetwork);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
