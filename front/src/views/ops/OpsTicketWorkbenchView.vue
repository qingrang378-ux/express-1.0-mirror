<script setup lang="ts">
/**
 * @file OpsTicketWorkbenchView.vue
 * 文件作用：运营待办工单工作台（/ops/tickets）。
 * 仅展示分派给当前运营（assigneeId = 本人）的工单；PENDING 工单可直接受理。
 * 状态筛选（PENDING/PROCESSING/PENDING_CS_CONFIRM/CLOSED）+ 超时筛选。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Check, ChevronRight, Loader2 } from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TimeoutBadge from '@/components/common/TimeoutBadge.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useTicketStore, type TicketStatusFilter } from '@/stores/ticket';
import { notify } from '@/utils/notify';
import {
  EXCEPTION_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  formatDateTime,
} from '@/utils/display';
import type { InternalTicket, TicketStatus, TimeoutStatus } from '@/api/api-contracts';

const router = useRouter();
const auth = useAuthStore();
const ticketStore = useTicketStore();

/** 状态筛选胶囊（运营关注的 4 个状态） */
const STATUS_FILTERS: ReadonlyArray<{ value: TicketStatusFilter; label: string }> = [
  { value: 'PENDING', label: TICKET_STATUS_LABELS.PENDING },
  { value: 'PROCESSING', label: TICKET_STATUS_LABELS.PROCESSING },
  { value: 'PENDING_CS_CONFIRM', label: TICKET_STATUS_LABELS.PENDING_CS_CONFIRM },
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

const loadingMore = ref(false);

/** 叠加超时筛选（状态筛选由 store 完成） */
const filteredTickets = computed<InternalTicket[]>(() =>
  ticketStore.opsTickets.filter(
    (t) => timeoutFilter.value === 'ALL' || t.timeoutStatus === timeoutFilter.value,
  ),
);

/** 受理确认弹窗目标工单 */
const acceptTarget = ref<InternalTicket | null>(null);

function changeStatus(status: TicketStatusFilter): void {
  ticketStore.setStatusFilter(status);
}

async function loadList(): Promise<void> {
  try {
    await ticketStore.fetchOpsTickets({ size: 20 });
  } catch {
    /* 失败态由列表区渲染 */
  }
}

async function loadMore(): Promise<void> {
  const cursor = ticketStore.opsPage?.nextCursor;
  if (!cursor || loadingMore.value) return;
  loadingMore.value = true;
  try {
    await ticketStore.fetchOpsTickets({ cursor, size: 20 }, true);
  } catch {
    /* 拦截器已提示 */
  } finally {
    loadingMore.value = false;
  }
}

/** 确认受理：仅 PENDING 且 assigneeId 为本人 */
async function handleAccept(): Promise<void> {
  const target = acceptTarget.value;
  if (!target) return;
  try {
    await ticketStore.acceptOpsTicket(target.id);
    notify.success('已受理工单');
    acceptTarget.value = null;
    await loadList();
  } catch {
    // 40300 非被分派 / 40900 状态冲突：弹窗保留，拦截器已提示
  }
}

function goDetail(id: number): void {
  router.push(`/ops/tickets/${id}`);
}

onMounted(async () => {
  // 默认聚焦待处理
  ticketStore.setStatusFilter('PENDING');
  await loadList();
});
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-4xl px-4 py-6">
      <div class="mb-1 flex items-center gap-2">
        <h1 class="text-2xl font-semibold text-gray-100">我的待办工单</h1>
        <span v-if="auth.userId" class="num rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-gray-400">
          运营 #{{ auth.userId }}
        </span>
      </div>
      <p class="mb-4 text-xs text-gray-500">列表仅包含分派给您本人的工单</p>

      <!-- 筛选栏 -->
      <div class="mb-5 flex flex-wrap items-center gap-2">
        <button
          v-for="filter in STATUS_FILTERS"
          :key="filter.value"
          type="button"
          class="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
          :class="
            ticketStore.statusFilter === filter.value
              ? 'border-brand/60 bg-brand/10 text-brand shadow-neon'
              : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-brand/30 hover:text-gray-200'
          "
          @click="changeStatus(filter.value as TicketStatus)"
        >
          {{ filter.label }}
        </button>

        <select
          v-model="timeoutFilter"
          class="input-glass ml-auto !w-auto !py-1.5 text-xs"
          aria-label="超时筛选"
        >
          <option v-for="option in TIMEOUT_FILTERS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- 加载态 -->
      <LoadingSkeleton v-if="ticketStore.loading.opsList" type="card" :rows="4" />

      <!-- 失败态 -->
      <GlassCard
        v-else-if="ticketStore.error && ticketStore.opsTickets.length === 0"
        padding="p-8"
      >
        <EmptyState danger title="待办工单加载失败" :description="ticketStore.error" action-text="重新加载" @action="loadList" />
      </GlassCard>

      <!-- 空数据态 -->
      <GlassCard v-else-if="filteredTickets.length === 0" padding="p-8">
        <EmptyState title="暂无待办工单" description="当前筛选条件下没有分派给您的工单" action-text="查看全部待处理" @action="changeStatus('PENDING')" />
      </GlassCard>

      <!-- 成功态：卡片列表 -->
      <template v-else>
        <div class="space-y-3">
          <GlassCard
            v-for="ticket in filteredTickets"
            :key="ticket.id"
            padding="p-4"
            :glow="ticket.timeoutStatus === 'OVERDUE'"
            :class="ticket.timeoutStatus === 'OVERDUE' ? '!border-danger/40' : ''"
          >
            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="num text-sm font-medium text-gray-100">{{ ticket.ticketNo }}</span>
                  <StatusBadge :status="ticket.status" />
                  <TimeoutBadge :timeout-status="ticket.timeoutStatus" />
                </div>
                <p class="mt-1.5 text-xs text-gray-400">
                  异常类型：<span class="text-accent">{{ EXCEPTION_TYPE_LABELS[ticket.type] }}</span>
                  <span class="mx-2 text-gray-600">|</span>
                  运单号：<span class="num">{{ ticket.waybillNo }}</span>
                </p>
                <p class="num mt-1 text-[11px] text-gray-500">
                  处理期限：{{ formatDateTime(ticket.deadlineAt) }}
                </p>
              </div>

              <div class="flex shrink-0 items-center gap-2">
                <!-- 仅 PENDING 可受理 -->
                <button
                  v-if="ticket.status === 'PENDING'"
                  type="button"
                  class="btn-neon !px-3 !py-1.5 text-xs"
                  :disabled="ticketStore.submitting"
                  @click="acceptTarget = ticket"
                >
                  <Check :size="14" />
                  受理
                </button>
                <button
                  type="button"
                  class="btn-ghost !px-3 !py-1.5 text-xs"
                  @click="goDetail(ticket.id)"
                >
                  查看详情
                  <ChevronRight :size="14" />
                </button>
              </div>
            </div>
          </GlassCard>
        </div>

        <!-- 游标分页 -->
        <div class="mt-5 flex justify-center">
          <button
            v-if="ticketStore.opsPage?.hasMore"
            type="button"
            class="btn-ghost"
            :disabled="loadingMore"
            @click="loadMore"
          >
            <Loader2 v-if="loadingMore" :size="14" class="animate-spin" />
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
          <p v-else class="text-xs text-gray-600">已加载全部待办</p>
        </div>
      </template>
    </main>

    <!-- 受理确认弹窗 -->
    <ConfirmDialog
      :visible="!!acceptTarget"
      :title="acceptTarget ? `受理工单 ${acceptTarget.ticketNo}` : '受理工单'"
      :content="acceptTarget ? `确认受理该${EXCEPTION_TYPE_LABELS[acceptTarget.type]}工单？受理后工单进入处理中，您需要记录核实过程并提交处理结果。` : ''"
      confirm-text="确认受理"
      :loading="ticketStore.submitting"
      @confirm="handleAccept"
      @cancel="acceptTarget = null"
      @update:visible="(v: boolean) => { if (!v) acceptTarget = null }"
    />
  </div>
</template>
