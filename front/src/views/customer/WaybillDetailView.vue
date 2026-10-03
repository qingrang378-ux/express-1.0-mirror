<script setup lang="ts">
/**
 * @file WaybillDetailView.vue
 * 文件作用：客户运单详情页（/customer/waybills/:waybillNo）。
 * 展示运单基本信息（姓名/电话脱敏）与物流轨迹垂直时间线，提供提交异常反馈入口。
 * 运单不存在或不属于当前客户（40400）：整页只显示“运单不存在或无权查看”，不渲染任何详情。
 */
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Truck,
} from 'lucide-vue-next';
import AppHeader from '@/components/layout/AppHeader.vue';
import GlassCard from '@/components/common/GlassCard.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue';
import { useWaybillStore } from '@/stores/waybill';
import {
  NODE_TYPE_LABELS,
  WAYBILL_STATUS_LABELS,
  WAYBILL_STATUS_TONES,
  formatDateTime,
  maskName,
  maskPhone,
} from '@/utils/display';
import type { NodeType, TrackRecord, TransportNode } from '@/api/api-contracts';

const route = useRoute();
const router = useRouter();
const waybillStore = useWaybillStore();

const waybillNo = String(route.params.waybillNo ?? '');

const detail = computed(() => waybillStore.currentWaybill);
/** 加载失败（40400 等）：整页失败态 */
const loadFailed = computed(
  () => !!waybillStore.error && !waybillStore.loading.detail && !detail.value,
);

/** 节点类型 → 图标映射 */
const NODE_ICONS: Record<NodeType, typeof Package> = {
  PICKUP: Package,
  TRANSIT: RefreshCw,
  ARRIVAL: MapPin,
  DELIVERY: Truck,
  SIGNED: CheckCircle2,
};

/** nodeId → 节点信息索引，用于轨迹补充节点类型与地点 */
const nodeIndex = computed<Map<number, TransportNode>>(() => {
  const map = new Map<number, TransportNode>();
  detail.value?.nodes.forEach((n) => map.set(n.id, n));
  return map;
});

/**
 * 组装展示用轨迹：TrackRecord 关联 TransportNode。
 * 按发生时间倒序展示（最新在前，最新节点高亮发光）。
 */
interface TimelineItem {
  key: string;
  nodeType: NodeType | null;
  location: string;
  content: string;
  occurredAt: string;
}
const timeline = computed<TimelineItem[]>(() => {
  if (!detail.value) return [];
  const items: TimelineItem[] = detail.value.tracks.map((t: TrackRecord) => {
    const node = nodeIndex.value.get(t.nodeId);
    return {
      key: `track-${t.id}`,
      nodeType: node?.nodeType ?? null,
      location: node?.location ?? '',
      content: t.content || node?.description || '',
      occurredAt: t.occurredAt,
    };
  });
  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
});

onMounted(async () => {
  waybillStore.resetCurrent();
  try {
    await waybillStore.fetchWaybillDetail(waybillNo);
  } catch {
    /* 40400 时 store.error 有值，整页渲染失败态，拦截器已弹模糊提示 */
  }
});

function goBack(): void {
  router.push('/customer/waybills');
}

function goFeedback(): void {
  router.push(`/customer/waybills/${encodeURIComponent(waybillNo)}/feedback`);
}
</script>

<template>
  <div class="min-h-screen pb-24">
    <AppHeader />

    <main class="mx-auto w-full max-w-4xl px-4 py-6">
      <!-- 顶部：返回 + 运单号 + 状态 -->
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-sm btn-text btn-icon" @click="goBack">
          <ArrowLeft :size="15" />
        </button>
        <template v-if="detail">
          <h1 class="num text-module font-semibold text-gray-100">{{ detail.waybillNo }}</h1>
          <span
            class="rounded-full border px-2.5 py-0.5 text-xs"
            :class="WAYBILL_STATUS_TONES[detail.status]"
          >
            {{ WAYBILL_STATUS_LABELS[detail.status] }}
          </span>
        </template>
        <h1 v-else class="text-module font-semibold text-gray-100">运单详情</h1>
      </div>

      <!-- 加载态 -->
      <LoadingSkeleton v-if="waybillStore.loading.detail" type="card" :rows="2" />

      <!-- 失败态（不存在 / 非本人运单）：不渲染任何详情数据 -->
      <GlassCard v-else-if="loadFailed" padding="p-8">
        <EmptyState
          danger
          title="运单不存在或无权查看"
          description="请确认运单号是否正确，该运单可能不属于当前账号"
          action-text="返回运单查询"
          @action="goBack"
        />
      </GlassCard>

      <template v-else-if="detail">
        <!-- 运单信息卡 -->
        <GlassCard padding="p-5" class="mb-5">
          <template #header>
            <span class="card-title">运单信息</span>
          </template>

          <div class="grid gap-4 sm:grid-cols-2">
            <!-- 发件人 -->
            <div class="glass-inner p-4">
              <p class="mb-2 text-xs text-gray-500">发件人</p>
              <p class="text-sm text-gray-200">{{ maskName(detail.senderName) }}</p>
              <p class="num mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                <Phone :size="12" />
                {{ maskPhone(detail.senderPhone) }}
              </p>
              <p class="mt-1 flex items-start gap-1.5 text-xs leading-5 text-gray-400">
                <MapPin :size="12" class="mt-0.5 shrink-0" />
                {{ detail.senderAddress }}
              </p>
            </div>

            <!-- 收件人 -->
            <div class="glass-inner p-4">
              <p class="mb-2 text-xs text-gray-500">收件人</p>
              <p class="text-sm text-gray-200">{{ maskName(detail.receiverName) }}</p>
              <p class="num mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                <Phone :size="12" />
                {{ maskPhone(detail.receiverPhone) }}
              </p>
              <p class="mt-1 flex items-start gap-1.5 text-xs leading-5 text-gray-400">
                <MapPin :size="12" class="mt-0.5 shrink-0" />
                {{ detail.receiverAddress }}
              </p>
            </div>
          </div>

          <div class="num mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-edge-faint pt-3 text-xs text-gray-500">
            <span>创建时间：{{ formatDateTime(detail.createdAt) }}</span>
            <span>更新时间：{{ formatDateTime(detail.updatedAt) }}</span>
          </div>
        </GlassCard>

        <!-- 轨迹时间线 -->
        <GlassCard padding="p-5">
          <template #header>
            <span class="card-title">物流轨迹</span>
          </template>

          <EmptyState
            v-if="timeline.length === 0"
            title="暂无轨迹记录"
            description="运单物流节点产生后将在此展示"
          />

          <ol
            v-else
            class="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1.5rem)] before:w-px before:bg-gradient-to-b before:from-brand/40 before:to-edge-faint"
          >
            <li
              v-for="(item, index) in timeline"
              :key="item.key"
              class="relative pl-12"
            >
              <!-- 节点图标（最新节点高亮发光） -->
              <span
                class="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border ring-4 ring-ink-900 transition-all duration-200"
                :class="
                  index === 0
                    ? 'border-brand/60 bg-brand/15 text-brand shadow-neon'
                    : 'border-edge bg-fill-2 text-gray-400'
                "
              >
                <component :is="item.nodeType ? NODE_ICONS[item.nodeType] : MapPin" :size="15" />
              </span>

              <div
                class="glass-inner p-3"
                :class="index === 0 ? 'border border-brand/25 shadow-neon' : ''"
              >
                <div class="flex flex-wrap items-center gap-2 text-xs">
                  <span v-if="item.nodeType" class="font-semibold" :class="index === 0 ? 'text-brand' : 'text-gray-300'">
                    {{ NODE_TYPE_LABELS[item.nodeType] }}
                  </span>
                  <span v-if="item.location" class="inline-flex items-center gap-1 text-gray-400">
                    <MapPin :size="11" />
                    {{ item.location }}
                  </span>
                  <span v-if="index === 0" class="rounded-full border border-brand/30 bg-brand/10 px-1.5 py-px text-micro text-brand">
                    最新
                  </span>
                  <span class="num ml-auto text-gray-500">{{ formatDateTime(item.occurredAt) }}</span>
                </div>
                <p class="mt-1.5 text-sm leading-6 text-gray-300">{{ item.content }}</p>
              </div>
            </li>
          </ol>
        </GlassCard>
      </template>
    </main>

    <!-- 底部固定操作区（详情加载成功才显示） -->
    <div
      v-if="detail"
      class="glass fixed inset-x-0 bottom-0 z-30 flex items-center justify-end gap-3 rounded-none border-b-0 border-x-0 px-4 py-3 sm:px-6"
    >
      <button type="button" class="btn btn-md btn-text" @click="goBack">
        <ArrowLeft :size="15" />
        返回
      </button>
      <button type="button" class="btn btn-md btn-primary" @click="goFeedback">
        提交异常反馈
        <ArrowRight :size="15" />
      </button>
    </div>
  </div>
</template>
