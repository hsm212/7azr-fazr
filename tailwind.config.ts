import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
      },
      colors: {
        bg:       '#080a10',
        surface:  '#10132a',
        surface2: '#181c3a',
        border:   '#252b55',
        'team-a': '#e63946',
        'team-b': '#06d6a0',
        gold:     '#ffd60a',
      },
    },
  },
  plugins: [],
}
export default config
