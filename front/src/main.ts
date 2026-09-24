/**
 * 应用入口
 * 作用：创建 Vue 应用并集中装配 Pinia / Vue Router / 全局样式。
 * 阶段 2 起样式链路为 Tailwind CSS（无重型 UI 库），图标统一使用 lucide-vue-next，
 * 业务页面在后续阶段按路由表逐个接入。
 *
 * Mock：开发态且 VITE_ENABLE_MOCK=true 时动态加载 src/mock，覆盖 apiClient
 * adapter 返回构造数据，便于在后端未就绪时预览页面。生产构建因条件为静态
 * 字符串判断，mock 模块不会被打包。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { router } from './router';
import './assets/styles/main.css';

/** 应用启动：按需安装 mock 后再挂载 */
async function bootstrap(): Promise<void> {
  // 开发态启用前端 Mock（后端就绪后在 .env.development 改为 false）
  if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
    const { setupMock } = await import('./mock');
    setupMock();
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount('#app');
}

void bootstrap();

