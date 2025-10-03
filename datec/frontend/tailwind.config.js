/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'imperial-red': '#E63946',
        'honeydew': '#F1FAEE',
        'powder-blue': '#A8DADC',
        'celadon-blue': '#457B9D',
        'prussian-blue': '#1D3557',
        // Aliases para uso común
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