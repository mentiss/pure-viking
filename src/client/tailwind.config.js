/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                viking: {
                    iron: '#454545',
                    'leather-dark': '#5D4037',
                    'bronze-light': '#FFD700',
                    brown: '#3E2723',
                    leather: '#8D6E63',
                    bronze: '#D4AF37',
                    parchment: '#F5E6D3',
                    danger: '#C62828',
                    success: '#2E7D32',
                    text: '#1B1B1B'
                }
            },
            boxShadow: {
                'viking-bold': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            fontFamily: {
                viking: ['"Eagle Lake"', 'Georgia', 'serif'],
                vikingText: ['"Grenze Gotisch"', 'serif']
            }
        }
    },
    plugins: [],
}