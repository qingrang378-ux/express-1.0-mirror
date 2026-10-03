<script setup lang="ts">
/**
 * @file LoadingSkeleton.vue
 * 文件作用：加载态骨架屏，支持三种布局：
 * - card：卡片段落（详情页 / 表单加载）
 * - table：表格行（列表页加载）
 * - timeline：时间线（工单沟通记录加载）
 * 统一脉冲动画，颜色为低透明白，贴合深色玻璃风格。
 */
import { computed } from 'vue';

interface Props {
  /** 骨架行数（表格 / 时间线 / 卡片条数） */
  rows?: number;
  /** 骨架类型 */
  type?: 'card' | 'table' | 'timeline';
}
const props = withDefaults(defineProps<Props>(), {
  rows: 3,
  type: 'card',
});

/** v-for 用的稳定数组 */
const rowKeys = computed(() => Array.from({ length: props.rows }, (_, i) => i));
</script>

<template>
  <div role="status" aria-label="加载中" class="animate-shimmer">
    <!-- 卡片型 -->
    <div v-if="type === 'card'" class="space-y-4">
      <div
        v-for="key in rowKeys"
        :key="key"
        class="glass rounded-2xl p-5"
      >
        <div class="mb-3 h-4 w-1/3 rounded bg-fill-2" />
        <div class="mb-2 h-3 w-full rounded bg-fill-2" />
        <div class="mb-2 h-3 w-5/6 rounded bg-fill-2" />
        <div class="h-3 w-2/3 rounded bg-fill-2" />
      </div>
    </div>

    <!-- 表格型 -->
    <div v-else-if="type === 'table'" class="glass overflow-hidden rounded-2xl">
      <!-- 表头 -->
      <div class="flex items-center gap-4 border-b border-edge-faint px-4 py-3">
        <div class="h-3 w-1/4 rounded bg-fill-3" />
        <div class="h-3 w-1/5 rounded bg-fill-3" />
        <div class="h-3 w-1/6 rounded bg-fill-3" />
        <div class="ml-auto h-3 w-16 rounded bg-fill-3" />
      </div>
      <!-- 数据行 -->
      <div
        v-for="key in rowKeys"
        :key="key"
        class="flex items-center gap-4 border-b border-edge-faint px-4 py-3.5 last:border-b-0"
      >
        <div class="h-3 w-1/4 rounded bg-fill-2" />
        <div class="h-3 w-1/5 rounded bg-fill-2" />
        <div class="h-3 w-1/6 rounded bg-fill-2" />
        <div class="ml-auto h-5 w-14 rounded-full bg-fill-2" />
      </div>
    </div>

    <!-- 时间线型 -->
    <div v-else class="space-y-4">
      <div
        v-for="key in rowKeys"
        :key="key"
        class="relative flex gap-3 pl-1"
      >
        <div class="mt-1 h-3 w-3 shrink-0 rounded-full bg-fill-3" />
        <div class="glass-inner flex-1 p-3">
          <div class="mb-2 h-3 w-1/4 rounded bg-fill-2" />
          <div class="mb-1.5 h-3 w-full rounded bg-fill-2" />
          <div class="h-3 w-4/5 rounded bg-fill-2" />
        </div>
      </div>
    </div>

    <!-- 仅供读屏器 -->
    <span class="sr-only">正在加载...</span>
  </div>
</template>
