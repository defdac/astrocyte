# Astrocyte

Single Page Application (React + Vite) för anteckningar med automatisk klassificering via lokal LLM och mindmap-visualisering.

## Kör lokalt

```bash
npm install
npm run dev
```

## Build (GitHub Pages)

```bash
npm run build
```

`vite.config.ts` är konfigurerad med `base: '/astrocyte/'` för GitHub Pages.

## Publicerad sida (GitHub Pages)

`https://defdac.github.io/astrocyte/`

## CORS på GitHub Pages

När appen körs från GitHub Pages skickas `Origin: https://defdac.github.io`, vilket ofta blockeras av lokala LLM-servrar.

Lösningar:

- Kör appen lokalt med `npm run dev` (Vite-proxy via `__llm_proxy`).
- Aktivera CORS i LLM-servern för `https://defdac.github.io`.
- Ange **CORS proxy URL (optional)** i Settings om du vill routa anrop via en egen proxy.

Fältet accepterar två format:

- `https://din-proxy.example.com/{url}` (rekommenderat; `{url}` ersätts med URL-kodad endpoint)
- `https://din-proxy.example.com` (endpoint läggs till som URL-kodad path-segment)
