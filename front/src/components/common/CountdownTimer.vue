<script setup lang="ts">
/**
 * @file CountdownTimer.vue
 * 文件作用：工单处理期限倒计时（deadlineAt ISO 字符串）。
 * - 每秒刷新；剩余超过 warningThreshold 显示中性/主色
 * - 进入警告窗口（默认 24h）显示橙色
 * - 超时后红色脉冲，文案变为“已超时”
 * 数字使用等宽字体增强科技感。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { AlarmClock, Hourglass, Timer } from 'lucide-vue-next';

interface Props {
  /** 截止时间 ISO 字符串 */
  deadlineAt: string;
  /** 警告阈值（毫秒），剩余时间低于该值进入 WARNING，默认 24 小时 */
  warningThreshold?: number;
}
const props = withDefaults(defineProps<Props>(), {
  warningThreshold: 24 * 60 * 60 * 1000,
});

/** 当前时间戳，每秒推进 */
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

/** 截止时间戳（非法日期返回 null） */
const deadlineTs = computed<number | null>(() => {
  const t = new Date(props.deadlineAt).getTime();
  return Number.isNaN(t) ? null : t;
});

/** 剩余毫秒 */
const remain = computed<number>(() => (deadlineTs.value === null ? 0 : deadlineTs.value - now.value));
const isOverdue = computed(() => deadlineTs.value !== null && remain.value <= 0);
const isWarning = computed(() => !isOverdue.value && remain.value < props.warningThreshold);

/** 两位数补零 */
function pad(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/** 展示文案：大于 1 天带“天”，否则 HH:MM:SS */
const display = computed<string>(() => {
  if (deadlineTs.value === null) return '--:--:--';
  const ms = Math.abs(remain.value);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return days > 0
    ? `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
});

/** 三种视觉状态 */
const tone = computed(() => {
  if (isOverdue.value) {
    return {
      box: 'border-danger/50 bg-danger/10 text-danger shadow-neon-danger',
      icon: AlarmClock,
      label: '已超时',
    };
  }
  if (isWarning.value) {
    return {
      box: 'border-warn/40 bg-warn/10 text-warn animate-breathe-warn',
      icon: Hourglass,
      label: '剩余',
    };
  }
  return { box: 'border-brand/30 bg-brand/[0.07] text-brand', icon: Timer, label: '剩余' };
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
    :class="tone.box"
    :title="`截止时间：${deadlineAt}`"
  >
    <component :is="tone.icon" :size="13" :stroke-width="2.2" />
    <span>{{ tone.label }}</span>
    <span class="num tracking-wide">{{ display }}</span>
  </span>
</template>
