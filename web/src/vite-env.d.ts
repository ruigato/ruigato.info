/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, replaces public site origins in legacy HTML (media URLs). No trailing slash. Example: http://127.0.0.1/ruigato.info */
  readonly VITE_LEGACY_WP_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
