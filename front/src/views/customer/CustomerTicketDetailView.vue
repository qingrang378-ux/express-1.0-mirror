<script setup lang="ts">
/**
 * @file CustomerTicketDetailView.vue
 * 文件作用：客户工单详情页（/customer/tickets/:id）。
 * 顶部「处理进度」流程图实时标出当前环节，下方查看公开进度与客服对外反馈，
 * 并在 PENDING_CUSTOMER_CONFIRM 时确认结果或申请继续处理。
 *
 * 安全红线：本页只渲染 CUSTOMER_VISIBLE 记录，即使后端误返回内部记录也在前端二次过滤，
 * 绝不渲染任何 INTERNAL_ONLY 内容。
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  CircleAlert,
  Loader2,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TimeoutBadge from '@/components/common/TimeoutBadge.vue';
import CountdownTimer from '@/components/common/CountdownTimer.vue';
import TicketFlowDiagram from '@/components/common/TicketFlowDiagram.vue';
import TimelineList from '@/components/common/TimelineList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useTicketStore } from '@/stores/ticket';
import { notify } from '@/utils/notify';
import { EXCEPTION_TYPE_LABELS, formatDateTime } from '@/utils/display';
import type { Communication } from '@/api/api-contracts';

const route = useRoute();
const router = useRouter();
const ticketStore = useTicketStore();

const ticketId = Number(route.params.id);
const ticket = computed(() => ticketStore.currentCustomerTicket);
const loadFailed = computed(
  () => !!ticketStore.error && !ticketStore.loading.customerDetail && !ticket.value,
);

/**
 * 公开进度：强制只保留 CUSTOMER_VISIBLE（双重保险，后端契约已保证）
 */
const publicCommunications = computed<Communication[]>(
  () => ticket.value?.communications.filter((c) => c.visibility === 'CUSTOMER_VISIBLE') ?? [],
);
/** 客服对外反馈（CUSTOMER_VISIBLE），取最新在前 */
const publicFeedbacks = computed<Communication[]>(
  () =>
    ticket.value?.customerFeedbacks
      .filter((c) => c.visibility === 'CUSTOMER_VISIBLE')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ?? [],
);

/** 是否处于待客户确认（操作区显示条件） */
const canConfirm = computed(() => ticket.value?.status === 'PENDING_CUSTOMER_CONFIRM');

/* ------------------------------ 确认结果弹窗 ------------------------------ */
const confirmVisible = ref(false);

function openConfirm(): void {
  confirmVisible.value = true;
}

/** 确认处理结果：成功后工单关闭 */
async function handleConfirm(): Promise<void> {
  try {
    await ticketStore.confirmCustomerTicket(ticketId);
    confirmVisible.value = false;
    notify.success('工单已关闭');
    await ticketStore.fetchCustomerTicketDetail(ticketId);
  } catch {
    // 40900 等错误提示由拦截器统一处理，弹窗保持打开便于用户重试
  }
}

/* ---------------------------- 不认可继续处理弹窗 ---------------------------- */
const rejectVisible = ref(false);
const rejectForm = reactive<{ reason: string }>({ reason: '' });
const rejectError = ref('');

function openReject(): void {
  // 关闭确认弹窗，重置不认可表单后打开原因弹窗
  confirmVisible.value = false;
  rejectForm.reason = '';
  rejectError.value = '';
  rejectVisible.value = true;
}

const REASON_MIN = 5;
const REASON_MAX = 500;

/** 不认可并申请继续处理：成功后工单回到 PENDING 重新处理 */
async function handleReject(): Promise<void> {
  rejectError.value = '';
  const len = rejectForm.reason.trim().length;
  if (len < REASON_MIN || len > REASON_MAX) {
    rejectError.value = `不认可原因需 ${REASON_MIN}~${REASON_MAX} 字（当前 ${len} 字）`;
    return;
  }
  try {
    await ticketStore.rejectCustomerTicket({ ticketId, reason: rejectForm.reason.trim() });
    rejectVisible.value = false;
    notify.success('已提交，工单重新处理');
    await ticketStore.fetchCustomerTicketDetail(ticketId);
  } catch {
    // 失败保留弹窗与已填原因，拦截器已提示
  }
}

onMounted(async () => {
  ticketStore.resetCurrent();
  try {
    await ticketStore.fetchCustomerTicketDetail(ticketId);
  } catch {
    /* 40400 等：渲染整页失败态 */
  }
});

function goBack(): void {
  router.push('/customer/tickets');
}
</script>

<template>
  <div class="min-h-screen pb-28">
    <AppHeader />

    <main class="mx-auto w-full max-w-3xl px-4 py-6">
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
        <h1 v-else class="text-module font-semibold text-gray-100">工单进度</h1>
      </div>

      <!-- 加载态 -->
      <LoadingSkeleton v-if="ticketStore.loading.customerDetail" type="card" :rows="3" />

      <!-- 失败态 -->
      <GlassCard v-else-if="loadFailed" padding="p-8">
        <EmptyState
          danger
          title="工单不存在或无权查看"
          :description="ticketStore.error || '请从我的工单列表进入'"
          action-text="返回我的工单"
          @action="goBack"
        />
      </GlassCard>

      <template v-else-if="ticket">
        <!-- 处理状态流程图：当前环节实时高亮，一眼看清进度 -->
        <TicketFlowDiagram
          :status="ticket.status"
          :timeout-status="ticket.timeoutStatus"
          class="mb-4"
        />

        <!-- 处理时限卡 -->
        <GlassCard padding="p-4" class="mb-4">
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm text-gray-300">异常类型：
              <span class="text-brand">{{ EXCEPTION_TYPE_LABELS[ticket.type] }}</span>
            </span>
            <span class="num text-xs text-gray-500">截止：{{ formatDateTime(ticket.deadlineAt) }}</span>
            <span class="ml-auto">
              <CountdownTimer :deadline-at="ticket.deadlineAt" />
            </span>
          </div>
        </GlassCard>

        <!-- 对外反馈卡（客服确认的对外说明，霓虹描边突出） -->
        <GlassCard padding="p-5" class="mb-4 !border-brand/30">
          <template #header>
            <span class="card-title">
              <ShieldCheck :size="15" class="text-brand" />
              客服对外反馈
            </span>
          </template>
          <EmptyState
            v-if="publicFeedbacks.length === 0"
            title="暂无对外反馈"
            description="客服确认处理方案后将在此向您说明"
          />
          <ul v-else class="space-y-3">
            <li
              v-for="feedback in publicFeedbacks"
              :key="feedback.id"
              class="glass-inner p-3"
            >
              <p class="whitespace-pre-wrap break-words text-sm leading-6 text-gray-200">
                {{ feedback.content }}
              </p>
              <p class="num mt-2 text-micro text-gray-500">{{ formatDateTime(feedback.createdAt) }}</p>
            </li>
          </ul>
        </GlassCard>

        <!-- 公开沟通记录（只渲染 CUSTOMER_VISIBLE） -->
        <GlassCard padding="p-5">
          <template #header>
            <span class="card-title">
              <MessageSquareText :size="15" class="text-gray-400" />
              沟通记录
            </span>
          </template>
          <TimelineList
            :records="publicCommunications"
            :loading="false"
            empty-title="暂无公开进度"
          />
        </GlassCard>
      </template>
    </main>

    <!-- 底部固定操作区：仅待客户确认状态显示 -->
    <div
      v-if="canConfirm"
      class="glass fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-end gap-3 rounded-none border-b-0 border-x-0 px-4 py-3 sm:px-6"
    >
      <span class="mr-auto hidden text-xs text-gray-400 sm:inline">
        请确认客服的处理结果，如不认可可申请继续处理
      </span>
      <button type="button" class="btn btn-md btn-text" @click="openReject">
        不认可并申请继续处理
      </button>
      <button
        type="button"
        class="btn btn-md btn-success"
        :disabled="ticketStore.submitting"
        @click="openConfirm"
      >
        <Loader2 v-if="ticketStore.submitting" :size="15" class="animate-spin" />
        确认结果
      </button>
    </div>

    <!-- 已关闭等其他状态：不显示操作区（确认按钮天然禁用/隐藏） -->

    <!-- 确认结果弹窗 -->
    <ConfirmDialog
      v-model:visible="confirmVisible"
      title="确认处理结果"
      content="确认后工单将关闭。请确认客服反馈的处理结果已解决您的问题。"
      confirm-text="确认并关闭工单"
      :loading="ticketStore.submitting"
      @confirm="handleConfirm"
    />

    <!-- 不认可弹窗（含原因文本域） -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div
          v-if="rejectVisible"
          class="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div class="absolute inset-0 bg-overlay backdrop-blur-sm" @click="!ticketStore.submitting && (rejectVisible = false)" />
          <div class="modal-hud animate-dialog-in w-full max-w-lg p-6">
            <h3 class="text-base font-semibold text-gray-100">不认可并申请继续处理</h3>
            <p class="mt-1.5 text-xs text-gray-500">请说明不认可的原因（{{ REASON_MIN }}~{{ REASON_MAX }} 字），工单将退回重新处理</p>

            <textarea
              v-model="rejectForm.reason"
              rows="5"
              :maxlength="REASON_MAX"
              :disabled="ticketStore.submitting"
              class="input-glass mt-3 resize-none leading-6"
              :class="rejectError ? '!border-danger/60' : ''"
              placeholder="例如：问题仍未解决 / 处理方案与实际情况不符，请重新核实"
            />
            <div class="mt-1.5 flex items-center justify-between">
              <p v-if="rejectError" class="flex items-center gap-1 text-xs text-danger">
                <CircleAlert :size="13" />
                {{ rejectError }}
              </p>
              <span v-else />
              <span class="num text-micro text-gray-500">{{ rejectForm.reason.length }} / {{ REASON_MAX }}</span>
            </div>

            <div class="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                class="btn btn-md btn-text"
                :disabled="ticketStore.submitting"
                @click="rejectVisible = false"
              >
                取消
              </button>
              <button
                type="button"
                class="btn btn-md btn-danger"
                :disabled="ticketStore.submitting"
                @click="handleReject"
              >
                <Loader2 v-if="ticketStore.submitting" :size="15" class="animate-spin" />
                提交并申请重新处理
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 200ms ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
