<script setup lang="ts">
/**
 * @file AppHeader.vue
 * 文件作用：业务页面统一的顶部导航栏（玻璃拟态）。
 * - 左：品牌 Logo（电光蓝发光）+ 系统名，点击回到本角色首页
 * - 右：客户角色显示“我的工单”入口；所有角色显示用户芯片（头像 + 姓名 + 角色）与登出
 * 各业务页通过本组件保持一致的导航，不重复实现。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { CircleUser, LogOut, PackageCheck, Ticket } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { ROLE_LABELS } from '@/utils/display';
import type { LoginRole } from '@/api/api-contracts';

const router = useRouter();
const auth = useAuthStore();

/** 各角色首页 */
const ROLE_HOME: Record<LoginRole, string> = {
  CUSTOMER: '/customer/waybills',
  CS: '/cs/tickets',
  OPS: '/ops/tickets',
};

const homePath = computed<string>(() => (auth.role ? ROLE_HOME[auth.role] : '/login'));
const roleText = computed(() => (auth.role ? ROLE_LABELS[auth.role] : ''));

/** 品牌区回首页 */
function goHome(): void {
  router.push(homePath.value);
}

/** 登出：清空登录态并跳登录页 */
function handleLogout(): void {
  auth.logout();
  router.replace('/login');
}
</script>

<template>
  <header
    class="glass sticky top-0 z-40 flex h-16 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 sm:px-6"
  >
    <!-- 品牌区 -->
    <button
      type="button"
      class="group flex items-center gap-2.5 outline-none"
      @click="goHome"
    >
      <span
        class="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 text-brand transition-all duration-200 group-hover:border-edge-strong"
      >
        <PackageCheck :size="20" :stroke-width="2" />
      </span>
      <span class="hidden flex-col items-start leading-tight sm:flex">
        <span class="text-sm font-semibold tracking-wide text-gray-100">快递异常处理系统</span>
        <span class="num text-micro uppercase tracking-[0.2em] text-brand/70">
          Express Exception
        </span>
      </span>
    </button>

    <!-- 右侧操作区 -->
    <div class="ml-auto flex items-center gap-2 sm:gap-3">
      <!-- 客户：我的工单入口 -->
      <RouterLink
        v-if="auth.isCustomer"
        to="/customer/tickets"
        class="btn btn-sm btn-text"
      >
        <Ticket :size="14" />
        <span class="hidden sm:inline">我的工单</span>
      </RouterLink>

      <!-- 用户芯片 -->
      <div
        class="flex items-center gap-2 rounded-xl border border-edge-faint bg-fill-1 py-1 pl-2 pr-3"
      >
        <CircleUser :size="20" class="text-brand" />
        <span class="hidden text-xs text-gray-400 sm:inline">
          <span class="mr-1.5 text-gray-200">{{ auth.displayName || '未登录' }}</span>
          <span class="rounded-md border border-brand/30 bg-brand/10 px-1.5 py-0.5 text-micro text-brand">
            {{ roleText }}
          </span>
        </span>
      </div>

      <!-- 登出 -->
      <button type="button" class="btn btn-sm btn-text btn-icon" title="退出登录" @click="handleLogout">
        <LogOut :size="15" />
      </button>
    </div>
  </header>
</template>
