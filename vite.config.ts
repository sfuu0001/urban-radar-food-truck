import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      // FIX(审计P2): 拆分超大主 chunk (5.1MB)，按业务域分包以提升首屏与缓存命中
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react') || id.includes('scheduler') || id.includes('motion') || id.includes('framer')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('cloudbase') || id.includes('@cloudbase')) return 'vendor-cloudbase';
            if (id.includes('leaflet')) return 'vendor-leaflet';
            if (id.includes('@google') || id.includes('genai')) return 'vendor-ai';
            return 'vendor-other';
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is controlled via DISABLE_HMR env var, but watch must remain enabled for module invalidation
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
