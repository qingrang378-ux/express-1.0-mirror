import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 读取 .env.development 中的变量（VITE_API_TARGET 等）
    const env = loadEnv(mode, process.cwd(), '');
    // 后端服务地址，默认指向本地 Spring Boot 端口
    const apiTarget = env.VITE_API_TARGET || 'http://localhost:8080';
    return {
        plugins: [vue()],
        resolve: {
            alias: {
                // @ 指向 src 目录，便于绝对路径导入
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            port: 5173,
            host: true,
            proxy: {
                // 将所有以 /api 开头的请求转发到后端，解决开发态跨域
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    // 不做路径重写：后端期望接收 /api/v1/... 形式的完整路径
                    // 前端 axios baseURL = '/api/v1'，最终请求 = /api/v1/customer/waybills
                    // 代理后 = http://localhost:8080/api/v1/customer/waybills
                },
            },
        },
    };
});
