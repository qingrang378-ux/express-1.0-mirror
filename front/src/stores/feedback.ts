/**
 * @file stores/feedback.ts
 * 文件作用：异常反馈 Store（useFeedbackStore）。
 * - 客户视角：提交异常反馈、反馈详情
 * - 客服视角：异常反馈池列表（/cs/feedbacks 为阶段 3 页面规格扩展，provisional）
 */
import { reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  createFeedback,
  getCsFeedbackPool,
  getFeedbackDetail,
  type CsFeedbackPoolQuery,
} from '@/api/exception';
import type {
  CreateFeedbackRequest,
  CursorPageResponse,
  ExceptionFeedback,
  FeedbackStatus,
} from '@/api/api-contracts';

function pickMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useFeedbackStore = defineStore('feedback', () => {
  /* ------------------------------- state ------------------------------- */
  /** 当前查看的异常反馈详情 */
  const currentFeedback = ref<ExceptionFeedback | null>(null);
  /** 最近一次提交生成的反馈 id */
  const createdFeedbackId = ref<number | null>(null);

  /** 客服反馈池分页数据与当前状态筛选 */
  const feedbackPoolPage = ref<CursorPageResponse<ExceptionFeedback> | null>(null);
  const poolStatusFilter = ref<FeedbackStatus | 'ALL'>('PENDING_ACCEPT');

  const loading = reactive({
    detail: false,
    submit: false,
    pool: false,
  });
  const error = ref<string | null>(null);

  /* ------------------------------ getters ------------------------------ */
  /** 反馈池当前页列表 */
  const feedbackPool = ref<ExceptionFeedback[]>([]);
  const poolHasMore = ref(false);
  const poolNextCursor = ref<string | null>(null);
  const isPoolEmpty = ref(false);

  /* ------------------------------ actions ------------------------------ */

  /**
   * 提交异常反馈
   * 提交失败时不重置表单（页面层保留已填内容），仅记录错误并向上抛出
   * @returns 新建反馈 id
   */
  async function submitFeedback(data: CreateFeedbackRequest): Promise<number> {
    loading.submit = true;
    error.value = null;
    try {
      const id = await createFeedback(data);
      createdFeedbackId.value = id;
      return id;
    } catch (err) {
      error.value = pickMessage(err, '异常反馈提交失败');
      throw err;
    } finally {
      loading.submit = false;
    }
  }

  /** 查询异常反馈详情 */
  async function fetchFeedbackDetail(id: number): Promise<void> {
    loading.detail = true;
    error.value = null;
    try {
      currentFeedback.value = await getFeedbackDetail(id);
    } catch (err) {
      error.value = pickMessage(err, '反馈详情加载失败');
      throw err;
    } finally {
      loading.detail = false;
    }
  }

  /** 设置反馈池状态筛选（切换胶囊时调用） */
  function setPoolStatusFilter(status: FeedbackStatus | 'ALL'): void {
    poolStatusFilter.value = status;
  }

  /**
   * 查询客服异常反馈池
   * @param params 状态 + 游标分页；首次/切换筛选时不传 cursor
   * @param append 是否追加（加载更多），默认覆盖
   */
  async function fetchFeedbackPool(
    params?: CsFeedbackPoolQuery,
    append = false,
  ): Promise<void> {
    loading.pool = true;
    error.value = null;
    try {
      const page = await getCsFeedbackPool(params);
      feedbackPoolPage.value = page;
      feedbackPool.value = append
        ? [...feedbackPool.value, ...page.items]
        : page.items;
      poolHasMore.value = page.hasMore;
      poolNextCursor.value = page.nextCursor;
      isPoolEmpty.value = feedbackPool.value.length === 0;
    } catch (err) {
      error.value = pickMessage(err, '反馈池加载失败');
      throw err;
    } finally {
      loading.pool = false;
    }
  }

  /** 重置（离开页面 / 表单重新填写时调用） */
  function reset(): void {
    currentFeedback.value = null;
    createdFeedbackId.value = null;
    feedbackPoolPage.value = null;
    feedbackPool.value = [];
    poolHasMore.value = false;
    poolNextCursor.value = null;
    isPoolEmpty.value = false;
    error.value = null;
  }

  return {
    // state
    currentFeedback,
    createdFeedbackId,
    feedbackPoolPage,
    poolStatusFilter,
    feedbackPool,
    poolHasMore,
    poolNextCursor,
    isPoolEmpty,
    loading,
    error,
    // actions
    submitFeedback,
    fetchFeedbackDetail,
    setPoolStatusFilter,
    fetchFeedbackPool,
    reset,
  };
});
