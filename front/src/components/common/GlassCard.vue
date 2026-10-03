<script setup lang="ts">
/**
 * @file GlassCard.vue
 * 文件作用：HUD 双层玻璃卡片【容器组件】，对应设计规范 §2.4。
 * 外层：半透明底色 + 6px 背景模糊 + 1px 淡青蓝细描边 + 柔和投影（.glass，亮色主题版本）；
 * 卡片本体不参与发光（§0 禁止全局发光泛滥），需要状态强调时由调用方挂状态色 shadow-* 类。
 * 通过 header / default / footer 三个插槽组合任意业务内容。
 */
import { useSlots } from 'vue';

interface Props {
  /** 内边距（传 Tailwind padding 类，如 'p-6'；规范 §1.3：常规 24px、紧凑 16px） */
  padding?: string;
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'p-5',
});

// 用于模板中判断插槽是否存在，避免渲染空的 header/footer 分割线
const slots = useSlots();
</script>

<template>
  <section
    class="glass animate-enter-up rounded-2xl transition-colors duration-200"
    :class="[props.padding]"
  >
    <header
      v-if="slots.header"
      class="mb-4 flex items-center justify-between border-b border-edge-faint pb-3"
    >
      <slot name="header" />
    </header>

    <!-- 默认插槽：卡片主体 -->
    <slot />

    <footer
      v-if="slots.footer"
      class="mt-4 flex items-center justify-end gap-2 border-t border-edge-faint pt-3"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
