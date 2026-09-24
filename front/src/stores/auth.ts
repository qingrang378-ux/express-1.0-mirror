/**
 * @file stores/auth.ts
 * 文件作用：认证 Store（useAuthStore）。
 * 维护当前登录用户、角色、userId、JWT token，提供登录态持久化、登出与角色权限校验，
 * 是路由守卫进行角色判断的唯一数据源。
 *
 * 注意：API.md 当前版本尚未冻结登录接口，login 入参直接接收后端将返回的
 * { token, user } 结构（provisional）；阶段 3 登录页接入真实接口时，
 * 只需在页面中 `await authApi.login()` 后调用本 store 的 login(result) 即可。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { LoginResult, LoginRole, LoginUser } from '@/api/api-contracts';
import { TOKEN_KEY } from '@/api/apiClient';

/** localStorage 中用户信息的 key */
const USER_KEY = 'user_info';

/** 安全读取本地用户信息 */
function loadUser(): LoginUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginUser;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  /* ------------------------------- state ------------------------------- */
  /** JWT token（初始化时从 localStorage 恢复，刷新不掉登录态） */
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  /** 当前登录用户 */
  const user = ref<LoginUser | null>(loadUser());

  /* ------------------------------ getters ------------------------------ */
  /** 是否已登录 */
  const isLoggedIn = computed<boolean>(() => !!token.value);
  /** 当前角色（未登录为 null） */
  const role = computed<LoginRole | null>(() => user.value?.role ?? null);
  /** 当前用户 id（未登录为 null） */
  const userId = computed<number | null>(() => user.value?.userId ?? null);
  /** 用户名（未登录为空串） */
  const username = computed<string>(() => user.value?.username ?? '');
  /** 展示名（优先 realName） */
  const displayName = computed<string>(() => user.value?.realName || user.value?.username || '');

  const isCustomer = computed(() => role.value === 'CUSTOMER');
  const isCs = computed(() => role.value === 'CS');
  const isOps = computed(() => role.value === 'OPS');

  /* ------------------------------ actions ------------------------------ */

  /**
   * 登录成功：写入 token + 用户并持久化
   * @param result 登录接口返回的 { token, user }
   */
  function login(result: LoginResult): void {
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  }

  /** 登出：清空内存与本地登录态 */
  function logout(): void {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * 角色权限校验
   * @param roles 允许访问的角色（单个或多个）
   * @example auth.hasRole('CUSTOMER') / auth.hasRole(['CS', 'OPS'])
   */
  function hasRole(roles: LoginRole | LoginRole[]): boolean {
    if (!role.value) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(role.value);
  }

  return {
    // state
    token,
    user,
    // getters
    isLoggedIn,
    role,
    userId,
    username,
    displayName,
    isCustomer,
    isCs,
    isOps,
    // actions
    login,
    logout,
    hasRole,
  };
});
