<script setup lang="ts">
/**
 * @file PlaceholderView.vue
 * 文件作用：阶段 2 脚手架占位视图（不是业务页面）。
 * 完整路由表在阶段 2 已建好，但业务页面阶段 3 才实现；为保证 dev 可运行、
 * vue-tsc 可通过，所有路由先统一渲染该组件，展示对应页面的中文标题。
 * 阶段 3 将各路由 component 替换为真实 View 后，本文件可删除。
 */
import { Construction } from 'lucide-vue-next';
import GlassCard from '@/components/common/GlassCard.vue';
import EmptyState from '@/components/common/EmptyState.vue';

interface Props {
  /** 来自路由 meta.title 的页面标题 */
  title?: string;
}
defineProps<Props>();
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-20">
    <GlassCard glow padding="p-8">
      <template #header>
        <span class="text-sm font-medium text-gray-300">{{ title || '页面建设中' }}</span>
        <span class="num rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] text-brand">
          PHASE 2
        </span>
      </template>

      <EmptyState
        :title="title || '页面建设中'"
        description="路由、权限守卫、Pinia Store、API 层与公共组件已就绪，业务页面将在下一阶段实现。"
      >
        <template #icon>
          <Construction :size="26" :stroke-width="1.8" />
        </template>
      </EmptyState>
    </GlassCard>
  </div>
</template>
