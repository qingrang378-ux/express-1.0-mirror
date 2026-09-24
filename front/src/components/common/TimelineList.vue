<script setup lang="ts">
/**
 * @file TimelineList.vue
 * 文件作用：工单沟通记录时间线（TicketCommunication[]）。
 * - 按角色着色：客户=电光蓝，客服=紫罗兰，运营=琥珀
 * - INTERNAL_ONLY 记录整条使用灰色虚线描边 + 锁标识，与对外记录明确区分
 * - 内置加载（骨架屏）与空数据两种状态；禁用态由父级通过数据/权限控制
 */
import { computed } from 'vue';
import { Headset, User, Wrench } from 'lucide-vue-next';
import type { Communication, CommunicationRole } from '@/api/api-contracts';
import EmptyState from './EmptyState.vue';
import LoadingSkeleton from './LoadingSkeleton.vue';
import VisibilityTag from './VisibilityTag.vue';

interface Props {
  /** 沟通记录列表（后端已按时间排序） */
  records: Communication[];
  /** 加载中：渲染时间线骨架屏 */
  loading?: boolean;
  /** 空数据标题文案 */
  emptyTitle?: string;
  /** 空数据描述文案 */
  emptyDescription?: string;
}
const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyTitle: '暂无沟通记录',
  emptyDescription: '',
});

/** 角色元信息：标签 + 图标 + 节点配色 */
const ROLE_META: Record<CommunicationRole, { label: string; icon: typeof User; dot: string; text: string }> = {
  CUSTOMER: { label: '客户', icon: User, dot: 'bg-brand shadow-neon', text: 'text-brand' },
  CS: { label: '客服', icon: Headset, dot: 'bg-accent shadow-neon-violet', text: 'text-accent' },
  OPS: { label: '运营', icon: Wrench, dot: 'bg-warn shadow-neon-warn', text: 'text-warn' },
};

const isEmpty = computed(() => !props.loading && props.records.length === 0);

/** ISO 时间 → 本地化展示（数字等宽） */
function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false });
}
</script>

<template>
  <!-- 加载态 -->
  <LoadingSkeleton v-if="loading" type="timeline" :rows="4" />

  <!-- 空数据态 -->
    <EmptyState
      v-else-if="isEmpty"
      :title="emptyTitle"
      :description="emptyDescription || '后续产生的沟通与处理记录将展示在这里'"
    />

  <!-- 成功态：时间线 -->
  <ol v-else class="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/[0.08]">
    <li
      v-for="record in records"
      :key="record.id"
      class="relative pl-7"
    >
      <!-- 时间线节点 -->
      <span
        class="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-ink-900"
        :class="ROLE_META[record.role].dot"
      />

      <div
        class="rounded-xl p-3 transition-all duration-200"
        :class="
          record.visibility === 'INTERNAL_ONLY'
            ? 'border border-dashed border-gray-500/40 bg-white/[0.02]'
            : 'glass'
        "
      >
        <!-- 元信息行：角色 + 可见性 + 时间 -->
        <div class="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span class="inline-flex items-center gap-1 font-medium" :class="ROLE_META[record.role].text">
            <component :is="ROLE_META[record.role].icon" :size="13" />
            {{ ROLE_META[record.role].label }}
          </span>
          <VisibilityTag :visibility="record.visibility" />
          <span class="num ml-auto text-gray-500">{{ formatTime(record.createdAt) }}</span>
        </div>

        <!-- 正文 -->
        <p
          class="whitespace-pre-wrap break-words text-sm leading-6"
          :class="record.visibility === 'INTERNAL_ONLY' ? 'text-gray-400' : 'text-gray-200'"
        >
          {{ record.content }}
        </p>
      </div>
    </li>
  </ol>
</template>
