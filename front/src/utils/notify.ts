/**
 * @file notify.ts
 * 文件作用：零依赖的全局轻量通知（Toast）工具。
 * 项目不引入 Element Plus / AntD 等重型 UI 库，而响应拦截器需要在任意 TS 模块中
 * 弹出统一的错误提示，因此这里直接以 DOM + Tailwind 类名创建玻璃拟态通知条，
 * 无需在组件树内挂载 <ToastContainer>。
 *
 * 用法：notify.error('xxx') / notify.success('已保存') / notify.info(...)
 */

export type NotifyType = 'info' | 'success' | 'warn' | 'error';

interface ToastOptions {
  /** 自动关闭毫秒数，默认 3000 */
  duration?: number;
}

/** 各类型对应的 Tailwind 类名（必须是完整字面量，Tailwind 才能扫描生成） */
const TYPE_STYLES: Record<NotifyType, { bar: string; icon: string; text: string }> = {
  info: { bar: 'border-l-brand', icon: 'text-brand', text: 'text-gray-200' },
  success: { bar: 'border-l-success', icon: 'text-success', text: 'text-gray-200' },
  warn: { bar: 'border-l-warn', icon: 'text-warn', text: 'text-gray-200' },
  error: { bar: 'border-l-danger', icon: 'text-danger', text: 'text-gray-200' },
};

/** 各类型的 SVG 图标（lucide 风格描边，内联以保证该工具可在非组件环境使用） */
const TYPE_ICONS: Record<NotifyType, string> = {
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  warn: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  error:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
};

/** 通知容器（惰性创建，固定右上角） */
function ensureContainer(): HTMLDivElement {
  let container = document.getElementById('app-toast-container') as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.className =
      'pointer-events-none fixed right-4 top-4 z-[9999] flex w-80 flex-col gap-2';
    document.body.appendChild(container);
  }
  return container;
}

/** 弹出一条通知 */
function show(type: NotifyType, message: string, options?: ToastOptions): void {
  if (typeof document === 'undefined') return;

  const duration = options?.duration ?? 3000;
  const style = TYPE_STYLES[type];

  const el = document.createElement('div');
  el.className = `glass pointer-events-auto flex items-start gap-2.5 rounded-xl border-l-2 px-4 py-3 text-sm shadow-neon ${style.bar} ${style.text} opacity-0 transition-all duration-200`;

  const iconWrap = document.createElement('span');
  iconWrap.className = `mt-0.5 shrink-0 ${style.icon}`;
  iconWrap.innerHTML = TYPE_ICONS[type];

  const text = document.createElement('span');
  text.className = 'leading-5 break-words';
  text.textContent = message;

  el.appendChild(iconWrap);
  el.appendChild(text);
  ensureContainer().appendChild(el);

  // 下一帧触发进入过渡
  requestAnimationFrame(() => {
    el.classList.remove('opacity-0');
    el.classList.add('opacity-100', 'translate-x-0');
  });

  // 自动关闭
  window.setTimeout(() => {
    el.classList.add('opacity-0');
    el.style.transition = 'opacity 200ms ease, transform 200ms ease';
    el.style.transform = 'translateX(8px)';
    window.setTimeout(() => el.remove(), 220);
  }, duration);
}

/** 全局通知对象（供拦截器与业务层调用） */
export const notify = {
  info: (message: string, options?: ToastOptions) => show('info', message, options),
  success: (message: string, options?: ToastOptions) => show('success', message, options),
  warn: (message: string, options?: ToastOptions) => show('warn', message, options),
  error: (message: string, options?: ToastOptions) => show('error', message, options),
};

export default notify;
