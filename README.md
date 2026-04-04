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

GitHub Pages-deployen använder alltid ett internt artifact-format (tar) i Actions-loggen, men den publika sidan nås via:

`https://<ditt-github-användarnamn>.github.io/astrocyte/`

Om repositoryt ligger i en organisation:

`https://<orgnamn>.github.io/astrocyte/`
