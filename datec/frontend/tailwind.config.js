/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
        "./node_modules/primevue/**/*.{vue,js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                // DaTEC Custom Color Palette
                // Specific names
                'imperial-red': '#E63946',
                'honeydew': '#F1FAEE',
                'powder-blue': '#A8DADC',
                'celadon-blue': '#457B9D',
                'prussian-blue': '#1D3557',
                // Utility aliases for cleaner code (e.g., bg-primary)
                primary: '#E63946',
                secondary: '#457B9D',
                accent: '#A8DADC',
                dark: '#1D3557',
                light: '#F1FAEE'
            }
        },
    },
    plugins: [],
}