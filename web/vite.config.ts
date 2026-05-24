import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { saveCanonicalWorkPlugin } from './src/vite-plugins/saveCanonicalWorkPlugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
/** Raiz do pacote `web/` (path absoluto normalizado — evita falhas de fs.allow no Windows). */
const webRoot = path.resolve(__dirname)
/** Raiz do repositório (pai de `web/`), por si .env ou ficheiros estiverem um nível acima. */
const repoRoot = path.resolve(webRoot, '..')
const DEFAULT_LEGACY_WP_CONTENT_DIR = 'C:\\xampp\\htdocs\\ruigato\\wp-content'

/** Porta só para o WebSocket HMR; separar do HTTP na :80 reduz frames WS inválidos (RSV1) por tráfego estranho na mesma porta. */
const HMR_WS_PORT = Number(process.env.VITE_HMR_PORT) || 24678

function contentTypeForPath(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.avif':
      return 'image/avif'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.gif':
      return 'image/gif'
    case '.ico':
      return 'image/x-icon'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.json':
      return 'application/json; charset=utf-8'
    case '.mp4':
      return 'video/mp4'
    case '.pdf':
      return 'application/pdf'
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    case '.txt':
      return 'text/plain; charset=utf-8'
    case '.webm':
      return 'video/webm'
    case '.webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

function legacyWpContentProxyPlugin(legacyWpContentDir: string) {
  const root = path.resolve(legacyWpContentDir)
  const prefix = '/wp-content/'

  return {
    name: 'legacy-wp-content-proxy',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const requestUrl = req.url?.split('?')[0] ?? ''
        if (!requestUrl.startsWith(prefix)) {
          next()
          return
        }

        const relativePath = decodeURIComponent(requestUrl.slice(prefix.length))
        const filePath = path.resolve(root, relativePath)
        const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`

        if (!(filePath === root || filePath.startsWith(rootWithSep))) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

        fs.stat(filePath, (error, stats) => {
          if (error || !stats.isFile()) {
            next()
            return
          }

          res.setHeader('Content-Type', contentTypeForPath(filePath))
          res.setHeader('Cache-Control', 'public, max-age=3600')

          const stream = fs.createReadStream(filePath)
          stream.on('error', () => {
            if (!res.headersSent) {
              res.statusCode = 500
            }
            res.end('Internal Server Error')
          })
          stream.pipe(res)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, webRoot, '')
  const editorSecret = env.VITE_WORK_EDITOR_SECRET?.trim() ?? ''
  const legacyWpContentDir =
    env.LEGACY_WP_CONTENT_DIR?.trim() || DEFAULT_LEGACY_WP_CONTENT_DIR

  return {
    root: webRoot,
    plugins: [
      react(),
      ...(editorSecret ? [saveCanonicalWorkPlugin(editorSecret)] : []),
      legacyWpContentProxyPlugin(legacyWpContentDir),
    ],
    resolve: {
      alias: {
        // Import em minúsculas alinha tipos (flip.d.ts) no TS; o ficheiro real é Flip.js (Linux).
        'gsap/flip.js': path.resolve(__dirname, 'node_modules/gsap/Flip.js'),
      },
    },
    server: {
      host: '::',
      port: 80,
      strictPort: true,
      allowedHosts: ['ruigato.info', 'www.ruigato.info'],
      fs: {
        allow: [webRoot, repoRoot],
      },
      hmr: {
        protocol: 'ws',
        port: HMR_WS_PORT,
      },
    },
  }
})
