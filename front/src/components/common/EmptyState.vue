<script setup lang="ts">
/**
 * @file EmptyState.vue
 * 文件作用：空数据 / 失败兜底占位组件。
 * 展示图标、标题、描述与可选操作按钮；图标可通过 #icon 插槽替换
 * （如失败态可换成错误图标），操作按钮点击时向父级抛出 action 事件。
 */
import { Inbox } from 'lucide-vue-next';

interface Props {
  /** 主标题（必填） */
  title: string;
  /** 描述文案 */
  description?: string;
  /** 操作按钮文案；不传则不显示按钮 */
  actionText?: string;
  /** 是否以失败态（红色）呈现图标与标题，默认普通空态 */
  danger?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  description: '',
  actionText: '',
  danger: false,
});

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
    <!-- 图标插槽（默认 Inbox） -->
    <div
      class="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl border"
      :class="
        props.danger
          ? 'border-danger/30 bg-danger/10 text-danger shadow-neon-danger'
          : 'border-edge-faint bg-fill-2 text-gray-500'
      "
    >
      <slot name="icon">
        <Inbox :size="26" :stroke-width="1.8" />
      </slot>
    </div>

    <p class="text-sm font-semibold" :class="props.danger ? 'text-danger' : 'text-gray-300'">
      {{ title }}
    </p>
    <p v-if="description" class="max-w-sm text-xs leading-5 text-gray-500">{{ description }}</p>

    <button
      v-if="actionText"
      type="button"
      class="btn btn-md btn-primary mt-2"
      @click="emit('action')"
    >
      {{ actionText }}
    </button>
  </div>
</template>
