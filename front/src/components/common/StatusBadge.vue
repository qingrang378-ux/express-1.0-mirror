<script setup lang="ts">
/**
 * @file StatusBadge.vue
 * 文件作用：工单状态徽章（TicketStatus 五色映射，色值与光影绑定设计规范 §1.1/§2.3）。
 * 待处理与两类「待确认」= 警告橙 + 2.5s 匀速呼吸；处理中 = 主色青蓝静态无强光；
 * 已关闭（工单办结）= 成功冷绿、无发光。
 */
import { computed } from 'vue';
import type { TicketStatus } from '@/api/api-contracts';

interface Props {
  status: TicketStatus;
}
const props = defineProps<Props>();

/** 各状态对应的样式（完整字面量类名，供 Tailwind 扫描） */
const STATUS_STYLES: Record<TicketStatus, { label: string; box: string; dot: string }> = {
  PENDING: {
    label: '待处理',
    box: 'border-warn/40 bg-warn/10 text-warn animate-breathe-warn',
    dot: 'bg-warn',
  },
  PROCESSING: {
    label: '处理中',
    box: 'border-brand/40 bg-brand/10 text-brand',
    dot: 'bg-brand',
  },
  PENDING_CS_CONFIRM: {
    label: '待客服确认',
    box: 'border-warn/40 bg-warn/10 text-warn animate-breathe-warn',
    dot: 'bg-warn',
  },
  PENDING_CUSTOMER_CONFIRM: {
    label: '待客户确认',
    box: 'border-warn/40 bg-warn/10 text-warn animate-breathe-warn',
    dot: 'bg-warn',
  },
  CLOSED: {
    label: '已关闭',
    box: 'border-success/40 bg-success/10 text-success',
    dot: 'bg-success',
  },
};

const style = computed(() => STATUS_STYLES[props.status]);
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs leading-5"
    :class="style.box"
  >
    <span class="h-1.5 w-1.5 rounded-full" :class="style.dot" />
    {{ style.label }}
  </span>
</template>
