<script setup lang="ts">
/**
 * @file GlassCard.vue
 * 文件作用：玻璃拟态卡片【容器组件】。
 * 提供半透明玻璃底 + 低透明描边 + backdrop-blur，可选霓虹外发光，
 * 通过 header / default / footer 三个插槽组合任意业务内容。
 */
import { useSlots } from 'vue';

interface Props {
  /** 内边距（传 Tailwind padding 类，如 'p-6'） */
  padding?: string;
  /** 是否开启霓虹外发光 */
  glow?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'p-5',
  glow: false,
});

// 用于模板中判断插槽是否存在，避免渲染空的 header/footer 分割线
const slots = useSlots();
</script>

<template>
  <section
    class="glass rounded-2xl transition-all duration-200"
    :class="[props.padding, props.glow ? 'shadow-neon' : '']"
  >
    <header
      v-if="slots.header"
      class="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3"
    >
      <slot name="header" />
    </header>

    <!-- 默认插槽：卡片主体 -->
    <slot />

    <footer
      v-if="slots.footer"
      class="mt-4 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>
