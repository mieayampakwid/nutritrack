import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** First non-internal IPv4 — used so HMR WebSocket targets LAN IP, not localhost (phones cannot reach localhost on the Mac). */
function firstLanIPv4() {
  for (const nets of Object.values(os.networkInterfaces())) {
    if (!nets) continue
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return undefined
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const hmrHost = env.DEV_HMR_HOST?.trim() || firstLanIPv4()

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      cors: true,
      ...(hmrHost ? { hmr: { host: hmrHost } } : {}),
    },
  }
})
