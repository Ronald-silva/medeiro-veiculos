import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import viteImagemin from 'vite-plugin-imagemin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ],
        compact: true,
        minified: true
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Medeiro Veículos',
        short_name: 'Medeiro',
        description: 'Seminovos Premium em Fortaleza',
        theme_color: '#003B7E',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.svg', 
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    }),
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false
      },
      optipng: {
        optimizationLevel: 7
      },
      mozjpeg: {
        quality: 75
      },
      pngquant: {
        quality: [0.7, 0.8],
        speed: 4
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
            active: false
          },
          {
            name: 'removeEmptyAttrs',
            active: true
          },
          {
            name: 'cleanupIDs',
            active: true
          },
          {
            name: 'removeDimensions',
            active: true
          }
        ]
      },
      webp: {
        quality: 75,
        method: 6
      }
    })
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    assetsInlineLimit: 4096,
    modulePreload: {
      polyfill: true
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react/jsx-runtime')) {
              return 'react-jsx'
            }
            if (id.includes('react-dom')) {
              return 'react-dom'
            }
            if (id.includes('react')) {
              return 'react'
            }
            if (id.includes('framer-motion')) {
              return 'framer-motion'
            }
            if (id.includes('swiper')) {
              return 'swiper'
            }
            if (id.includes('@heroicons')) {
              return 'icons'
            }
            if (id.includes('react-helmet')) {
              return 'helmet'
            }
            return 'vendor'
          }
          if (id.includes('src/components')) {
            return 'components'
          }
        },
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        compact: true,
        generatedCode: {
          arrowFunctions: true,
          constBindings: true,
          objectShorthand: true,
          preset: 'es2015'
        }
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        pure_getters: true,
        passes: 3,
        ecma: 2020,
        module: true,
        toplevel: true,
        unsafe_arrows: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_undefined: true
      },
      format: {
        comments: false,
        ecma: 2020,
        wrap_iife: true,
        preserve_annotations: false
      },
      mangle: {
        safari10: true,
        toplevel: true,
        module: true,
        properties: {
          regex: /^_/
        }
      },
      module: true,
      safari10: true
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'swiper'],
    exclude: ['@heroicons/react']
  }
})
