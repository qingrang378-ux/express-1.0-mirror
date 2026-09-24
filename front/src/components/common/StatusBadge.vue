<script setup lang="ts">
/**
 * @file StatusBadge.vue
 * 文件作用：工单状态徽章（TicketStatus 五色映射）。
 * PENDING 中性 / PROCESSING 主色 / PENDING_CS_CONFIRM 警告
 * / PENDING_CUSTOMER_CONFIRM 主色 / CLOSED 灰色
 */
import { computed } from 'vue';
import type { TicketStatus } from '@/api/api-contracts';

interface Props {
  status: TicketStatus;
}
const props = defineProps<Props>();

/** 各状态对应的样式（完整字面量类名，供 Tailwind 扫描） */
const STATUS_STYLES: Record<TicketStatus, { label: string; box: string; dot: string; pulse?: boolean }> = {
  PENDING: {
    label: '待处理',
    box: 'border-white/15 bg-white/[0.05] text-gray-300',
    dot: 'bg-gray-400',
  },
  PROCESSING: {
    label: '处理中',
    box: 'border-brand/40 bg-brand/10 text-brand',
    dot: 'bg-brand',
    pulse: true,
  },
  PENDING_CS_CONFIRM: {
    label: '待客服确认',
    box: 'border-warn/40 bg-warn/10 text-warn',
    dot: 'bg-warn',
    pulse: true,
  },
  PENDING_CUSTOMER_CONFIRM: {
    label: '待客户确认',
    box: 'border-brand/40 bg-brand/10 text-brand',
    dot: 'bg-brand',
    pulse: true,
  },
  CLOSED: {
    label: '已关闭',
    box: 'border-white/10 bg-white/[0.03] text-gray-500',
    dot: 'bg-gray-600',
  },
};

const style = computed(() => STATUS_STYLES[props.status]);
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5"
    :class="style.box"
  >
    <span
      class="h-1.5 w-1.5 rounded-full"
      :class="[style.dot, style.pulse ? 'animate-pulse' : '']"
    />
    {{ style.label }}
  </span>
</template>
