/**
 * PostCSS 配置
 * 作用：为 Vite 接入 Tailwind CSS 与 Autoprefixer。
 * package.json 已声明 "type": "module"，因此使用 ESM 导出。
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
