import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// For GitHub Pages deployment, set base to your repo name:
//   base: '/Village-Simulation/',
export default defineConfig({
  plugins: [react()],
})
