/** RUI 品牌配置 */

export const brand = {
  name: 'RUI',
  tagline: 'RUI Web Client',

  colors: {
    primary: '#3182ce',
    primaryLight: '#dbeafe',
    primaryDark: '#2b6cb0',

    success: '#38a169',
    successBg: '#f0fff4',
    successBorder: '#9ae6b4',

    danger: '#e53e3e',
    dangerBg: '#fff5f5',
    dangerBorder: '#feb2b2',

    warning: '#d69e2e',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',

    text: '#111827',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',

    border: '#e5e7eb',
    borderLight: '#f3f4f6',

    background: '#ffffff',
    backgroundHover: '#f9fafb',
    cardBg: '#ffffff',
  },

  /** Logo placeholder — 替换此对象以使用真实 Logo 资源 */
  logo: {
    type: 'text' as const,
    text: 'RUI',
  },
};
