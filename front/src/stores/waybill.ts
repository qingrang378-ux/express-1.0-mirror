/**
 * @file stores/waybill.ts
 * 文件作用：运单 Store（useWaybillStore）。
 * 管理运单列表（游标分页）、运单详情、物流轨迹三类数据，
 * 并为页面暴露六种状态所需的 loading / error / 空数据判定。
 */
import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  getMyWaybills,
  getWaybillDetail,
  getWaybillTracks,
} from '@/api/waybill';
import type {
  CursorPageRequest,
  CursorPageResponse,
  TrackRecord,
  WaybillBrief,
  WaybillDetail,
} from '@/api/api-contracts';

/** 从未知异常中提取可读消息（拦截器已做全局提示，这里仅供页面失败态展示） */
function pickMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useWaybillStore = defineStore('waybill', () => {
  /* ------------------------------- state ------------------------------- */
  /** 运单列表分页数据 */
  const waybillPage = ref<CursorPageResponse<WaybillBrief> | null>(null);
  /** 当前运单详情 */
  const currentWaybill = ref<WaybillDetail | null>(null);
  /** 当前运单轨迹 */
  const tracks = ref<TrackRecord[]>([]);

  /** 各动作独立的加载标记（列表 / 详情 / 轨迹） */
  const loading = reactive({
    list: false,
    detail: false,
    tracks: false,
  });
  /** 最近一次错误信息（成功时置空），供页面失败态展示 */
  const error = ref<string | null>(null);

  /* ------------------------------ getters ------------------------------ */
  /** 列表数据（无数据时为空数组，页面据此渲染空态） */
  const waybillList = computed<WaybillBrief[]>(() => waybillPage.value?.items ?? []);
  const hasMore = computed<boolean>(() => waybillPage.value?.hasMore ?? false);
  const nextCursor = computed<string | null>(() => waybillPage.value?.nextCursor ?? null);
  const isListEmpty = computed(() => !loading.list && waybillList.value.length === 0);

  /* ------------------------------ actions ------------------------------ */

  /** 查询本人运单列表（首页传空 cursor，翻页传上一页 nextCursor） */
  async function fetchWaybills(params?: CursorPageRequest): Promise<void> {
    loading.list = true;
    error.value = null;
    try {
      waybillPage.value = await getMyWaybills(params);
    } catch (err) {
      error.value = pickMessage(err, '运单列表加载失败');
      throw err;
    } finally {
      loading.list = false;
    }
  }

  /** 查询运单详情与轨迹（不存在 / 非本人运单，后端返回 40400） */
  async function fetchWaybillDetail(waybillNo: string): Promise<void> {
    loading.detail = true;
    error.value = null;
    try {
      currentWaybill.value = await getWaybillDetail(waybillNo);
      // 详情自带 tracks，同步填充，避免重复请求
      tracks.value = currentWaybill.value.tracks;
    } catch (err) {
      error.value = pickMessage(err, '运单详情加载失败');
      throw err;
    } finally {
      loading.detail = false;
    }
  }

  /** 单独查询运单轨迹列表 */
  async function fetchTracks(waybillNo: string): Promise<void> {
    loading.tracks = true;
    error.value = null;
    try {
      tracks.value = await getWaybillTracks(waybillNo);
    } catch (err) {
      error.value = pickMessage(err, '物流轨迹加载失败');
      throw err;
    } finally {
      loading.tracks = false;
    }
  }

  /** 重置当前查看的运单（离开详情页时调用） */
  function resetCurrent(): void {
    currentWaybill.value = null;
    tracks.value = [];
    error.value = null;
  }

  return {
    // state
    waybillPage,
    currentWaybill,
    tracks,
    loading,
    error,
    // getters
    waybillList,
    hasMore,
    nextCursor,
    isListEmpty,
    // actions
    fetchWaybills,
    fetchWaybillDetail,
    fetchTracks,
    resetCurrent,
  };
});
