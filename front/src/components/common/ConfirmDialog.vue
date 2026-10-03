<script setup lang="ts">
/**
 * @file ConfirmDialog.vue
 * 文件作用：危险 / 关键操作确认弹窗（玻璃拟态 Modal）。
 * 用于关闭工单、确认提交处理结果、客户不认可等需要二次确认的操作。
 *
 * 状态支持：
 * - visible 受控显隐（支持 v-model:visible）
 * - loading=true 时确认按钮显示旋转图标并禁用，同时禁用取消与遮罩关闭，防重复提交
 * - danger=true 使用红色危险样式
 * 透传 Teleport 到 body，ESC / 点击遮罩触发取消。
 */
import { onBeforeUnmount, watch } from 'vue';
import { RefreshCw, TriangleAlert } from 'lucide-vue-next';

interface Props {
  /** 是否可见（支持 v-model:visible） */
  visible: boolean;
  /** 弹窗标题 */
  title: string;
  /** 正文内容 */
  content: string;
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 确认中（按钮 loading + 全弹窗禁用） */
  loading?: boolean;
  /** 是否危险操作（红色风格） */
  danger?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
  confirmText: '确认',
  cancelText: '取消',
  loading: false,
  danger: false,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  confirm: [];
  cancel: [];
}>();

function close(): void {
  emit('update:visible', false);
}

function handleConfirm(): void {
  if (props.loading) return;
  emit('confirm');
}

function handleCancel(): void {
  if (props.loading) return;
  emit('cancel');
  close();
}

/** ESC 关闭（loading 时忽略） */
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && props.visible && !props.loading) {
    handleCancel();
  }
}

watch(
  () => props.visible,
  (val) => {
    // 打开时锁滚动、注册 ESC；关闭时还原
    if (val) {
      document.addEventListener('keydown', onKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = '';
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <!-- 遮罩 -->
        <div
          class="absolute inset-0 bg-overlay backdrop-blur-sm"
          @click="handleCancel"
        />

        <!-- 弹窗主体（规范 §2.7：双层半透明模糊 + 顶部青蓝发光细边） -->
        <div class="modal-hud animate-dialog-in w-full max-w-md p-6">
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
              :class="
                danger
                  ? 'border-danger/40 bg-danger/10 text-danger'
                  : 'border-warn/40 bg-warn/10 text-warn'
              "
            >
              <TriangleAlert :size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-semibold text-gray-100">{{ title }}</h3>
              <p class="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-gray-400">
                {{ content }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              class="btn btn-md btn-text"
              :disabled="loading"
              @click="handleCancel"
            >
              {{ cancelText }}
            </button>
            <button
              type="button"
              :class="danger ? 'btn btn-md btn-danger' : 'btn btn-md btn-primary'"
              :disabled="loading"
              @click="handleConfirm"
            >
              <RefreshCw v-if="loading" :size="15" class="animate-spin" />
              {{ loading ? '处理中...' : confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 遮罩 + 弹窗淡入淡出（主体进入另用 animate-dialog-in） */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 200ms ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
</style>
