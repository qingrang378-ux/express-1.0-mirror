<script setup lang="ts">
/**
 * @file VisibilityTag.vue
 * 文件作用：沟通记录可见性标识。
 * - CUSTOMER_VISIBLE：低对比的“客户可见”小标签（可通过 showCustomer 隐藏）
 * - INTERNAL_ONLY：灰色虚线描边 + 锁图标 + “仅内部可见”，明确标识内部记录
 *
 * 权限红线：客户视角页面绝不渲染 INTERNAL_ONLY 记录本身；该标识服务于
 * 客服 / 运营内部页面，帮助区分内部记录与对外记录。
 */
import { computed } from 'vue';
import { Eye, Lock } from 'lucide-vue-next';
import type { Visibility } from '@/api/api-contracts';

interface Props {
  visibility: Visibility;
  /** CUSTOMER_VISIBLE 时是否展示“客户可见”，默认展示 */
  showCustomer?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  showCustomer: true,
});

/** 是否需要渲染（客户可见标签可被隐藏） */
const visible = computed(() => props.visibility === 'INTERNAL_ONLY' || props.showCustomer);
</script>

<template>
  <span v-if="visible">
    <!-- 仅内部可见：灰色虚线描边 + 锁 -->
    <span
      v-if="visibility === 'INTERNAL_ONLY'"
      class="inline-flex items-center gap-1 rounded-md border border-dashed border-gray-500/50 bg-white/[0.02] px-1.5 py-0.5 text-[11px] font-medium leading-4 text-gray-400"
    >
      <Lock :size="11" :stroke-width="2.2" />
      INTERNAL · 仅内部可见
    </span>

    <!-- 客户可见：低对比弱化标签 -->
    <span
      v-else
      class="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.02] px-1.5 py-0.5 text-[11px] font-medium leading-4 text-gray-500"
    >
      <Eye :size="11" :stroke-width="2.2" />
      客户可见
    </span>
  </span>
</template>
