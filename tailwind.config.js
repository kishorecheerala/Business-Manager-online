export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--app-font)', 'sans-serif'],
            },
            colors: {
                primary: 'rgb(var(--primary-color) / <alpha-value>)',
                secondary: '#64748b',
                accent: 'rgb(var(--primary-color) / 0.8)',
                success: '#10b981',
                warning: '#f59e0b',
                danger: '#ef4444',
                background: '#f8fafc',
                text: '#1e293b',
            },
            animation: {
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'scale-in': 'scaleIn 0.2s ease-out forwards',
                'fade-in-fast': 'fadeIn 0.2s ease-out forwards',
                'slide-up-fade': 'slideUpFade 0.4s ease-out forwards',
                'slide-down-fade': 'slideDownFade 0.3s ease-out forwards',
            },
            keyframes: {
                fadeInUp: {
                    '0%': { opacity: '0', marginTop: '10px' },
                    '100%': { opacity: '1', marginTop: '0' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUpFade: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'none' },
                },
                slideDownFade: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'none' },
                }
            }
        },
    },
    plugins: [],
}
