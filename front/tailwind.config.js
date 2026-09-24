/**
 * Tailwind CSS 配置
 * 作用：定义“深空底 + 霓虹强调 + 玻璃拟态”的科技感设计令牌（颜色 / 字体 / 阴影 / 动效），
 * 供全部公共组件与业务页面以原子类方式消费。
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深空底色
        ink: {
          900: '#0A0E1A',
          800: '#111827',
          700: '#1a2234',
        },
        // 品牌主色：电光蓝
        brand: {
          DEFAULT: '#00E5FF',
          soft: 'rgba(0, 229, 255, 0.12)',
        },
        // 次色：紫罗兰
        accent: {
          DEFAULT: '#8B5CF6',
          soft: 'rgba(139, 92, 246, 0.12)',
        },
        // 语义色
        success: '#22C55E',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        // Inter 优先，缺失时回退系统无衬线
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
        // 数字 / 时间使用等宽字体增强科技感
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        // 统一圆角 12px~16px
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        // 霓虹色低透明度外发光
        neon: '0 0 24px rgba(0, 229, 255, 0.15)',
        'neon-hover': '0 0 32px rgba(0, 229, 255, 0.28)',
        'neon-violet': '0 0 24px rgba(139, 92, 246, 0.2)',
        'neon-danger': '0 0 24px rgba(239, 68, 68, 0.2)',
        'neon-warn': '0 0 24px rgba(245, 158, 11, 0.2)',
      },
      transitionDuration: {
        // 状态切换统一 200ms
        DEFAULT: '200ms',
      },
      keyframes: {
        // 骨架屏微光
        shimmer: {
          '0%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
          '100%': { opacity: '0.4' },
        },
        // 超时光晕脉冲
        'pulse-danger': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(239, 68, 68, 0.25)' },
          '50%': { boxShadow: '0 0 22px rgba(239, 68, 68, 0.55)' },
        },
        // 弹窗进入
        'dialog-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'pulse-danger': 'pulse-danger 1.6s ease-in-out infinite',
        'dialog-in': 'dialog-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
