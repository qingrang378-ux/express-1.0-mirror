<script setup lang="ts">
/**
 * @file WaybillQueryView.vue
 * 文件作用：客户运单查询页（/customer/waybills）。
 * 客户输入运单号查询本人运单；展示最近运单列表与右侧快捷入口（待确认/超时数量）。
 * 查询失败统一提示“运单不存在或无权查看”（由响应拦截器按 40400 模糊提示，不泄露归属）。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AlarmClock, ArrowRight, Loader2, Search, Ticket } from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import { useWaybillStore } from '@/stores/waybill';
import { useTicketStore } from '@/stores/ticket';
import { WAYBILL_STATUS_LABELS, WAYBILL_STATUS_TONES, formatDateTime } from '@/utils/display';

const router = useRouter();
const waybillStore = useWaybillStore();
const ticketStore = useTicketStore();

/** 查询关键字（运单号） */
const keyword = ref('');
/** 查询提交中（防重复点击） */
const searching = ref(false);

/** 运单号为空时查询按钮禁用 */
const canSearch = computed(() => keyword.value.trim().length > 0 && !searching.value);

/** 待客户确认工单数（右侧入口角标） */
const pendingConfirmCount = computed(
  () => ticketStore.customerTickets.filter((t) => t.status === 'PENDING_CUSTOMER_CONFIRM').length,
);
/** 已超时工单数 */
const overdueCount = computed(
  () => ticketStore.customerTickets.filter((t) => t.timeoutStatus === 'OVERDUE').length,
);

/** 提交查询：成功跳详情页；失败提示由拦截器统一弹出（模糊措辞） */
async function handleSearch(): Promise<void> {
  const waybillNo = keyword.value.trim();
  if (!waybillNo || searching.value) return;
  searching.value = true;
  try {
    await waybillStore.fetchWaybillDetail(waybillNo);
    router.push(`/customer/waybills/${encodeURIComponent(waybillNo)}`);
  } catch {
    // 失败保留输入内容，错误提示由拦截器统一处理（“资源不存在或无权查看”）
  } finally {
    searching.value = false;
  }
}

/** 进入运单详情 */
function goDetail(waybillNo: string): void {
  router.push(`/customer/waybills/${encodeURIComponent(waybillNo)}`);
}

/** 初始加载：最近运单 + 我的工单（用于右侧统计） */
onMounted(() => {
  waybillStore.fetchWaybills({ size: 20 }).catch(() => {
    /* 失败态由列表区渲染，拦截器已弹提示 */
  });
  ticketStore.fetchCustomerTickets({ size: 20 }).catch(() => {
    /* 统计数字失败不阻塞主流程 */
  });
});
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-6xl px-4 py-8">
      <!-- 标题区 -->
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-gray-100">运单查询</h1>
        <p class="mt-1 text-sm text-gray-400">输入运单号，查看轨迹与异常反馈入口</p>
      </div>

      <div class="grid gap-5 lg:grid-cols-[1fr_300px]">
        <!-- 左侧：搜索 + 最近运单 -->
        <div class="space-y-5">
          <!-- 搜索卡 -->
          <GlassCard padding="p-5">
            <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="handleSearch">
              <div class="relative flex-1">
                <Search
                  :size="17"
                  class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  v-model="keyword"
                  type="text"
                  class="input-glass !py-2.5 pl-10"
                  placeholder="请输入运单号，支持回车查询"
                  aria-label="运单号"
                  @keyup.enter="handleSearch"
                />
              </div>
              <button type="submit" class="btn btn-md btn-primary sm:min-w-[112px]" :disabled="!canSearch">
                <Loader2 v-if="searching" :size="15" class="animate-spin" />
                <Search v-else :size="15" />
                {{ searching ? '查询中...' : '查询' }}
              </button>
            </form>
          </GlassCard>

          <!-- 最近运单列表 -->
          <GlassCard padding="p-5">
            <template #header>
              <span class="card-title">最近运单</span>
            </template>

            <!-- 加载态 -->
            <LoadingSkeleton v-if="waybillStore.loading.list" type="table" :rows="5" />

            <!-- 失败态 -->
            <EmptyState
              v-else-if="waybillStore.error && waybillStore.waybillList.length === 0"
              danger
              title="运单加载失败"
              :description="waybillStore.error"
              action-text="重新加载"
              @action="waybillStore.fetchWaybills({ size: 20 })"
            />

            <!-- 空数据态 -->
            <EmptyState
              v-else-if="waybillStore.isListEmpty"
              title="暂无运单记录"
              description="请确认运单号，或在上方输入框中查询"
            />

            <!-- 成功态：列表 -->
            <ul v-else class="space-y-2">
              <li v-for="item in waybillStore.waybillList" :key="item.id">
                <button
                  type="button"
                  class="glass-inner glass-hover group flex w-full items-center gap-3 px-4 py-3 text-left"
                  @click="goDetail(item.waybillNo)"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="num truncate text-sm font-semibold text-gray-100">
                        {{ item.waybillNo }}
                      </span>
                      <span
                        class="shrink-0 rounded-full border px-2 py-0.5 text-micro"
                        :class="WAYBILL_STATUS_TONES[item.status]"
                      >
                        {{ WAYBILL_STATUS_LABELS[item.status] }}
                      </span>
                    </div>
                    <p class="mt-1 truncate text-xs text-gray-400">
                      {{ item.senderCity }}
                      <ArrowRight :size="11" class="mx-1 inline text-gray-500" />
                      {{ item.receiverCity }}
                    </p>
                  </div>
                  <span class="num shrink-0 text-micro text-gray-500">
                    {{ formatDateTime(item.updatedAt) }}
                  </span>
                </button>
              </li>
            </ul>
          </GlassCard>
        </div>

        <!-- 右侧：快捷入口（PC） -->
        <aside class="space-y-4">
          <!-- 我的工单 -->
          <RouterLink to="/customer/tickets" class="block">
            <GlassCard padding="p-4" class="glass-hover h-full">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 text-brand">
                  <Ticket :size="18" />
                </span>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-200">我的工单</p>
                  <p class="text-xs text-gray-500">
                    待确认
                    <span
                      class="num rounded px-1"
                      :class="pendingConfirmCount > 0 ? 'text-warn animate-breathe-warn' : 'text-brand'"
                    >{{ pendingConfirmCount }}</span>
                    单
                  </p>
                </div>
                <ArrowRight :size="16" class="text-gray-500" />
              </div>
            </GlassCard>
          </RouterLink>

          <!-- 异常反馈（按页面规格跳转我的工单） -->
          <RouterLink to="/customer/tickets" class="block">
            <GlassCard padding="p-4" class="glass-hover h-full">
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 text-brand">
                  <Search :size="18" />
                </span>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-200">异常反馈</p>
                  <p class="text-xs text-gray-500">查看反馈处理进度</p>
                </div>
                <ArrowRight :size="16" class="text-gray-500" />
              </div>
            </GlassCard>
          </RouterLink>

          <!-- 超时提醒 -->
          <GlassCard
            padding="p-4"
            :class="overdueCount > 0 ? 'border-danger/40 shadow-neon-danger' : ''"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-10 w-10 items-center justify-center rounded-xl border"
                :class="
                  overdueCount > 0
                    ? 'border-danger/40 bg-danger/10 text-danger'
                    : 'border-edge-faint bg-fill-2 text-gray-500'
                "
              >
                <AlarmClock :size="18" />
              </span>
              <div class="flex-1">
                <p class="text-sm font-semibold text-gray-200">超时提醒</p>
                <p class="text-xs text-gray-500">
                  已超时
                  <span class="num" :class="overdueCount > 0 ? 'text-danger' : 'text-gray-400'">
                    {{ overdueCount }}
                  </span>
                  单
                </p>
              </div>
            </div>
          </GlassCard>
        </aside>
      </div>
    </main>
  </div>
</template>
