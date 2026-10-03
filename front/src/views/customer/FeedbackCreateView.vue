<script setup lang="ts">
/**
 * @file FeedbackCreateView.vue
 * 文件作用：客户提交异常反馈页（/customer/waybills/:waybillNo/feedback）。
 * 5 类异常胶囊单选 + 描述（5~500 字）；前端校验，字段错误就近显示；
 * 提交失败保留已填内容，提交中按钮禁用并显示加载态。
 */
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, CircleAlert, Loader2, Send } from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import FeedbackTypeSelector from '@/components/common/FeedbackTypeSelector.vue';
import { useFeedbackStore } from '@/stores/feedback';
import { notify } from '@/utils/notify';
import { BusinessError, BizCode } from '@/api/api-contracts';
import type { ExceptionType } from '@/api/api-contracts';

const route = useRoute();
const router = useRouter();
const feedbackStore = useFeedbackStore();

const waybillNo = String(route.params.waybillNo ?? '');

/** 表单数据（提交失败不清空，保留用户已填内容） */
const form = reactive<{ type: ExceptionType | ''; description: string }>({
  type: '',
  description: '',
});
/** 字段级错误（就近显示在对应字段下方） */
const fieldErrors = reactive<{ type: string; description: string }>({
  type: '',
  description: '',
});
/** 表单整体错误（如网络/系统错误，显示在按钮上方） */
const formError = ref('');

const DESCRIPTION_MIN = 5;
const DESCRIPTION_MAX = 500;

const charCount = computed(() => form.description.length);

/** 表单是否合法（控制提交按钮禁用） */
const isFormValid = computed(
  () =>
    form.type !== '' &&
    form.description.trim().length >= DESCRIPTION_MIN &&
    form.description.trim().length <= DESCRIPTION_MAX,
);

/** 前端字段校验，返回是否通过 */
function validate(): boolean {
  fieldErrors.type = form.type ? '' : '请选择异常类型';
  const len = form.description.trim().length;
  fieldErrors.description =
    len === 0
      ? '请填写异常描述'
      : len < DESCRIPTION_MIN
        ? `描述至少 ${DESCRIPTION_MIN} 个字（当前 ${len} 字）`
        : len > DESCRIPTION_MAX
          ? `描述不能超过 ${DESCRIPTION_MAX} 个字（当前 ${len} 字）`
          : '';
  return !fieldErrors.type && !fieldErrors.description;
}

/** 提交反馈 */
async function handleSubmit(): Promise<void> {
  formError.value = '';
  if (!validate() || feedbackStore.loading.submit) return;

  try {
    await feedbackStore.submitFeedback({
      waybillNo,
      type: form.type as ExceptionType,
      description: form.description.trim(),
    });
    notify.success('反馈已提交');
    // 成功后跳转我的工单（反馈转工单进度在工单页跟进）
    router.push('/customer/tickets');
  } catch (err) {
    // 失败保留已填内容；40000 后端参数错误在描述字段下就近提示
    if (err instanceof BusinessError && err.code === BizCode.BAD_REQUEST) {
      fieldErrors.description = err.message || '提交内容未通过校验，请检查后重试';
    } else {
      formError.value = err instanceof Error ? err.message : '提交失败，请稍后重试';
    }
  }
}

function handleCancel(): void {
  router.push(`/customer/waybills/${encodeURIComponent(waybillNo)}`);
}
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-2xl px-4 py-6">
      <!-- 顶部 -->
      <div class="mb-5 flex items-center gap-3">
        <button type="button" class="btn btn-sm btn-text btn-icon" @click="handleCancel">
          <ArrowLeft :size="15" />
        </button>
        <div>
          <h1 class="text-module font-semibold text-gray-100">提交异常反馈</h1>
          <p class="num text-xs text-gray-500">运单号：{{ waybillNo }}</p>
        </div>
      </div>

      <GlassCard padding="p-6">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- 异常类型 -->
          <fieldset>
            <legend class="input-label mb-2 flex items-center gap-1">
              异常类型
              <span class="text-danger">*</span>
            </legend>
            <FeedbackTypeSelector
              :model-value="form.type"
              :disabled="feedbackStore.loading.submit"
              :error="fieldErrors.type"
              @update:model-value="(v) => { form.type = v; fieldErrors.type = '' }"
            />
          </fieldset>

          <!-- 异常描述 -->
          <div>
            <label for="feedback-desc" class="input-label mb-2 flex items-center gap-1">
              异常描述
              <span class="text-danger">*</span>
            </label>
            <textarea
              id="feedback-desc"
              v-model="form.description"
              rows="6"
              :maxlength="DESCRIPTION_MAX"
              :disabled="feedbackStore.loading.submit"
              class="input-glass resize-none leading-6"
              :class="fieldErrors.description ? '!border-danger/60' : ''"
              placeholder="请详细描述异常情况，例如发生时间、具体问题、期望处理方式（5~500 字）"
            />
            <div class="mt-1.5 flex items-center justify-between">
              <p v-if="fieldErrors.description" class="flex items-center gap-1 text-xs text-danger">
                <CircleAlert :size="13" />
                {{ fieldErrors.description }}
              </p>
              <span v-else />
              <span
                class="num text-micro"
                :class="charCount > DESCRIPTION_MAX ? 'text-danger' : 'text-gray-500'"
              >
                {{ charCount }} / {{ DESCRIPTION_MAX }}
              </span>
            </div>
          </div>

          <!-- 整体错误提示 -->
          <p
            v-if="formError"
            class="flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger"
          >
            <CircleAlert :size="14" />
            {{ formError }}
          </p>

          <!-- 操作按钮 -->
          <div class="flex items-center justify-end gap-3 border-t border-edge-faint pt-4">
            <button
              type="button"
              class="btn btn-md btn-text"
              :disabled="feedbackStore.loading.submit"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              type="submit"
              class="btn btn-lg btn-primary min-w-[132px]"
              :disabled="!isFormValid || feedbackStore.loading.submit"
            >
              <Loader2 v-if="feedbackStore.loading.submit" :size="15" class="animate-spin" />
              <Send v-else :size="15" />
              {{ feedbackStore.loading.submit ? '提交中...' : '提交反馈' }}
            </button>
          </div>
        </form>
      </GlassCard>
    </main>
  </div>
</template>
