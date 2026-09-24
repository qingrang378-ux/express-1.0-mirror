/**
 * 应用入口
 * 作用：创建 Vue 应用并集中装配 Pinia / Vue Router / 全局样式。
 * 阶段 2 起样式链路为 Tailwind CSS（无重型 UI 库），图标统一使用 lucide-vue-next，
 * 业务页面在后续阶段按路由表逐个接入。
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { router } from './router';
import './assets/styles/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
