import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import monaco from 'vite-plugin-monaco-editor-esm'

// Polyfills for Node built-ins
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

export default defineConfig({
  plugins: [
    vue(),
    monaco({
      languageWorkers: ['editorWorkerService','json','css','html','typescript']
    })
  ],

  resolve: {
    alias: {
      // Polyfills (similar to webpack's resolve.fallback)
      assert: 'assert',
      buffer: 'buffer/',
      path: 'path-browserify',
      process: 'process/browser',
      stream: 'readable-stream',
      url: 'url',
      util: 'util',
    },
  },

  define: {
    // Replace "global" with globalThis
    global: 'globalThis',
  },

  optimizeDeps: {
    exclude: ['monaco-editor'],
    esbuildOptions: {
      // Node.js global to browser polyfills
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor']
        }
      }
    }
  }
})
