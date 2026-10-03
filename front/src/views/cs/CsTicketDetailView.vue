<script setup lang="ts">
/**
 * @file CsTicketDetailView.vue
 * 文件作用：客服工单详情与对外反馈页（/cs/tickets/:id）。
 * 查看内部核实记录（INTERNAL_ONLY 强标识）与全部沟通时间线；
 * 在 PENDING_CS_CONFIRM 状态编辑对外说明并反馈客户，确认后工单转 PENDING_CUSTOMER_CONFIRM。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  CircleAlert,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
} from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TimeoutBadge from '@/components/common/TimeoutBadge.vue';
import CountdownTimer from '@/components/common/CountdownTimer.vue';
import TimelineList from '@/components/common/TimelineList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import { useTicketStore } from '@/stores/ticket';
import { notify } from '@/utils/notify';
import {
  EXCEPTION_TYPE_LABELS,
  PRIORITY_LABELS,
  formatDateTime,
  logOperatorLabel,
  statusTransitionLabel,
} from '@/utils/display';
import type { StatusLog } from '@/api/api-contracts';

const route = useRoute();
const router = useRouter();
const ticketStore = useTicketStore();

const ticketId = Number(route.params.id);
const ticket = computed(() => ticketStore.currentInternalTicket);

/** 最新变更在前 */
const statusLogsDesc = computed<StatusLog[]>(() =>
  [...(ticket.value?.statusLogs ?? [])].reverse(),
);
const loadFailed = computed(
  () => !!ticketStore.error && !ticketStore.loading.internalDetail && !ticket.value,
);

/** 是否可编辑对外说明：仅待客服确认 */
const canFeedback = computed(() => ticket.value?.status === 'PENDING_CS_CONFIRM');

/** 对外说明表单（提交失败保留内容） */
const feedbackContent = ref('');
const feedbackError = ref('');
const CONTENT_MIN = 5;
const CONTENT_MAX = 1000;

/** 提交按钮禁用条件 */
const feedbackInvalid = computed(
  () =>
    feedbackContent.value.trim().length < CONTENT_MIN ||
    feedbackContent.value.trim().length > CONTENT_MAX,
);

/** 确认对外说明并反馈客户 */
async function handleConfirmFeedback(): Promise<void> {
  feedbackError.value = '';
  const len = feedbackContent.value.trim().length;
  if (len < CONTENT_MIN || len > CONTENT_MAX) {
    feedbackError.value = `对外说明需 ${CONTENT_MIN}~${CONTENT_MAX} 字（当前 ${len} 字）`;
    return;
  }
  try {
    await ticketStore.confirmCsCustomerFeedback({
      ticketId,
      content: feedbackContent.value.trim(),
    });
    feedbackContent.value = '';
    notify.success('已反馈客户，等待客户确认');
    await ticketStore.fetchCsTicketDetail(ticketId);
  } catch {
    // 40900 等：保留已填内容，拦截器已提示
  }
}

onMounted(async () => {
  ticketStore.resetCurrent();
  try {
    await ticketStore.fetchCsTicketDetail(ticketId);
  } catch {
    /* 40400：整页失败态 */
  }
});

function goBack(): void {
  router.push('/cs/tickets');
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-4xl px-4 py-6">
      <!-- 顶部 -->
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-sm btn-text btn-icon" @click="goBack">
          <ArrowLeft :size="15" />
        </button>
        <template v-if="ticket">
          <h1 class="num text-module font-semibold text-gray-100">{{ ticket.ticketNo }}</h1>
          <StatusBadge :status="ticket.status" />
          <TimeoutBadge :timeout-status="ticket.timeoutStatus" />
        </template>
        <h1 v-else class="text-module font-semibold text-gray-100">工单详情（客服）</h1>
      </div>

      <LoadingSkeleton v-if="ticketStore.loading.internalDetail" type="card" :rows="3" />

      <GlassCard v-else-if="loadFailed" padding="p-8">
        <EmptyState
          danger
          title="工单不存在或无权查看"
          :description="ticketStore.error || '请从工单工作台进入'"
          action-text="返回工作台"
          @action="goBack"
        />
      </GlassCard>

      <template v-else-if="ticket">
        <!-- 工单信息卡 -->
        <GlassCard padding="p-5" class="mb-4">
          <template #header>
            <span class="card-title">工单信息</span>
          </template>
          <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs text-gray-500">运单号</dt>
              <dd class="num mt-0.5 text-gray-200">{{ ticket.waybillNo }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">异常类型</dt>
              <dd class="mt-0.5 text-brand">{{ EXCEPTION_TYPE_LABELS[ticket.type] }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">优先级</dt>
              <dd class="mt-0.5 text-gray-200">{{ PRIORITY_LABELS[ticket.priority] }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">被分派运营</dt>
              <dd class="num mt-0.5 text-gray-200">#{{ ticket.assigneeId }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">负责客服</dt>
              <dd class="num mt-0.5 text-gray-200">#{{ ticket.handlerId }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">处理期限</dt>
              <dd class="mt-1 flex items-center gap-2">
                <CountdownTimer :deadline-at="ticket.deadlineAt" />
              </dd>
            </div>
          </dl>
          <p class="num mt-3 border-t border-edge-faint pt-3 text-micro text-gray-500">
            预警时间：{{ formatDateTime(ticket.warningAt) }} · 截止时间：{{ formatDateTime(ticket.deadlineAt) }}
          </p>
        </GlassCard>

        <div class="grid gap-4 lg:grid-cols-2">
          <!-- 内部处理记录（INTERNAL_ONLY 强标识，防止误发客户） -->
          <GlassCard padding="p-5" class="!border-dashed !border-gray-500/40">
            <template #header>
              <span class="card-title">
                <Lock :size="14" class="text-gray-400" />
                内部核实记录
                <span
                  class="ml-1 inline-flex items-center gap-1 rounded-md border border-dashed border-gray-500/50 px-1.5 py-0.5 text-micro text-gray-400"
                >
                  INTERNAL · 仅内部可见
                </span>
              </span>
            </template>
            <TimelineList
              :records="ticket.internalRecords"
              empty-title="暂无内部核实记录"
              empty-description="运营受理并核实后，记录将出现在这里"
            />
          </GlassCard>

          <!-- 全部沟通记录：内部记录灰标，客户可见记录常规展示 -->
          <GlassCard padding="p-5">
            <template #header>
              <span class="card-title">全部沟通记录</span>
            </template>
            <TimelineList
              :records="ticket.communications"
              empty-title="暂无沟通记录"
            />
          </GlassCard>
        </div>

        <!-- 状态流转留痕（US-11：全部处理过程可追溯，按时间倒序） -->
        <GlassCard padding="p-5" class="mt-4">
          <template #header>
            <span class="card-title">状态流转留痕</span>
          </template>
          <ul v-if="statusLogsDesc.length" class="space-y-2 text-xs">
            <li
              v-for="log in statusLogsDesc"
              :key="log.id"
              class="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-edge-faint pb-2 last:border-0 last:pb-0"
            >
              <span class="text-gray-200">{{ statusTransitionLabel(log) }}</span>
              <span class="text-gray-500">· {{ logOperatorLabel(log) }}</span>
              <span v-if="log.reason" class="text-gray-400">（{{ log.reason }}）</span>
              <span class="num ml-auto text-gray-500">{{ formatDateTime(log.createdAt) }}</span>
            </li>
          </ul>
          <p v-else class="text-xs text-gray-500">暂无状态变更记录</p>
        </GlassCard>

        <!-- 对外反馈编辑卡：仅 PENDING_CS_CONFIRM 可编辑 -->
        <GlassCard
          padding="p-5"
          class="mt-4"
          :class="canFeedback ? '!border-brand/30' : 'opacity-70'"
        >
          <template #header>
            <span class="card-title">
              <ShieldCheck :size="15" :class="canFeedback ? 'text-brand' : 'text-gray-500'" />
              对外说明（反馈客户）
            </span>
          </template>

          <template v-if="canFeedback">
            <textarea
              v-model="feedbackContent"
              rows="5"
              :maxlength="CONTENT_MAX"
              :disabled="ticketStore.submitting"
              class="input-glass resize-none leading-6"
              :class="feedbackError ? '!border-danger/60' : ''"
              placeholder="请填写将展示给客户的处理说明（5~1000 字），确认后工单进入待客户确认"
            />
            <div class="mt-1.5 flex items-center justify-between">
              <p v-if="feedbackError" class="flex items-center gap-1 text-xs text-danger">
                <CircleAlert :size="13" />
                {{ feedbackError }}
              </p>
              <span v-else class="text-micro text-gray-500">该内容将对客户可见，请勿包含内部核实细节</span>
              <span class="num text-micro text-gray-500">{{ feedbackContent.trim().length }} / {{ CONTENT_MAX }}</span>
            </div>
            <div class="mt-4 flex justify-end">
              <button
                type="button"
                class="btn btn-lg btn-primary min-w-[168px]"
                :disabled="feedbackInvalid || ticketStore.submitting"
                @click="handleConfirmFeedback"
              >
                <Loader2 v-if="ticketStore.submitting" :size="15" class="animate-spin" />
                <Send v-else :size="15" />
                {{ ticketStore.submitting ? '提交中...' : '确认并反馈客户' }}
              </button>
            </div>
          </template>

          <EmptyState
            v-else
            title="当前状态不可编辑对外说明"
            :description="`工单状态为「${ticket.status}」，仅待客服确认状态可编辑对外反馈`"
          />
        </GlassCard>
      </template>
    </main>
  </div>
</template>
