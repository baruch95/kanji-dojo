import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { validateBasePath } from './base-path.ts'

export default defineConfig({
  base: validateBasePath(process.env.VITE_BASE_PATH),
  plugins: [react()],
})
