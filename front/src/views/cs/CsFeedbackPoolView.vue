<script setup lang="ts">
/**
 * @file CsFeedbackPoolView.vue
 * 文件作用：客服异常反馈池（/cs/feedbacks）。
 * 按 待受理 / 已转工单 / 已关闭 筛选反馈，待受理反馈可进入「创建工单」流程。
 * 注意：GET /cs/feedbacks 为阶段 3 页面规格扩展接口（provisional，API.md 待补齐）。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { FilePlus2, Loader2 } from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import { useFeedbackStore } from '@/stores/feedback';
import {
  EXCEPTION_TYPE_LABELS,
  FEEDBACK_STATUS_LABELS,
  formatDateTime,
  truncate,
} from '@/utils/display';
import type { FeedbackStatus } from '@/api/api-contracts';

const router = useRouter();
const feedbackStore = useFeedbackStore();

/** 筛选胶囊：固定三项状态 */
const FILTERS: ReadonlyArray<{ value: FeedbackStatus; label: string }> = [
  { value: 'PENDING_ACCEPT', label: '待受理' },
  { value: 'CONVERTED', label: '已转工单' },
  { value: 'CLOSED', label: '已关闭' },
];

/** 加载更多 */
const loadingMore = ref(false);

/** 切换筛选并重新拉取 */
async function changeFilter(status: FeedbackStatus): Promise<void> {
  feedbackStore.setPoolStatusFilter(status);
  await loadList();
}

/** 加载当前筛选的第一页 */
async function loadList(): Promise<void> {
  try {
    await feedbackStore.fetchFeedbackPool(
      { status: feedbackStore.poolStatusFilter as FeedbackStatus, size: 20 },
      false,
    );
  } catch {
    /* 失败态由卡片区渲染 */
  }
}

/** 游标加载更多 */
async function loadMore(): Promise<void> {
  const cursor = feedbackStore.poolNextCursor;
  if (!cursor || loadingMore.value) return;
  loadingMore.value = true;
  try {
    await feedbackStore.fetchFeedbackPool(
      {
        status: feedbackStore.poolStatusFilter as FeedbackStatus,
        cursor,
        size: 20,
      },
      true,
    );
  } catch {
    /* 拦截器已提示 */
  } finally {
    loadingMore.value = false;
  }
}

/** 进入创建工单页 */
function goCreate(feedbackId: number): void {
  router.push({ path: '/cs/tickets/create', query: { feedbackId: String(feedbackId) } });
}

onMounted(loadList);
</script>

<template>
  <div class="min-h-screen">
    <AppHeader />

    <main class="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 class="mb-4 text-2xl font-semibold text-gray-100">异常反馈池</h1>

      <!-- 筛选胶囊 -->
      <div class="mb-5 flex flex-wrap gap-2">
        <button
          v-for="filter in FILTERS"
          :key="filter.value"
          type="button"
          class="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200"
          :class="
            feedbackStore.poolStatusFilter === filter.value
              ? 'border-brand/60 bg-brand/10 text-brand shadow-neon'
              : 'border-white/10 bg-white/[0.03] text-gray-400 hover:border-brand/30 hover:text-gray-200'
          "
          @click="changeFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>

      <!-- 加载态 -->
      <LoadingSkeleton v-if="feedbackStore.loading.pool" type="card" :rows="4" />

      <!-- 失败态 -->
      <GlassCard
        v-else-if="feedbackStore.error && feedbackStore.feedbackPool.length === 0"
        padding="p-8"
      >
        <EmptyState
          danger
          title="反馈池加载失败"
          :description="feedbackStore.error"
          action-text="重新加载"
          @action="loadList"
        />
      </GlassCard>

      <!-- 空数据态 -->
      <GlassCard v-else-if="feedbackStore.isPoolEmpty" padding="p-8">
        <EmptyState
          title="暂无待受理反馈"
          :description="`当前筛选「${FEEDBACK_STATUS_LABELS[feedbackStore.poolStatusFilter as FeedbackStatus] ?? ''}」下没有反馈记录`"
        />
      </GlassCard>

      <!-- 成功态：反馈卡片列表 -->
      <template v-else>
        <div class="space-y-3">
          <GlassCard
            v-for="feedback in feedbackStore.feedbackPool"
            :key="feedback.id"
            padding="p-4"
            class="glass-hover"
          >
            <div class="flex flex-wrap items-start gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="num text-sm font-medium text-gray-100">{{ feedback.waybillNo }}</span>
                  <span class="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
                    {{ EXCEPTION_TYPE_LABELS[feedback.type] }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-gray-400">
                    {{ FEEDBACK_STATUS_LABELS[feedback.status] }}
                  </span>
                </div>
                <p class="mt-2 line-clamp-2 text-sm leading-6 text-gray-300">
                  {{ truncate(feedback.description, 80) }}
                </p>
                <p class="num mt-1.5 text-[11px] text-gray-500">
                  提交时间：{{ formatDateTime(feedback.createdAt) }}
                </p>
              </div>

              <!-- 仅待受理反馈可创建工单，其余禁用 -->
              <button
                type="button"
                class="btn-neon shrink-0 !px-3 !py-1.5 text-xs"
                :disabled="feedback.status !== 'PENDING_ACCEPT'"
                :title="feedback.status !== 'PENDING_ACCEPT' ? '该反馈已处理' : '基于此反馈创建工单'"
                @click="goCreate(feedback.id)"
              >
                <FilePlus2 :size="14" />
                {{ feedback.status === 'PENDING_ACCEPT' ? '创建工单' : '已处理' }}
              </button>
            </div>
          </GlassCard>
        </div>

        <!-- 游标分页 -->
        <div class="mt-5 flex justify-center">
          <button
            v-if="feedbackStore.poolHasMore"
            type="button"
            class="btn-ghost"
            :disabled="loadingMore"
            @click="loadMore"
          >
            <Loader2 v-if="loadingMore" :size="14" class="animate-spin" />
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
          <p v-else class="text-xs text-gray-600">已加载全部反馈</p>
        </div>
      </template>
    </main>
  </div>
</template>
