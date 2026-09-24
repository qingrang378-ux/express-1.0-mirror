/**
 * @file router/index.ts
 * 文件作用：Vue Router 4 路由【唯一入口】，包含全部业务页面路由、角色权限元信息、
 * 全局前置守卫（未登录跳 /login、越权跳回本角色首页）与页面标题同步。
 *
 * 阶段 3：11 个业务页面均已接入（按角色分块懒加载）；
 * /login 仍为脚手架占位（登录接口未在 API.md 冻结，登录页在认证契约确认后实现）。
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import type { LoginRole } from '@/api/api-contracts';
import { useAuthStore } from '@/stores/auth';
import PlaceholderView from '@/views/PlaceholderView.vue';

/* ------------- 扩展 vue-router 的 meta 类型（严格 TS） ------------- */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（中文） */
    title: string;
    /** 允许访问的角色；不填表示任意已登录角色可访问 */
    roles?: LoginRole[];
    /** 是否公开页面（无需登录，如登录页） */
    public?: boolean;
  }
}

/** 各角色登录后的默认首页 */
const ROLE_HOME: Record<LoginRole, string> = {
  CUSTOMER: '/customer/waybills',
  CS: '/cs/tickets',
  OPS: '/ops/tickets',
};

const routes: RouteRecordRaw[] = [
  /* ------------------------------- 根路径 ------------------------------ */
  {
    path: '/',
    name: 'RootRedirect',
    redirect: () => {
      const auth = useAuthStore();
      return auth.role ? ROLE_HOME[auth.role] : '/login';
    },
  },

  /* -------------------------------- 登录 ------------------------------- */
  // 登录接口尚未冻结，阶段 3 暂用占位；认证契约确认后替换为 auth/LoginView.vue
  {
    path: '/login',
    name: 'Login',
    component: PlaceholderView,
    props: { title: '登录（待接入认证接口）' },
    meta: { title: '登录', public: true },
  },

  /* ---------------------------- 客户：运单查询 ------------------------- */
  {
    path: '/customer/waybills',
    name: 'WaybillQuery',
    component: () => import('@/views/customer/WaybillQueryView.vue'),
    meta: { title: '运单查询', roles: ['CUSTOMER'] },
  },
  {
    path: '/customer/waybills/:waybillNo',
    name: 'WaybillDetail',
    component: () => import('@/views/customer/WaybillDetailView.vue'),
    meta: { title: '运单详情', roles: ['CUSTOMER'] },
  },
  {
    path: '/customer/waybills/:waybillNo/feedback',
    name: 'FeedbackCreate',
    component: () => import('@/views/customer/FeedbackCreateView.vue'),
    meta: { title: '提交异常反馈', roles: ['CUSTOMER'] },
  },

  /* ---------------------------- 客户：我的工单 ------------------------- */
  {
    path: '/customer/tickets',
    name: 'CustomerTicketList',
    component: () => import('@/views/customer/CustomerTicketListView.vue'),
    meta: { title: '我的工单', roles: ['CUSTOMER'] },
  },
  {
    path: '/customer/tickets/:id',
    name: 'CustomerTicketDetail',
    component: () => import('@/views/customer/CustomerTicketDetailView.vue'),
    meta: { title: '工单进度', roles: ['CUSTOMER'] },
  },

  /* -------------------------------- 客服 ------------------------------- */
  {
    path: '/cs/feedbacks',
    name: 'CsFeedbackPool',
    component: () => import('@/views/cs/CsFeedbackPoolView.vue'),
    meta: { title: '异常反馈池', roles: ['CS'] },
  },
  {
    path: '/cs/tickets/create',
    name: 'CsTicketCreate',
    component: () => import('@/views/cs/CsTicketCreateView.vue'),
    meta: { title: '创建工单', roles: ['CS'] },
  },
  {
    path: '/cs/tickets',
    name: 'CsTicketWorkbench',
    component: () => import('@/views/cs/CsTicketWorkbenchView.vue'),
    meta: { title: '客服工单工作台', roles: ['CS'] },
  },
  {
    path: '/cs/tickets/:id',
    name: 'CsTicketDetail',
    component: () => import('@/views/cs/CsTicketDetailView.vue'),
    meta: { title: '工单详情（客服）', roles: ['CS'] },
  },

  /* -------------------------------- 运营 ------------------------------- */
  {
    path: '/ops/tickets',
    name: 'OpsTicketWorkbench',
    component: () => import('@/views/ops/OpsTicketWorkbenchView.vue'),
    meta: { title: '运营待办工单', roles: ['OPS'] },
  },
  {
    path: '/ops/tickets/:id',
    name: 'OpsTicketDetail',
    component: () => import('@/views/ops/OpsTicketDetailView.vue'),
    meta: { title: '工单详情（运营）', roles: ['OPS'] },
  },

  /* ------------------------------- 404 兜底 ---------------------------- */
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: PlaceholderView,
    props: { title: '页面不存在（404）' },
    meta: { title: '页面不存在', public: true },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  // 切换路由回到顶部
  scrollBehavior: () => ({ top: 0 }),
});

/* ----------------------------- 全局前置守卫 ----------------------------- */
router.beforeEach((to) => {
  const auth = useAuthStore();

  // 1) 公开页面放行；已登录访问登录页则回自身角色首页
  if (to.meta.public) {
    if (to.name === 'Login' && auth.isLoggedIn && auth.role) {
      return { path: ROLE_HOME[auth.role] };
    }
    return true;
  }

  // 2) 未登录 → 登录页并携带 redirect
  if (!auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // 3) 角色不匹配 → 回自身角色首页（禁止越权）
  if (to.meta.roles && auth.role && !auth.hasRole(to.meta.roles)) {
    return { path: ROLE_HOME[auth.role] };
  }

  return true;
});

/* ----------------------------- 全局后置钩子 ----------------------------- */
router.afterEach((to) => {
  const title = to.meta.title;
  document.title = title ? `${title} - 快递异常处理系统` : '快递异常处理系统';
});

export default router;
