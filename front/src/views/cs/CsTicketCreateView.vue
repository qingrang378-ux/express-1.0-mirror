<script setup lang="ts">
/**
 * @file CsTicketCreateView.vue
 * 文件作用：客服基于异常反馈创建并分派工单（/cs/tickets/create?feedbackId=xxx）。
 * 继承反馈异常类型（可修改）→ 选择优先级 → 按 SLA 预览处理期限 → 选择运营并分派。
 *
 * 接口：POST /cs/tickets 创建 → POST /cs/tickets/{id}/assign 分派（两步串行）。
 * 说明：运营候选人通过 provisional 接口 GET /cs/ops-staff 加载（见 API.md §11 修订提案）。
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  CalendarClock,
  CircleAlert,
  Loader2,
  Send,
  UserCog,
} from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import FeedbackTypeSelector from '@/components/common/FeedbackTypeSelector.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import { useFeedbackStore } from '@/stores/feedback';
import { useTicketStore } from '@/stores/ticket';
import { getOpsAssignees } from '@/api/workorder';
import {
  EXCEPTION_TYPE_LABELS,
  PRIORITY_LABELS,
  SLA_HOURS,
  computeDeadline,
  formatDateTime,
  truncate,
} from '@/utils/display';
import type {
  ExceptionType,
  OpsAssignee,
  Priority,
} from '@/api/api-contracts';

const route = useRoute();
const router = useRouter();
const feedbackStore = useFeedbackStore();
const ticketStore = useTicketStore();

const feedbackId = Number(route.query.feedbackId);

/** 工单表单 */
const form = reactive<{
  type: ExceptionType | '';
  priority: Priority | '';
  assigneeId: number | '';
}>({
  type: '',
  priority: '',
  assigneeId: '',
});
/** 字段级错误 */
const fieldErrors = reactive<{ type: string; priority: string; assigneeId: string }>({
  type: '',
  priority: '',
  assigneeId: '',
});
const formError = ref('');

/** 优先级选项（4 档胶囊） */
const PRIORITY_OPTIONS: ReadonlyArray<{ value: Priority; tone: string }> = [
  { value: 'LOW', tone: 'border-edge text-gray-300' },
  { value: 'MEDIUM', tone: 'border-brand/40 text-brand' },
  { value: 'HIGH', tone: 'border-warn/40 text-warn' },
  { value: 'URGENT', tone: 'border-danger/50 text-danger' },
];

/**
 * 运营候选人（provisional：GET /cs/ops-staff，见 API.md §11 修订提案）
 */
const assignees = ref<OpsAssignee[]>([]);

async function loadAssignees(): Promise<void> {
  try {
    assignees.value = await getOpsAssignees();
  } catch {
    // 候选人接口失败不阻塞表单其余部分，拦截器已全局提示
  }
}

/** SLA 预览：依据当前所选异常类型计算预计截止时间 */
const deadlinePreview = computed(() =>
  form.type ? formatDateTime(computeDeadline(form.type)) : '选择异常分类后自动计算',
);
const slaHours = computed(() => (form.type ? SLA_HOURS[form.type] : null));

const feedback = computed(() => feedbackStore.currentFeedback);

/** 表单是否合法（控制提交按钮禁用） */
const isFormValid = computed(
  () => form.type !== '' && form.priority !== '' && typeof form.assigneeId === 'number',
);

/** 选择优先级 */
function selectPriority(value: Priority): void {
  form.priority = value;
  fieldErrors.priority = '';
}

/** 前端校验 */
function validate(): boolean {
  fieldErrors.type = form.type ? '' : '请选择异常分类';
  fieldErrors.priority = form.priority ? '' : '请选择优先级';
  fieldErrors.assigneeId =
    typeof form.assigneeId === 'number' && form.assigneeId > 0
      ? ''
      : '请选择被分派运营人员';
  return !fieldErrors.type && !fieldErrors.priority && !fieldErrors.assigneeId;
}

/**
 * 提交：先创建工单，再分派给运营；任一步失败都保留表单内容。
 * 创建成功但分派失败时，仍跳转到工单详情（工单已存在，可在详情页后续处理）。
 */
async function handleSubmit(): Promise<void> {
  formError.value = '';
  if (!validate() || ticketStore.submitting) return;

  try {
    const ticketId = await ticketStore.createCsTicket({
      feedbackId,
      type: form.type as ExceptionType,
      priority: form.priority as Priority,
    });

    if (typeof form.assigneeId === 'number') {
      try {
        await ticketStore.assignCsTicket({ ticketId, assigneeId: form.assigneeId });
      } catch {
        // 分派失败：工单已创建，进入详情页继续处理
        router.push(`/cs/tickets/${ticketId}`);
        return;
      }
    }
    router.push(`/cs/tickets/${ticketId}`);
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '创建工单失败，请稍后重试';
  }
}

/** 初始：加载关联反馈并预填异常类型；并行加载运营候选人 */
onMounted(async () => {
  void loadAssignees();
  if (!feedbackId) {
    feedbackStore.error = '缺少 feedbackId 参数，请从异常反馈池进入';
    return;
  }
  try {
    await feedbackStore.fetchFeedbackDetail(feedbackId);
    if (feedback.value) {
      form.type = feedback.value.type;
    }
  } catch {
    /* 40400 等：渲染失败态，拦截器已提示 */
  }
});

function goBack(): void {
  router.push('/cs/feedbacks');
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-2xl px-4 py-6">
      <!-- 顶部 -->
      <div class="mb-5 flex items-center gap-3">
        <button type="button" class="btn btn-sm btn-text btn-icon" @click="goBack">
          <ArrowLeft :size="15" />
        </button>
        <h1 class="text-module font-semibold text-gray-100">创建工单</h1>
      </div>

      <!-- 反馈加载中 -->
      <LoadingSkeleton v-if="feedbackStore.loading.detail" type="card" :rows="1" />

      <!-- 参数缺失 / 反馈不存在 -->
      <GlassCard v-else-if="!feedback" padding="p-8">
        <EmptyState
          danger
          title="关联反馈不可用"
          :description="feedbackStore.error || '请从异常反馈池选择一条反馈后再创建工单'"
          action-text="返回反馈池"
          @action="goBack"
        />
      </GlassCard>

      <template v-else>
        <!-- 关联反馈卡 -->
        <GlassCard padding="p-4" class="mb-4">
          <template #header>
            <span class="card-title">关联异常反馈</span>
          </template>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="num text-gray-200">{{ feedback.waybillNo }}</span>
            <span class="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-brand">
              {{ EXCEPTION_TYPE_LABELS[feedback.type] }}
            </span>
          </div>
          <p class="mt-2 text-sm leading-6 text-gray-400">{{ truncate(feedback.description, 120) }}</p>
        </GlassCard>

        <GlassCard padding="p-6">
          <form class="space-y-6" @submit.prevent="handleSubmit">
            <!-- 异常分类（继承反馈类型，可修改） -->
            <fieldset>
              <legend class="mb-2.5 text-sm font-semibold text-gray-200">
                异常分类 <span class="text-danger">*</span>
              </legend>
              <FeedbackTypeSelector
                :model-value="form.type"
                :disabled="ticketStore.submitting"
                :error="fieldErrors.type"
                @update:model-value="(v) => { form.type = v; fieldErrors.type = '' }"
              />
            </fieldset>

            <!-- 优先级 -->
            <div>
              <p class="mb-2.5 text-sm font-semibold text-gray-200">
                优先级 <span class="text-danger">*</span>
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="option in PRIORITY_OPTIONS"
                  :key="option.value"
                  type="button"
                  :disabled="ticketStore.submitting"
                  class="rounded-full border px-4 py-1.5 text-xs transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  :class="
                    form.priority === option.value
                      ? `${option.tone} bg-fill-2 shadow-neon`
                      : 'border-edge-faint bg-fill-1 text-gray-400 hover:border-edge'
                  "
                  @click="selectPriority(option.value)"
                >
                  {{ PRIORITY_LABELS[option.value] }}
                </button>
              </div>
              <p v-if="fieldErrors.priority" class="mt-1.5 flex items-center gap-1 text-xs text-danger">
                <CircleAlert :size="13" />
                {{ fieldErrors.priority }}
              </p>
            </div>

            <!-- SLA 处理期限预览 -->
            <div class="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/[0.05] px-4 py-3">
              <CalendarClock :size="18" class="shrink-0 text-brand" />
              <div class="text-xs">
                <p class="text-gray-300">
                  SLA 处理时限：
                  <span v-if="slaHours" class="num text-brand">{{ slaHours }} 小时</span>
                </p>
                <p class="num mt-0.5 text-gray-500">预计截止：{{ deadlinePreview }}</p>
              </div>
            </div>

            <!-- 分派运营 -->
            <div>
              <label for="assignee" class="input-label mb-2 flex items-center gap-1.5">
                <UserCog :size="14" />
                分派给运营 <span class="text-danger">*</span>
              </label>
              <select
                id="assignee"
                v-model="form.assigneeId"
                :disabled="ticketStore.submitting"
                class="input-glass"
                :class="fieldErrors.assigneeId ? '!border-danger/60' : ''"
              >
                <option :value="''" disabled>请选择运营人员</option>
                <option v-for="ops in assignees" :key="ops.userId" :value="ops.userId">
                  {{ ops.realName }}（当前待办 {{ ops.todoCount }} 单）
                </option>
              </select>
              <p v-if="assignees.length === 0" class="mt-1.5 text-micro text-gray-500">
                暂无可用运营人员：候选人接口（GET /cs/ops-staff，v1.1 提案）未就绪或加载失败。
              </p>
              <p v-else-if="fieldErrors.assigneeId" class="mt-1.5 flex items-center gap-1 text-xs text-danger">
                <CircleAlert :size="13" />
                {{ fieldErrors.assigneeId }}
              </p>
            </div>

            <!-- 整体错误 -->
            <p
              v-if="formError"
              class="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger"
            >
              <CircleAlert :size="14" />
              {{ formError }}
            </p>

            <!-- 操作区 -->
            <div class="flex items-center justify-end gap-3 border-t border-edge-faint pt-4">
              <button
                type="button"
                class="btn btn-md btn-text"
                :disabled="ticketStore.submitting"
                @click="goBack"
              >
                取消
              </button>
              <button
                type="submit"
                class="btn btn-lg btn-primary min-w-[148px]"
                :disabled="!isFormValid || ticketStore.submitting"
              >
                <Loader2 v-if="ticketStore.submitting" :size="15" class="animate-spin" />
                <Send v-else :size="15" />
                {{ ticketStore.submitting ? '提交中...' : '创建并分派' }}
              </button>
            </div>
          </form>
        </GlassCard>
      </template>
    </main>
  </div>
</template>
