import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    strictPort: false,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires manualChunks as a function
        manualChunks(id) {
          // Core React runtime — tiny, cached forever
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }

          // Supabase — large SDK, shared, cache separately
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }

          // Recharts — only needed on Reports/Revenue pages
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-')) {
            return 'charts';
          }

          // Form & validation libs
          if (id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/@hookform/') ||
              id.includes('node_modules/zod/')) {
            return 'forms';
          }

          // State & data fetching
          if (id.includes('node_modules/zustand/') ||
              id.includes('node_modules/@tanstack/')) {
            return 'state';
          }

          // UI utilities
          if (id.includes('node_modules/lucide-react/') ||
              id.includes('node_modules/react-hot-toast/')) {
            return 'ui';
          }
        },
      },
    },

    // CSS per-page splitting
    cssCodeSplit: true,

    // No sourcemaps in production (reduces bundle size)
    sourcemap: false,
  },

  // Pre-bundle deps for fast dev server cold start
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'zustand',
      'lucide-react',
      'react-hot-toast',
    ],
  },
});
