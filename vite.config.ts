import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  const isDev = mode === 'development'
  const isProd = mode === 'production'

  return {
    plugins: [
      tailwindcss(),
      react(),
    ],

    // Path resolution and aliases
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@lib': path.resolve(__dirname, './src/lib'),
      },
    },

    // Development server configuration
    server: {
      port: 3000,
      strictPort: true, // Fail if port is already in use
      open: false, // Don't open browser on server start (for headless testing)
      host: true, // Listen on all local IPs

      // Hot Module Replacement configuration
      hmr: {
        overlay: true, // Show errors as overlay
        clientPort: 3000,
      },

      // Watch configuration for optimal HMR
      watch: {
        usePolling: false, // Set to true if HMR doesn't work (e.g., in Docker)
        interval: 100,
      },

      // CORS configuration
      cors: true,
    },

    // Preview server configuration (for previewing production builds)
    preview: {
      port: 3000,
      strictPort: true,
      open: false,
      host: true,
    },

    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: isDev ? true : 'hidden', // Full sourcemaps in dev, hidden in prod
      minify: isProd ? 'esbuild' : false, // Only minify in production

      // Target modern browsers for better performance
      target: 'esnext',

      // Chunk size warnings
      chunkSizeWarningLimit: 1000,

      // Rollup options for production bundling
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            // Vendor chunk for React libraries
            vendor: ['react', 'react-dom'],
          },

          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') ?? []
            const ext = info[info.length - 1]
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext ?? '')) {
              return `assets/images/[name]-[hash][extname]`
            }
            if (/woff|woff2|eot|ttf|otf/i.test(ext ?? '')) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },

          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',

          // Entry file naming
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },

      // CSS code splitting
      cssCodeSplit: true,

      // Report compressed size
      reportCompressedSize: true,

      // Empty output directory before build
      emptyOutDir: true,
    },

    // CSS configuration
    css: {
      // Enable CSS modules
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isDev ? '[name]__[local]' : '[hash:base64:8]',
      },

      // Dev sourcemaps
      devSourcemap: true,
    },

    // Dependency optimization
    optimizeDeps: {
      // Include dependencies that need to be pre-bundled
      include: ['react', 'react-dom'],

      // Exclude dependencies from pre-bundling
      exclude: [],

      // Force optimization entries
      esbuildOptions: {
        target: 'esnext',
      },
    },

    // Environment variable prefix
    envPrefix: 'VITE_',

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(env.VITE_APP_VERSION || '0.1.0'),
      __DEV_MODE__: isDev,
    },

    // esbuild configuration
    esbuild: {
      // Drop console and debugger in production
      drop: isProd ? ['console', 'debugger'] : [],

      // Legal comments handling
      legalComments: 'none',
    },

    // Logging level
    logLevel: isDev ? 'info' : 'warn',

    // Clear screen on rebuild
    clearScreen: true,
  }
})
