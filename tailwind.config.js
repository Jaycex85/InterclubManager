/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#001f3f',       // couleur custom
        graylight: '#f5f5f5',  // couleur custom
      },
    },
  },
  plugins: [],
}
