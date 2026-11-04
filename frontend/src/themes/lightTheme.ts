/**
 * Bảng màu/font/breakpoints dùng nội bộ cho UI sáng (không phải MUI/antd —
 * dự án chỉ có Tailwind + lucide-react). Ép kiểu để các component dùng
 * `lightTheme.colors.*` an toàn về khoá.
 */

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  error: string
  success: string
  warning: string
}

export interface ThemeFonts {
  body: string
  heading: string
}

export interface ThemeBreakpoints {
  sm: string
  md: string
  lg: string
  xl: string
}

export interface Theme {
  colors: ThemeColors
  fonts: ThemeFonts
  breakpoints: ThemeBreakpoints
}

export const lightTheme: Theme = {
  colors: {
    primary: '#1a73e8',
    secondary: '#ff6b00',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e5e5e5',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  fonts: {
    body: 'Roboto, sans-serif',
    heading: 'Roboto, sans-serif',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
}
