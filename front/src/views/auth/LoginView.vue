<script setup lang="ts">
/**
 * @file LoginView.vue
 * 文件作用：统一登录页（客户 / 客服 / 运营三角色共用入口）。
 * 流程：表单校验 → 调用登录接口 → 成功后经 Pinia(auth store) 持久化 token 与
 * 用户信息 → 按 redirect 查询参数回跳，缺省回当前角色首页。
 * 失败由 apiClient 响应拦截器统一 toast，此处只兜底禁用按钮与提示。
 *
 * 说明：登录接口为 provisional（API.md 冻结版未含），无后端时提交会触发
 * 代理请求 /api/v1/auth/login 并由拦截器提示网络异常，可验证整条调用链路。
 */
import { ref, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Loader2, Lock, PackageCheck, User } from 'lucide-vue-next';
import GlassCard from '@/components/common/GlassCard.vue';
import { login as loginApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { notify } from '@/utils/notify';
import type { LoginRole } from '@/api/api-contracts';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

/** 各角色登录后的默认首页（与 router ROLE_HOME 保持一致） */
const ROLE_HOME: Record<LoginRole, string> = {
  CUSTOMER: '/customer/waybills',
  CS: '/cs/tickets',
  OPS: '/ops/tickets',
};

/** 表单状态 */
const form = reactive({
  username: '',
  password: '',
});
/** 提交中（禁用按钮 + 显示 loading） */
const submitting = ref(false);

/** 基础非空校验，返回首个错误文案，无错返回空串 */
function validate(): string {
  if (!form.username.trim()) return '请输入用户名';
  if (!form.password) return '请输入密码';
  return '';
}

/** 提交登录 */
async function handleLogin(): Promise<void> {
  const err = validate();
  if (err) {
    notify.warn(err);
    return;
  }
  submitting.value = true;
  try {
    // 调用登录接口，成功返回 { token, user }
    const result = await loginApi({
      username: form.username.trim(),
      password: form.password,
    });
    // 经 Pinia 持久化 token 与用户信息（同时写入 localStorage）
    auth.login(result);
    notify.success(`欢迎回来，${auth.displayName || result.user.username}`);

    // 优先回跳 redirect 查询参数，否则按角色首页
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
    const target = redirect || (result.user.role ? ROLE_HOME[result.user.role] : '/');
    await router.replace(target);
  } catch {
    // 业务/网络错误已由 apiClient 响应拦截器统一 toast，此处无需重复提示
  } finally {
    submitting.value = false;
  }
}

/** 回车提交 */
function onEnter(): void {
  if (!submitting.value) void handleLogin();
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center px-4 py-10">
    <!-- 背景光斑 -->
    <div
      class="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/10 blur-3xl"
    />

    <div class="relative w-full max-w-md">
      <!-- 品牌区 -->
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <span
          class="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 text-brand shadow-neon"
        >
          <PackageCheck :size="26" :stroke-width="2" />
        </span>
        <h1 class="text-xl font-semibold tracking-wide text-gray-100">快递异常处理系统</h1>
        <p class="num text-[11px] uppercase tracking-[0.25em] text-brand/70">Express Exception</p>
      </div>

      <!-- 登录卡片 -->
      <GlassCard glow padding="p-7">
        <template #header>
          <span class="text-sm font-medium text-gray-300">账号登录</span>
          <span
            class="num rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
          >
            三角色统一入口
          </span>
        </template>

        <form class="flex flex-col gap-4" @submit.prevent="handleLogin">
          <!-- 用户名 -->
          <label class="flex flex-col gap-1.5">
            <span class="text-xs text-gray-400">用户名</span>
            <div class="relative">
              <User
                :size="16"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                v-model="form.username"
                type="text"
                autocomplete="username"
                placeholder="请输入用户名"
                class="input-glass pl-9"
                :disabled="submitting"
                @keyup.enter="onEnter"
              />
            </div>
          </label>

          <!-- 密码 -->
          <label class="flex flex-col gap-1.5">
            <span class="text-xs text-gray-400">密码</span>
            <div class="relative">
              <Lock
                :size="16"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                v-model="form.password"
                type="password"
                autocomplete="current-password"
                placeholder="请输入密码"
                class="input-glass pl-9"
                :disabled="submitting"
                @keyup.enter="onEnter"
              />
            </div>
          </label>

          <!-- 登录按钮 -->
          <button
            type="submit"
            class="btn-neon mt-2 w-full !py-2.5"
            :disabled="submitting"
          >
            <Loader2 v-if="submitting" :size="16" class="animate-spin" />
            <span>{{ submitting ? '登录中…' : '登录' }}</span>
          </button>
        </form>

        <!-- 提示 -->
        <div class="mt-5 border-t border-white/[0.06] pt-4 text-center text-[11px] leading-relaxed text-gray-500">
          <p>
            登录接口 <code class="num text-brand/80">POST /api/v1/auth/login</code>
            为预留契约，角色由后端下发。
          </p>
          <p class="mt-2">
            开发联调账号：
            <code class="num text-gray-300">customer01</code> /
            <code class="num text-gray-300">cs01</code> /
            <code class="num text-gray-300">ops01</code>
            ，密码均为 <code class="num text-gray-300">123456</code>
          </p>
        </div>
      </GlassCard>
    </div>
  </div>
</template>
