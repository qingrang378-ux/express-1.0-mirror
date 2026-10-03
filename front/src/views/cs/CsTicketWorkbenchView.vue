<script setup lang="ts">
/**
 * @file CsTicketWorkbenchView.vue
 * 文件作用：客服工单工作台（/cs/tickets）。
 * 高信息密度表格：工单号 / 运单号 / 异常类型 / 状态 / 被分派运营 / 处理期限 / 超时状态 / 操作。
 * 支持状态筛选（游标查询第一页）+ 超时筛选与单号搜索（已加载数据前端过滤）。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2, Search } from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import HudTabs from '@/components/common/HudTabs.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TimeoutBadge from '@/components/common/TimeoutBadge.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import { useTicketStore, type TicketStatusFilter } from '@/stores/ticket';
import {
  EXCEPTION_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  formatDateTime,
} from '@/utils/display';
import type { TicketStatus, TimeoutStatus } from '@/api/api-contracts';

const router = useRouter();
const ticketStore = useTicketStore();

/** 状态筛选胶囊 */
const STATUS_FILTERS: ReadonlyArray<{ value: TicketStatusFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: TICKET_STATUS_LABELS.PENDING },
  { value: 'PROCESSING', label: TICKET_STATUS_LABELS.PROCESSING },
  { value: 'PENDING_CS_CONFIRM', label: TICKET_STATUS_LABELS.PENDING_CS_CONFIRM },
  { value: 'PENDING_CUSTOMER_CONFIRM', label: TICKET_STATUS_LABELS.PENDING_CUSTOMER_CONFIRM },
  { value: 'CLOSED', label: TICKET_STATUS_LABELS.CLOSED },
];

/** 超时筛选 */
const timeoutFilter = ref<TimeoutStatus | 'ALL'>('ALL');
const TIMEOUT_FILTERS: ReadonlyArray<{ value: TimeoutStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部时限' },
  { value: 'NORMAL', label: '正常' },
  { value: 'WARNING', label: '即将超时' },
  { value: 'OVERDUE', label: '已超时' },
];

/** 关键字（工单号 / 运单号，模糊匹配） */
const keyword = ref('');
const loadingMore = ref(false);

/** 在 store 状态过滤基础上，再叠加超时 + 关键字过滤 */
const filteredTickets = computed(() =>
  ticketStore.csTickets.filter((t) => {
    if (timeoutFilter.value !== 'ALL' && t.timeoutStatus !== timeoutFilter.value) return false;
    const kw = keyword.value.trim().toLowerCase();
    if (
      kw &&
      !t.ticketNo.toLowerCase().includes(kw) &&
      !t.waybillNo.toLowerCase().includes(kw)
    ) {
      return false;
    }
    return true;
  }),
);

/** 切换状态筛选（store 层过滤） */
function changeStatus(status: TicketStatusFilter): void {
  ticketStore.setStatusFilter(status);
}

async function loadList(): Promise<void> {
  try {
    await ticketStore.fetchCsTickets({ size: 20 });
  } catch {
    /* 失败态由表格区渲染 */
  }
}

async function loadMore(): Promise<void> {
  const cursor = ticketStore.csPage?.nextCursor;
  if (!cursor || loadingMore.value) return;
  loadingMore.value = true;
  try {
    await ticketStore.fetchCsTickets({ cursor, size: 20 }, true);
  } catch {
    /* 拦截器已提示 */
  } finally {
    loadingMore.value = false;
  }
}

function goDetail(id: number): void {
  router.push(`/cs/tickets/${id}`);
}

onMounted(async () => {
  ticketStore.setStatusFilter('ALL');
  await loadList();
});
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 class="mb-4 text-2xl font-semibold text-gray-100">工单工作台</h1>

      <!-- 状态筛选 Tabs（规范 §2.6 / §3.2：顶部筛选 Tabs + 中部数据表格） -->
      <HudTabs
        :items="STATUS_FILTERS"
        :model-value="ticketStore.statusFilter"
        class="mb-4"
        @update:model-value="changeStatus($event as TicketStatus | 'ALL')"
      />

      <!-- 次级筛选：时限 + 单号搜索 -->
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <select
          v-model="timeoutFilter"
          class="input-glass !w-auto text-xs"
          aria-label="超时筛选"
        >
          <option v-for="option in TIMEOUT_FILTERS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <!-- 单号搜索 -->
        <div class="relative ml-auto w-full sm:w-64">
          <Search :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            v-model="keyword"
            type="text"
            class="input-glass pl-8 text-xs"
            placeholder="搜索工单号 / 运单号"
            aria-label="搜索工单号或运单号"
          />
        </div>
      </div>

      <!-- 加载态 -->
      <LoadingSkeleton v-if="ticketStore.loading.csList" type="table" :rows="6" />

      <!-- 失败态 -->
      <GlassCard v-else-if="ticketStore.error && ticketStore.csTickets.length === 0" padding="p-8">
        <EmptyState danger title="工单加载失败" :description="ticketStore.error" action-text="重新加载" @action="loadList" />
      </GlassCard>

      <!-- 空数据态 -->
      <GlassCard v-else-if="filteredTickets.length === 0" padding="p-8">
        <EmptyState title="暂无工单" description="调整筛选条件，或等待异常反馈转成工单" />
      </GlassCard>

      <!-- 成功态：高信息密度表格（规范 §2.4 双层：卡片外层 glass + 内层表格区无描边） -->
      <GlassCard v-else padding="p-2">
        <div class="glass-inner overflow-x-auto rounded">
          <table class="hud-table w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr>
                <th class="px-4 py-3">工单号</th>
                <th class="px-4 py-3">运单号</th>
                <th class="px-4 py-3">异常类型</th>
                <th class="px-4 py-3">状态</th>
                <th class="px-4 py-3">被分派运营</th>
                <th class="px-4 py-3">处理期限</th>
                <th class="px-4 py-3">超时状态</th>
                <th class="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ticket in filteredTickets"
                :key="ticket.id"
                :class="ticket.timeoutStatus === 'OVERDUE' ? 'bg-danger/[0.06]' : ''"
              >
                <td class="num px-4 py-3 text-gray-100">{{ ticket.ticketNo }}</td>
                <td class="num px-4 py-3 text-gray-400">{{ ticket.waybillNo }}</td>
                <td class="px-4 py-3">
                  <span class="text-brand">{{ EXCEPTION_TYPE_LABELS[ticket.type] }}</span>
                </td>
                <td class="px-4 py-3"><StatusBadge :status="ticket.status" /></td>
                <td class="num px-4 py-3 text-gray-400">#{{ ticket.assigneeId }}</td>
                <td class="num px-4 py-3 text-xs text-gray-500">{{ formatDateTime(ticket.deadlineAt) }}</td>
                <td class="px-4 py-3"><TimeoutBadge :timeout-status="ticket.timeoutStatus" /></td>
                <td class="px-4 py-3 text-right">
                  <!-- 操作列（规范 §2.5）：默认文字按钮，hover 显出边框光影 -->
                  <button
                    type="button"
                    class="btn btn-sm btn-text"
                    @click="goDetail(ticket.id)"
                  >
                    查看详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      <!-- 游标分页 -->
      <div class="mt-5 flex justify-center" v-if="!ticketStore.loading.csList && filteredTickets.length > 0">
        <button
          v-if="ticketStore.csPage?.hasMore"
          type="button"
          class="btn btn-md btn-text"
          :disabled="loadingMore"
          @click="loadMore"
        >
          <Loader2 v-if="loadingMore" :size="14" class="animate-spin" />
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
        <p v-else class="text-xs text-gray-600">已加载全部工单</p>
      </div>
    </main>
  </div>
</template>
