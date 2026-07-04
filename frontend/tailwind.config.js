/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cursor/Linear-inspired theme, driven by CSS variables (see index.css)
        // so dark/light switch by flipping data-theme on <html>.
        background: {
          DEFAULT: 'var(--bg)',
          elevated: 'var(--bg-elevated)',
          sidebar: 'var(--bg-sidebar)',
          editor: 'var(--bg-editor)',
          panel: 'var(--bg-panel)',
          border: 'var(--bg-border)',
          hover: 'var(--bg-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: '#3b82f6',
          code: '#f472b6',
        },
        // Accent colors
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#60a5fa',
          active: '#2563eb',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',
        // Git colors
        git: {
          added: '#10b981',
          modified: '#f59e0b',
          deleted: '#ef4444',
        },
        // Syntax highlighting
        syntax: {
          keyword: '#c678dd',
          string: '#98c379',
          number: '#d19a66',
          comment: '#5c6370',
          function: '#61afef',
          variable: '#e06c75',
          type: '#e5c07b',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xxs': '0.65rem',
        'tiny': '0.7rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'glow': '0 0 30px rgba(59, 130, 246, 0.15)',
        'glow-sm': '0 0 15px rgba(59, 130, 246, 0.1)',
        'panel': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.15)',
        'panel-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'fade-in-up': 'fadeInUp 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 0.5s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

