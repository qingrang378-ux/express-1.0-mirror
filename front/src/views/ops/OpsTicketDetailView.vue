<script setup lang="ts">
/**
 * @file OpsTicketDetailView.vue
 * 文件作用：运营工单详情与处理页（/ops/tickets/:id）。
 * 受理工单（PENDING）→ 记录内部核实过程（INTERNAL_ONLY）→ 提交处理方案与结果（PROCESSING），
 * 提交后工单进入 PENDING_CS_CONFIRM。
 *
 * 安全约束：
 * - 仅 assigneeId=本人可操作（后端 40300 兜底，前端仅对 PENDING/PROCESSING 暴露入口）
 * - 仅 PENDING 可受理、仅 PROCESSING 可提交结果（后端 40900 兜底）
 * - 内部核实记录为 INTERNAL_ONLY，客户不可见
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Loader2,
  Lock,
  NotebookPen,
  Save,
  Send,
} from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import StatusBadge from '@/components/common/StatusBadge.vue';
import TimeoutBadge from '@/components/common/TimeoutBadge.vue';
import CountdownTimer from '@/components/common/CountdownTimer.vue';
import TimelineList from '@/components/common/TimelineList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import { useTicketStore } from '@/stores/ticket';
import { notify } from '@/utils/notify';
import {
  EXCEPTION_TYPE_LABELS,
  PRIORITY_LABELS,
  formatDateTime,
} from '@/utils/display';

const route = useRoute();
const router = useRouter();
const ticketStore = useTicketStore();

const ticketId = Number(route.params.id);
const ticket = computed(() => ticketStore.currentInternalTicket);
const loadFailed = computed(
  () => !!ticketStore.error && !ticketStore.loading.internalDetail && !ticket.value,
);

const isPending = computed(() => ticket.value?.status === 'PENDING');
const isProcessing = computed(() => ticket.value?.status === 'PROCESSING');
/** 受理后（非 PENDING）可查看内部核实区 */
const accepted = computed(() => !!ticket.value && ticket.value.status !== 'PENDING');

/* -------------------------------- 受理 -------------------------------- */
const acceptVisible = ref(false);

async function handleAccept(): Promise<void> {
  try {
    await ticketStore.acceptOpsTicket(ticketId);
    acceptVisible.value = false;
    notify.success('已受理，工单进入处理中');
    await ticketStore.fetchOpsTicketDetail(ticketId);
  } catch {
    // 40300 / 40900：弹窗保留，拦截器已提示
  }
}

/* ----------------------------- 内部核实记录 ----------------------------- */
const recordContent = ref('');
const recordError = ref('');
const RECORD_MIN = 5;
const RECORD_MAX = 1000;

/** 保存一条内部核实记录（INTERNAL_ONLY） */
async function handleSaveRecord(): Promise<void> {
  recordError.value = '';
  const len = recordContent.value.trim().length;
  if (len < RECORD_MIN || len > RECORD_MAX) {
    recordError.value = `核实记录需 ${RECORD_MIN}~${RECORD_MAX} 字（当前 ${len} 字）`;
    return;
  }
  try {
    await ticketStore.createOpsInternalRecord({
      ticketId,
      content: recordContent.value.trim(),
    });
    recordContent.value = '';
    notify.success('内部核实记录已保存');
    await ticketStore.fetchOpsTicketDetail(ticketId);
  } catch {
    // 40300：只有被分派人员可以提交内部处理结果；保留已填内容
  }
}

/* ------------------------------ 处理结果提交 ------------------------------ */
const resultForm = reactive<{ plan: string; result: string }>({ plan: '', result: '' });
const resultErrors = reactive<{ plan: string; result: string }>({ plan: '', result: '' });
const RESULT_MIN = 5;
const RESULT_MAX = 1000;

const resultValid = computed(
  () =>
    resultForm.plan.trim().length >= RESULT_MIN &&
    resultForm.plan.trim().length <= RESULT_MAX &&
    resultForm.result.trim().length >= RESULT_MIN &&
    resultForm.result.trim().length <= RESULT_MAX,
);

/** 提交处理方案与结果：成功后工单变 PENDING_CS_CONFIRM */
async function handleSubmitResult(): Promise<void> {
  resultErrors.plan = '';
  resultErrors.result = '';
  const planLen = resultForm.plan.trim().length;
  const resultLen = resultForm.result.trim().length;
  resultErrors.plan =
    planLen < RESULT_MIN || planLen > RESULT_MAX
      ? `处理方案需 ${RESULT_MIN}~${RESULT_MAX} 字（当前 ${planLen} 字）`
      : '';
  resultErrors.result =
    resultLen < RESULT_MIN || resultLen > RESULT_MAX
      ? `处理结果需 ${RESULT_MIN}~${RESULT_MAX} 字（当前 ${resultLen} 字）`
      : '';
  if (resultErrors.plan || resultErrors.result) return;

  try {
    await ticketStore.submitOpsHandlingResult({
      ticketId,
      plan: resultForm.plan.trim(),
      result: resultForm.result.trim(),
    });
    notify.success('处理结果已提交，等待客服确认');
    resultForm.plan = '';
    resultForm.result = '';
    await ticketStore.fetchOpsTicketDetail(ticketId);
  } catch {
    // 40300 非被分派 / 40900 非 PROCESSING：保留已填方案与结果，拦截器已提示
  }
}

onMounted(async () => {
  ticketStore.resetCurrent();
  try {
    await ticketStore.fetchOpsTicketDetail(ticketId);
  } catch {
    /* 40400：整页失败态 */
  }
});

function goBack(): void {
  router.push('/ops/tickets');
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-4xl px-4 py-6">
      <!-- 顶部 -->
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" class="btn-ghost !px-2.5" @click="goBack">
          <ArrowLeft :size="15" />
        </button>
        <template v-if="ticket">
          <h1 class="num text-lg font-semibold text-gray-100">{{ ticket.ticketNo }}</h1>
          <StatusBadge :status="ticket.status" />
          <TimeoutBadge :timeout-status="ticket.timeoutStatus" />
        </template>
        <h1 v-else class="text-lg font-semibold text-gray-100">工单详情（运营）</h1>
      </div>

      <LoadingSkeleton v-if="ticketStore.loading.internalDetail" type="card" :rows="3" />

      <GlassCard v-else-if="loadFailed" padding="p-8">
        <EmptyState
          danger
          title="工单不存在或无权查看"
          :description="ticketStore.error || '该工单可能未分派给您，请从待办列表进入'"
          action-text="返回待办列表"
          @action="goBack"
        />
      </GlassCard>

      <template v-else-if="ticket">
        <!-- 工单信息卡 -->
        <GlassCard glow padding="p-5" class="mb-4">
          <template #header>
            <div class="flex w-full flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-gray-200">工单信息</span>
              <!-- 仅 PENDING 显示受理按钮 -->
              <button
                v-if="isPending"
                type="button"
                class="btn-neon ml-auto !px-3 !py-1 text-xs"
                :disabled="ticketStore.submitting"
                @click="acceptVisible = true"
              >
                <Check :size="14" />
                受理工单
              </button>
            </div>
          </template>

          <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-xs text-gray-500">运单号</dt>
              <dd class="num mt-0.5 text-gray-200">{{ ticket.waybillNo }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">异常类型</dt>
              <dd class="mt-0.5 text-accent">{{ EXCEPTION_TYPE_LABELS[ticket.type] }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">优先级</dt>
              <dd class="mt-0.5 text-gray-200">{{ PRIORITY_LABELS[ticket.priority] }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">处理期限</dt>
              <dd class="mt-1">
                <CountdownTimer :deadline-at="ticket.deadlineAt" />
              </dd>
            </div>
          </dl>
          <p class="num mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-gray-500">
            截止时间：{{ formatDateTime(ticket.deadlineAt) }}
          </p>
        </GlassCard>

        <!-- 内部核实记录区（受理后可见，INTERNAL_ONLY） -->
        <GlassCard padding="p-5" class="mb-4 !border-dashed !border-gray-500/40">
          <template #header>
            <span class="flex items-center gap-1.5 text-sm font-medium text-gray-300">
              <Lock :size="14" class="text-gray-400" />
              内部核实记录
              <span class="ml-1 inline-flex items-center gap-1 rounded-md border border-dashed border-gray-500/50 px-1.5 py-0.5 text-[10px] text-gray-400">
                INTERNAL · 仅内部可见
              </span>
            </span>
          </template>

          <!-- 未受理：禁用态提示 -->
          <EmptyState
            v-if="!accepted"
            title="工单尚未受理"
            description="请先在上方点击「受理工单」，受理后即可记录核实过程"
          />

          <template v-else>
            <TimelineList
              :records="ticket.internalRecords"
              empty-title="暂无核实记录"
              empty-description="核实过程记录将仅对客服与运营可见"
            />

            <!-- 新增核实记录：PROCESSING 可编辑，其余状态只读 -->
            <div class="mt-4 border-t border-white/[0.06] pt-4">
              <label for="record-content" class="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-300">
                <NotebookPen :size="13" />
                新增核实记录
              </label>
              <textarea
                id="record-content"
                v-model="recordContent"
                rows="3"
                :maxlength="RECORD_MAX"
                :disabled="!isProcessing || ticketStore.submitting"
                class="input-glass resize-none leading-6"
                :class="recordError ? '!border-danger/60' : ''"
                :placeholder="isProcessing ? '记录核实过程（5~1000 字），该内容仅内部可见' : '工单当前状态不可新增记录'"
              />
              <div class="mt-1.5 flex items-center justify-between">
                <p v-if="recordError" class="flex items-center gap-1 text-xs text-danger">
                  <CircleAlert :size="13" />
                  {{ recordError }}
                </p>
                <span v-else />
                <span class="num text-[11px] text-gray-500">{{ recordContent.trim().length }} / {{ RECORD_MAX }}</span>
              </div>
              <div class="mt-2 flex justify-end">
                <button
                  type="button"
                  class="btn-ghost"
                  :disabled="!isProcessing || ticketStore.submitting"
                  @click="handleSaveRecord"
                >
                  <Save :size="14" />
                  保存记录
                </button>
              </div>
            </div>
          </template>
        </GlassCard>

        <!-- 处理结果提交卡：仅 PROCESSING 可编辑 -->
        <GlassCard padding="p-5" :glow="isProcessing" :class="!isProcessing ? 'opacity-70' : ''">
          <template #header>
            <span class="text-sm font-medium text-gray-200">处理方案与结果</span>
          </template>

          <template v-if="isProcessing">
            <form class="space-y-4" @submit.prevent="handleSubmitResult">
              <div>
                <label for="plan" class="mb-2 block text-xs font-medium text-gray-300">
                  处理方案 <span class="text-danger">*</span>
                </label>
                <textarea
                  id="plan"
                  v-model="resultForm.plan"
                  rows="3"
                  :maxlength="RESULT_MAX"
                  :disabled="ticketStore.submitting"
                  class="input-glass resize-none leading-6"
                  :class="resultErrors.plan ? '!border-danger/60' : ''"
                  placeholder="说明拟采取的处理方案（5~1000 字）"
                />
                <p v-if="resultErrors.plan" class="mt-1.5 flex items-center gap-1 text-xs text-danger">
                  <CircleAlert :size="13" />
                  {{ resultErrors.plan }}
                </p>
              </div>

              <div>
                <label for="result" class="mb-2 block text-xs font-medium text-gray-300">
                  处理结果 <span class="text-danger">*</span>
                </label>
                <textarea
                  id="result"
                  v-model="resultForm.result"
                  rows="3"
                  :maxlength="RESULT_MAX"
                  :disabled="ticketStore.submitting"
                  class="input-glass resize-none leading-6"
                  :class="resultErrors.result ? '!border-danger/60' : ''"
                  placeholder="说明实际处理结果（5~1000 字），提交后进入待客服确认"
                />
                <p v-if="resultErrors.result" class="mt-1.5 flex items-center gap-1 text-xs text-danger">
                  <CircleAlert :size="13" />
                  {{ resultErrors.result }}
                </p>
              </div>

              <div class="flex justify-end border-t border-white/[0.06] pt-4">
                <button
                  type="submit"
                  class="btn-neon min-w-[168px]"
                  :disabled="!resultValid || ticketStore.submitting"
                >
                  <Loader2 v-if="ticketStore.submitting" :size="15" class="animate-spin" />
                  <Send v-else :size="15" />
                  {{ ticketStore.submitting ? '提交中...' : '提交处理结果' }}
                </button>
              </div>
            </form>
          </template>

          <EmptyState
            v-else
            title="当前状态不可提交处理结果"
            :description="isPending ? '请先受理工单' : '处理结果已提交，等待客服确认或工单已关闭'"
          />
        </GlassCard>
      </template>
    </main>

    <!-- 受理确认弹窗 -->
    <ConfirmDialog
      :visible="acceptVisible"
      title="受理工单"
      :content="ticket ? `确认受理工单 ${ticket.ticketNo}（${EXCEPTION_TYPE_LABELS[ticket.type]}）？受理后工单进入处理中。` : ''"
      confirm-text="确认受理"
      :loading="ticketStore.submitting"
      @confirm="handleAccept"
      @update:visible="(v: boolean) => (acceptVisible = v)"
    />
  </div>
</template>
