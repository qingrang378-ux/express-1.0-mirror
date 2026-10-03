/**
 * Tailwind CSS 配置
 * 作用：落地《快递异常件处理系统｜科幻 HUD 风格 Figma 组件设计规范》§1 全局设计变量，
 * 供全部公共组件与业务页面以原子类方式消费。
 * 约束（规范 §1.1 / §6）：单主色 + 四级状态色，色值、字号、圆角、间距、光影全部走令牌，
 * 禁止组件内自定义颜色与硬编码数值。
 * 主题：亮色版（在规范暗色 HUD 基调上反转明度层级，保留青蓝主色与光影结构）。
 */
/** @type {import('tailwindcss').Config} */

/** 规范 §1.2：字重只允许 600/400/300 */
const fontWeights = {
  light: '300',
  normal: '400',
  semibold: '600',
};

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    fontWeight: fontWeights,
    extend: {
      colors: {
        // 页面底色（亮色基调 #F4F7FA）；800/700 为卡片外/内层的不透明近似值。
        // 注意：ring-ink-900 / bg-ink-900 等类名沿用，值即「页面底色」，时间线节点描边等仍正确。
        ink: {
          DEFAULT: '#F4F7FA',
          900: '#F4F7FA',
          800: '#FFFFFF',
          700: '#EDF1F6',
        },
        // 卡片双层表面：外层白色半透 + blur 6px + 细青蓝描边；内层浅灰蓝、无描边
        panel: {
          DEFAULT: 'rgba(255, 255, 255, 0.78)',
          inner: 'rgba(238, 243, 248, 0.92)',
        },
        // 主色：科技青蓝（亮色下压深，保证与白底 ≥ 4.5:1 对比度）
        brand: {
          DEFAULT: '#0B7C93',
          soft: 'rgba(11, 124, 147, 0.10)',
        },
        // 四级状态色（亮色底上加深，保持色相不变）
        success: '#0E8A5F',
        warn: '#B87400',
        danger: '#D92D3F',
        // 描边令牌：基础细边 1px，faint 用于分割线/表头，strong 用于 hover
        edge: {
          DEFAULT: 'rgba(23, 111, 133, 0.18)',
          faint: 'rgba(23, 111, 133, 0.10)',
          strong: 'rgba(23, 111, 133, 0.34)',
        },
        // 填充令牌：统一为主色极低透三层（亮色下即浅青底）
        fill: {
          1: 'rgba(11, 124, 147, 0.05)',
          2: 'rgba(11, 124, 147, 0.09)',
          3: 'rgba(11, 124, 147, 0.16)',
        },
        // 文字三级：色阶语义在亮色主题下整体反转 —— 小数字仍是「贴近底色的弱文字」，
        // 大数字是「高对比主文字」，历史 text-gray-* 类名无需重命名即可正确落档
        gray: {
          100: '#0F1B24',
          200: '#0F1B24',
          300: '#33424E',
          400: '#64748B',
          500: '#64748B',
          600: '#94A3B8',
          700: '#C6D0DA',
          800: '#E3E9F0',
          900: '#EEF2F7',
        },
        // 占位文字（最低视觉层级，§2.2 输入框占位、空数据提示专用）
        hint: 'rgba(15, 27, 36, 0.35)',
        // 弹窗遮罩（亮色主题专用：深色半透 + 背景模糊）
        overlay: 'rgba(15, 27, 36, 0.45)',
      },
      fontFamily: {
        // 中文思源黑体（Noto Sans SC 为同一字族的 Web 名），缺失时回退系统无衬线
        sans: [
          'Noto Sans SC',
          'Source Han Sans SC',
          'PingFang SC',
          'Microsoft YaHei',
          'system-ui',
          'sans-serif',
        ],
        // 数字 / 英文 / 编号统一等宽科幻字体
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // 规范 §1.2 五档；text-xs(12/16)、text-sm(14/20) 与辅助/正文档数值一致，沿用默认类名
        micro: ['10px', '14px'],
        module: ['18px', '24px'],
        page: ['24px', '32px'],
      },
      borderRadius: {
        // 规范 §1.3：基础组件 4px、大卡片 8px、弹窗 10px（拒绝大圆角）
        DEFAULT: '4px',
        sm: '4px',
        md: '4px',
        lg: '4px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
        dialog: '10px',
      },
      spacing: {
        // 规范 §1.3 六档固定间距；覆盖 Tailwind 的 0.5/1.5/2.5/3.5/5/7 等越档值，
        // 使历史类名落到最近的规范档位
        0.5: '4px',
        1.5: '8px',
        2.5: '8px',
        3.5: '16px',
        5: '24px',
        7: '32px',
        9: '32px',
        10: '32px',
      },
      boxShadow: {
        // 规范 §1.4 光影在亮色主题下的等价物：外发光改为柔和同色外环（focus / 激活态）
        neon: '0 0 0 3px rgba(11, 124, 147, 0.16)',
        'neon-hover': '0 0 0 4px rgba(11, 124, 147, 0.20)',
        'neon-danger': '0 0 0 3px rgba(217, 45, 63, 0.16)',
        'neon-warn': '0 0 0 3px rgba(184, 116, 0, 0.16)',
        'neon-success': '0 0 0 3px rgba(14, 138, 95, 0.14)',
        // 卡片投影（亮色主题下玻璃质感靠阴影而非发光）
        card: '0 1px 2px rgba(15, 27, 36, 0.06), 0 6px 20px rgba(15, 27, 36, 0.06)',
        // 规范 §2.6：选中页签底部 2px 青蓝线条（亮色改为向下淡投影）
        'tab-line': '0 1px 4px rgba(11, 124, 147, 0.35)',
        // 规范 §2.5：表格行 hover 左侧 4px 青色标记竖线
        'row-marker': 'inset 4px 0 0 0 #0B7C93',
        // 规范 §2.7：弹窗顶部青蓝发光细边（视觉聚焦）
        'modal-top': '0 0 10px rgba(11, 124, 147, 0.35)',
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
        // 警告色呼吸（规范 §1.1/§1.4：2.5s 匀速，仅「即将超时 / 待处理 / 待确认 / 待办数字」使用）
        // 亮色主题下以同色外环的扩散/收敛表达呼吸
        'breathe-warn': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(184, 116, 0, 0.12)' },
          '50%': { boxShadow: '0 0 0 4px rgba(184, 116, 0, 0.18)' },
        },
        // 危险色（异常/超时）按规范为「恒定柔和外发光」，不做闪烁，故只保留静态 shadow-neon-danger
        // 页面卡片渐入上浮（规范 §5.1 允许动效）
        'enter-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // 弹窗进入：渐入 + 轻微上浮
        'dialog-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.4s ease-in-out infinite',
        'breathe-warn': 'breathe-warn 2.5s linear infinite',
        'enter-up': 'enter-up 240ms ease-out both',
        'dialog-in': 'dialog-in 200ms ease-out',
      },
    },
  },
  plugins: [],
};
