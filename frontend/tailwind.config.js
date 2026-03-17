/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                /* ── Brand: Blue ─────────────────────────── */
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                /* ── Brand: Orange (accent) ───────────────── */
                accent: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                surface: {
                    DEFAULT: '#ffffff',
                    raised: '#f8fafc',
                    overlay: '#f1f5f9',
                },
                dark: {
                    bg: '#0c0e16',
                    surface: '#131520',
                    raised: '#1c1f2e',
                    border: '#252839',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                xl: '0.75rem',
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
            boxShadow: {
                soft: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
                card: '0 4px 16px -2px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
                glow: '0 0 0 3px rgb(59 130 246 / 0.18)',
                'glow-orange': '0 0 0 3px rgb(249 115 22 / 0.18)',
                'orange': '0 4px 20px -4px rgb(249 115 22 / 0.45)',
                'blue': '0 4px 20px -4px rgb(59 130 246 / 0.45)',
            },
            animation: {
                'fade-in': 'fadeIn 0.25s ease-out',
                'slide-up': 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
                'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.22,1,0.36,1)',
                'bounce-dot': 'bounceDot 1.4s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
                'float': 'float 3s ease-in-out infinite',
                'shimmer': 'shimmer 2.2s linear infinite',
                'spin-slow': 'spin 8s linear infinite',
            },
            keyframes: {
                fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
                slideUp: { from: { opacity: 0, transform: 'translateY(14px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                slideInLeft: { from: { opacity: 0, transform: 'translateX(-20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
                bounceDot: {
                    '0%, 60%, 100%': { transform: 'translateY(0)' },
                    '30%': { transform: 'translateY(-8px)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-6px)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
            },
            backgroundImage: {
                'gradient-orange-blue': 'linear-gradient(135deg, #f97316 0%, #3b82f6 100%)',
                'gradient-blue-orange': 'linear-gradient(135deg, #3b82f6 0%, #f97316 100%)',
            },
        },
    },
    plugins: [],
};
