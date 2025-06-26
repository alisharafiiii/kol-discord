/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Platform gradient backgrounds
    'bg-gradient-to-br',
    'from-gray-700',
    'to-black',
    'from-purple-500',
    'via-pink-500',
    'to-orange-400',
    'from-blue-600',
    'to-blue-800',
    'from-red-600',
    'to-red-800',
    'from-blue-500',
    'to-blue-700',
    'from-blue-400',
    'to-blue-600',
    'from-black',
    'via-gray-800',
    'to-pink-500',
    'from-purple-600',
    'to-purple-800',
    'from-green-500',
    'to-green-700',
    'from-gray-500',
    'to-gray-700'
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        "fade-out": "1s fadeOut 3s ease-out forwards",
        matrix: "matrix 20s linear infinite",
      },
      keyframes: {
        fadeOut: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        matrix: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "0% 100%" },
        },
      },
    },
  },
  plugins: [],
};
