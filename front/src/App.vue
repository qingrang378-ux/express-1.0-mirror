<script setup lang="ts">
/**
 * 根组件
 * 作用：承载路由出口；全局背景（深空渐变 + 网格光斑）由 main.css 的 body 层统一提供。
 * 本阶段不包含业务布局（导航栏 / 侧边栏在后续阶段补齐）。
 */
</script>

<template>
  <div class="relative z-[1] min-h-screen">
    <RouterView />
  </div>
</template>
