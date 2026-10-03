<script setup lang="ts">
/**
 * @file FeedbackTypeSelector.vue
 * 文件作用：异常类型胶囊选择器（5 选 1），用于提交异常反馈表单。
 * - v-model 绑定 ExceptionType
 * - 选中胶囊：电光蓝描边 + 霓虹发光；未选：玻璃灰
 * - 支持 disabled（提交中禁用，防重复点击）与 error（字段级错误，就近展示）
 */
import { CircleAlert, Clock, FileWarning, PackageX, PhoneOff, Tag } from 'lucide-vue-next';
import type { ExceptionType } from '@/api/api-contracts';

interface Props {
  /** 当前选中类型；未选择时为 '' */
  modelValue: ExceptionType | '';
  /** 禁用态（如提交中） */
  disabled?: boolean;
  /** 字段级错误提示（靠近字段展示） */
  error?: string;
}
const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  error: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: ExceptionType];
}>();

/** 五个异常类型选项 */
const OPTIONS: ReadonlyArray<{ value: ExceptionType; label: string; icon: typeof Clock; hint: string }> = [
  { value: 'DELAY', label: '延误', icon: Clock, hint: '运输 / 派送超时' },
  { value: 'DAMAGE', label: '物品破损', icon: PackageX, hint: '包裹或内件受损' },
  { value: 'LABEL_DAMAGED', label: '标签破损', icon: Tag, hint: '面单标签无法识别' },
  { value: 'CONTACT_ABNORMAL', label: '联系人异常', icon: PhoneOff, hint: '无法联系收发件人' },
  { value: 'SIGN_DISPUTE', label: '签收争议', icon: FileWarning, hint: '对签收结果有异议' },
];

function select(value: ExceptionType): void {
  if (props.disabled) return;
  emit('update:modelValue', value);
}
</script>

<template>
  <div>
    <div
      class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      role="radiogroup"
      aria-label="异常类型"
    >
      <button
        v-for="option in OPTIONS"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="modelValue === option.value"
        :disabled="disabled"
        class="group flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-200"
        :class="[
          modelValue === option.value
            ? 'border-brand/60 bg-brand/10 text-brand shadow-neon'
            : 'border-edge-faint bg-fill-1 text-gray-300 hover:border-brand/30 hover:text-gray-100',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ]"
        @click="select(option.value)"
      >
        <component
          :is="option.icon"
          :size="18"
          :stroke-width="2"
          :class="modelValue === option.value ? 'text-brand' : 'text-gray-400 group-hover:text-brand'"
        />
        <span class="text-sm font-semibold">{{ option.label }}</span>
        <span class="text-micro leading-4 text-gray-500">{{ option.hint }}</span>
      </button>
    </div>

    <!-- 字段级错误提示（就近展示） -->
    <p v-if="error" class="mt-1.5 flex items-center gap-1 text-xs text-danger">
      <CircleAlert :size="13" />
      {{ error }}
    </p>
  </div>
</template>
