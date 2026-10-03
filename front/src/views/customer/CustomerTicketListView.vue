<script setup lang="ts">
/**
 * @file CustomerTicketListView.vue
 * 文件作用：客户工单列表页（/customer/tickets）。
 * 按状态胶囊筛选本人工单，展示状态/处理期限/超时徽章；游标分页单页 20 条。
 * 数据来源于客户接口，后端仅返回 CUSTOMER_VISIBLE 内容。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronRight, Loader2 } from 'lucide-vue-next';
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
import type { TicketStatus } from '@/api/api-contracts';

const router = useRouter();
const ticketStore = useTicketStore();

/** 状态筛选胶囊（全部 + 工单五态） */
const FILTERS: ReadonlyArray<{ value: TicketStatusFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: TICKET_STATUS_LABELS.PENDING },
  { value: 'PROCESSING', label: TICKET_STATUS_LABELS.PROCESSING },
  { value: 'PENDING_CS_CONFIRM', label: TICKET_STATUS_LABELS.PENDING_CS_CONFIRM },
  { value: 'PENDING_CUSTOMER_CONFIRM', label: TICKET_STATUS_LABELS.PENDING_CUSTOMER_CONFIRM },
  { value: 'CLOSED', label: TICKET_STATUS_LABELS.CLOSED },
];

/** 加载更多进行中 */
const loadingMore = ref(false);

/** 切换状态筛选（前端过滤当前已加载数据） */
function changeFilter(value: TicketStatusFilter): void {
  ticketStore.setStatusFilter(value);
}

/** 加载更多（游标下一页） */
async function loadMore(): Promise<void> {
  const cursor = ticketStore.customerPage?.nextCursor;
  if (!cursor || loadingMore.value) return;
  loadingMore.value = true;
  try {
    await ticketStore.fetchCustomerTickets({ cursor, size: 20 }, true);
  } catch {
    /* 拦截器已提示 */
  } finally {
    loadingMore.value = false;
  }
}

/** 首次加载 */
onMounted(() => {
  ticketStore.setStatusFilter('ALL');
  ticketStore.fetchCustomerTickets({ size: 20 }).catch(() => {
    /* 失败态由卡片区渲染 */
  });
});

function goDetail(id: number): void {
  router.push(`/customer/tickets/${id}`);
}
function goWaybills(): void {
  router.push('/customer/waybills');
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 class="mb-4 text-2xl font-semibold text-gray-100">我的工单</h1>

      <!-- 状态筛选 Tabs（规范 §2.6） -->
      <HudTabs
        :items="FILTERS"
        :model-value="ticketStore.statusFilter"
        class="mb-5"
        @update:model-value="changeFilter($event as TicketStatusFilter)"
      />

      <!-- 加载态 -->
      <LoadingSkeleton v-if="ticketStore.loading.customerList" type="card" :rows="4" />

      <!-- 失败态 -->
      <GlassCard v-else-if="ticketStore.error && ticketStore.customerTickets.length === 0" padding="p-8">
        <EmptyState
          danger
          title="工单加载失败"
          :description="ticketStore.error"
          action-text="重新加载"
          @action="ticketStore.fetchCustomerTickets({ size: 20 })"
        />
      </GlassCard>

      <!-- 空数据态 -->
      <GlassCard v-else-if="ticketStore.isCustomerListEmpty" padding="p-8">
        <EmptyState
          title="暂无工单"
          description="提交异常反馈后，客服创建的工单将展示在这里"
          action-text="去查询运单"
          @action="goWaybills"
        />
      </GlassCard>

      <!-- 成功态：工单卡片列表 -->
      <template v-else>
        <div class="space-y-3">
          <GlassCard
            v-for="ticket in ticketStore.customerTickets"
            :key="ticket.id"
            padding="p-4"
            class="glass-hover"
          >
            <div class="flex flex-wrap items-center gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="num text-sm font-semibold text-gray-100">{{ ticket.ticketNo }}</span>
                  <StatusBadge :status="ticket.status" />
                  <TimeoutBadge :timeout-status="ticket.timeoutStatus" />
                </div>
                <p class="mt-1.5 text-xs text-gray-400">
                  异常类型：
                  <span class="text-brand">{{ EXCEPTION_TYPE_LABELS[ticket.type] }}</span>
                </p>
                <p class="num mt-1 text-micro text-gray-500">
                  处理期限：{{ formatDateTime(ticket.deadlineAt) }}
                </p>
              </div>
              <button type="button" class="btn btn-sm btn-text" @click="goDetail(ticket.id)">
                查看进度
                <ChevronRight :size="14" />
              </button>
            </div>
          </GlassCard>
        </div>

        <!-- 游标分页：加载更多 -->
        <div class="mt-5 flex justify-center">
          <button
            v-if="ticketStore.customerPage?.hasMore"
            type="button"
            class="btn btn-md btn-text"
            :disabled="loadingMore"
            @click="loadMore"
          >
            <Loader2 v-if="loadingMore" :size="14" class="animate-spin" />
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
          <p v-else class="text-xs text-gray-600">
            共 {{ ticketStore.customerTickets.length }} 单，已加载全部
          </p>
        </div>
      </template>
    </main>
  </div>
</template>
