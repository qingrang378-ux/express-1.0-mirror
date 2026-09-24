<script setup lang="ts">
/**
 * @file TimeoutBadge.vue
 * 文件作用：超时状态徽章（TimeoutStatus 三色映射）。
 * NORMAL 中性 / WARNING 橙 / OVERDUE 红，图标使用 lucide。
 */
import { computed } from 'vue';
import { AlarmClock, Hourglass, Timer } from 'lucide-vue-next';
import type { TimeoutStatus } from '@/api/api-contracts';

interface Props {
  timeoutStatus: TimeoutStatus;
}
const props = defineProps<Props>();

const STATUS_META = {
  NORMAL: {
    label: '正常',
    box: 'border-white/15 bg-white/[0.05] text-gray-300',
    icon: Timer,
  },
  WARNING: {
    label: '即将超时',
    box: 'border-warn/40 bg-warn/10 text-warn shadow-neon-warn',
    icon: Hourglass,
  },
  OVERDUE: {
    label: '已超时',
    box: 'border-danger/50 bg-danger/10 text-danger animate-pulse-danger',
    icon: AlarmClock,
  },
} as const satisfies Record<TimeoutStatus, { label: string; box: string; icon: typeof Timer }>;

const meta = computed(() => STATUS_META[props.timeoutStatus]);
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5"
    :class="meta.box"
  >
    <component :is="meta.icon" :size="12" :stroke-width="2.2" />
    {{ meta.label }}
  </span>
</template>
