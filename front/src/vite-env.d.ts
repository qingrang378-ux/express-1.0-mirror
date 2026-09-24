/// <reference types="vite/client" />

/**
 * 项目自定义环境变量声明
 * 在 .env.development 中定义，供 vite.config.ts / utils/request.ts 使用
 */
interface ImportMetaEnv {
  /** Axios baseURL，开发态为 /api/v1（走 Vite 代理） */
  readonly VITE_API_BASE_URL: string;
  /** 后端服务地址，仅供 vite.config.ts 代理 target 使用 */
  readonly VITE_API_TARGET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 允许在 TS 中导入 .vue 单文件组件
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
