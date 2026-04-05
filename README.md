# Astrocyte

A React + Vite single-page app for note-taking, automatic classification via a local LLM, and mind map visualization based on notes and tags.

## Run locally

```bash
npm install
npm run dev
```

## Build (GitHub Pages)

```bash
npm run build
```

`vite.config.ts` is configured with `base: '/astrocyte/'` for GitHub Pages deployments.

## Published site (GitHub Pages)

`https://defdac.github.io/astrocyte/`

## CORS on GitHub Pages

When the app is served from GitHub Pages, it sends `Origin: https://defdac.github.io`, which local LLM servers often block by default. Make sure CORS is enabled in LM Studio.
