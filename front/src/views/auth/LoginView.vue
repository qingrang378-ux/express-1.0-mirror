<script setup lang="ts">
/**
 * @file LoginView.vue
 * 文件作用：统一登录页（客户 / 客服 / 运营三角色共用入口）。
 * 布局：左侧为透明底线稿插图（快递员 + 包裹 + 沿配送链路流转的异常节点），
 * 右侧登录卡片向左压住插图右缘、插图右端渐隐，两者构成同一画面而非并排两个盒子；
 * 窄屏隐藏插图与能力胶囊，只留品牌、一句话说明和登录卡片，保证表单落在首屏内。
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
import heroIllustration from '@/assets/images/login-hero-lineart.png';
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

/** 左栏能力说明胶囊：让首次到访者一眼看懂系统用途 */
const STEP_CHIPS: readonly string[] = [
  '异常反馈一键上报',
  '自动转工单并分派',
  'SLA 时限与超时提醒',
  '处理进度实时可查',
];

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
  <div class="relative flex min-h-screen items-center justify-center px-4 py-6 lg:py-10">
    <div class="relative grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1.05fr_minmax(0,400px)] lg:gap-0">
      <!-- 左栏：品牌 + 线稿插图（透明底图，直接铺在页面底色上）；窄屏隐藏插图与能力胶囊，
           并把品牌区随卡片一起居中，避免单栏时文案贴左、卡片居右的错位感 -->
      <div class="flex flex-col">
        <div class="flex items-center justify-center gap-3 lg:justify-start">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 text-brand shadow-neon"
          >
            <PackageCheck :size="26" :stroke-width="2" />
          </span>
          <div>
            <h1 class="text-page font-semibold tracking-wide text-gray-100">快递异常处理系统</h1>
            <p class="num text-micro uppercase tracking-[0.25em] text-brand/70">Express Exception</p>
          </div>
        </div>

        <p class="mx-auto mt-4 max-w-md text-center text-sm leading-6 text-gray-400 lg:mx-0 lg:text-left">
          遇到丢件、破损、延误、错发？提交异常反馈即自动生成工单，客服与运营协同处理直到办结。
        </p>

        <img
          :src="heroIllustration"
          width="1024"
          height="730"
          alt="线稿示意：快递员扫描包裹，异常节点沿配送链路流转并被逐一确认解决"
          class="hero-art mt-1.5 hidden w-full max-w-[560px] self-center lg:block"
        />

        <ul class="mt-4 hidden flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400 lg:flex">
          <li v-for="chip in STEP_CHIPS" :key="chip" class="flex items-center gap-1.5">
            <span class="h-1 w-1 shrink-0 rounded-full bg-brand" />
            {{ chip }}
          </li>
        </ul>
      </div>

      <!-- 右栏：登录卡片，向左压住插图右缘，与插图同处一个构图 -->
      <GlassCard
        padding="p-6 lg:p-7"
        class="relative z-10 mx-auto w-full max-w-[400px] lg:-ml-24"
      >
        <template #header>
          <span class="card-title">账号登录</span>
          <span
            class="num rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-micro text-brand"
          >
            三角色统一入口
          </span>
        </template>

        <form class="flex flex-col gap-5" @submit.prevent="handleLogin">
          <!-- 用户名 -->
          <label class="flex flex-col gap-1.5">
            <span class="input-label">用户名</span>
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
            <span class="input-label">密码</span>
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
            class="btn btn-lg btn-primary w-full"
            :disabled="submitting"
          >
            <Loader2 v-if="submitting" :size="16" class="animate-spin" />
            <span>{{ submitting ? '登录中…' : '登录' }}</span>
          </button>
        </form>
      </GlassCard>
    </div>
  </div>
</template>

<style scoped>
/**
 * 插图右缘渐隐：虚线配送链路淡出到页面底色，视觉上「走进」右侧登录卡片，
 * 避免图片与卡片之间出现硬边界
 */
.hero-art {
  -webkit-mask-image: linear-gradient(
    90deg,
    #000 0 68%,
    rgba(0, 0, 0, 0.35) 90%,
    transparent 100%
  );
  mask-image: linear-gradient(90deg, #000 0 68%, rgba(0, 0, 0, 0.35) 90%, transparent 100%);
}
</style>
