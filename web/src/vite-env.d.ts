/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When set, replaces public site origins in legacy HTML (media URLs). No trailing slash. Example: http://127.0.0.1/ruigato.info */
  readonly VITE_LEGACY_WP_ORIGIN?: string
  /**
   * Segredo para desbloquear o editor de obras na página de detalhe.
   * Em `npm run dev`, o mesmo valor activa `POST /__api/save-canonical-work` para gravar em `public/data/canonical/`.
   */
  readonly VITE_WORK_EDITOR_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
