# ruigato.info — front-end novo (Vite)

WordPress em XAMPP **não é alterado** por este projecto.

## Desenvolvimento

```bash
cd web
npm install
npm run dev
```

Abre **http://localhost/** (porta fixa em `vite.config.ts`).

Se arrancares o túnel Cloudflare configurado para `ruigato.info`, este front-end local também fica exposto publicamente a partir da mesma porta `80`.

Em desenvolvimento via túnel, o Vite serve também pedidos a `/wp-content/...` directamente a partir da cópia local do WordPress em `C:\xampp\htdocs\ruigato\wp-content` por omissão. Esse fallback continua disponível, mas o modelo preferido agora é servir media legado já copiado para `public/media/wp-content/...`.

## Build

```bash
cd web
npm run build
```

Saída em web/dist/ (estático). Cutover futuro: servir isto em produção quando a paridade estiver validada.

## Conteúdo

- Dados em `src/data/*.json` — gerados pelo export PHP a partir do WordPress (só leitura na BD).

### Exportar WordPress → JSON

Na raíz do repositório, com MySQL a correr (ex.: XAMPP) e a base `ruigato_wp` acessível:

```bash
C:\xampp\php\php.exe scripts\export-wp-to-json.php
```

Variáveis de ambiente opcionais: `WP_EXPORT_DB_HOST`, `WP_EXPORT_DB_USER`, `WP_EXPORT_DB_PASS`, `WP_EXPORT_DB_NAME`, `WP_EXPORT_TABLE_PREFIX` (por omissão: `127.0.0.1`, `root`, password vazia, `ruigato_wp`, `TtXh0s_`).

Saída: `web/src/data/works.json`, `pages.json`, `timeline-events.json`. Cada obra inclui **`featuredImage`** (URL do attachment em destaque, a partir de `_thumbnail_id`).

### Media e URLs do WordPress

O export canónico reescreve referências do WordPress (`https://www.ruigato.info/wp-content/...`) para caminhos locais do front-end em `/media/wp-content/...`.

Para sincronizar esses ficheiros locais a partir da tua cópia WordPress em XAMPP, corre:

```bash
cd web
node scripts/export-canonical-works.mjs
```

O script copia apenas os ficheiros `wp-content` realmente referenciados nas obras para `public/media/wp-content/...`.

Se a tua cópia local do WordPress estiver noutro sítio, define a variável de ambiente `LEGACY_WP_CONTENT_DIR` antes de correr o script. Exemplo em Windows:

```bash
set LEGACY_WP_CONTENT_DIR=D:\sites\ruigato\wp-content
node scripts/export-canonical-works.mjs
```

### Timeline WebGL (plugin timeline-threejs)

A rota `/timeline` executa o **mesmo código** que o plugin WordPress `timeline-threejs`:

- Cópia de referência: `src/timeline/plugin/timeline-threejs.raw.js` (actualiza a partir do teu servidor WP quando o plugin mudar).
- Integração: `node scripts/patch-timeline-plugin.mjs` gera `src/timeline/timelinePluginRuntime.ts` (ajustes de layout SPA, RAF, hover dos arcos, navegação “open post” para a app).
- Three.js vem de `npm` (`three@0.170`); `OrbitControls` e `Line2` / `LineMaterial` / `LineGeometry` dos exemplos JSM.

Os dados vêm de `works.json` + `timeline-events.json`, convertidos para o formato `timelineData` do plugin em `src/timeline/buildTimelinePluginData.ts`.

Shortcodes WordPress frequentes no export (`[webgl_timeline]`, `[interactive_timeline]`, `[the_grid …]`) são substituídos no cliente por avisos com links para `/timeline` e `/works`.

### Início e `site.json`

Em `src/data/site.json`: **`homeBodyPageSlug`** — slug da página cujo corpo é mostrado por baixo do heró na início (por omissão `portfolio`, equivalente à grelha The Grid no WP). Usa `null` ou `""` para desactivar esse bloco.

### Obras e páginas exportadas

- `works.json` é carregado com `import()` na primeira visita a `/works` ou a uma obra — não entra no chunk inicial.
- `pages.json` idem na primeira visita a `/about`, à início (bloco opcional), a `/p/:slug` ou quando `loadPages()` corre.
- Rotas dinâmicas: **`/p/{slug}`** mostra qualquer página do export cujo `post_name` coincida (ex.: `/p/geomusica`). Slugs que já têm rota própria redireccionam: `about` → `/about`, `works` → `/works`, `timeline` / `timeline-three` / `timeline-webgl` → `/timeline`.

A rota `/timeline` continua em chunk separado (lazy) em `App.tsx`.

