# Architecture Spec (Agent-Friendly)

## 0) Metadata
```yaml
spec_id: astrocyte-architecture-v1
language: sv-SE
status: draft
last_updated: 2026-04-06
owners:
  - product
  - engineering
runtime:
  frontend: React
  hosting: GitHub Pages (statisk webbapp)
```

## 1) Produktmål
```yaml
product_goal:
  summary: "Anteckningsapp som automatiskt klassificerar anteckningar och visualiserar en mindmap."
  core_capabilities:
    - "Skapa, läsa, uppdatera, ta bort anteckningar"
    - "Automatisk klassificering av anteckning via lokal LLM"
    - "Visualisering av relaterade anteckningar som bubbel-mindmap"
```

## 2) Plattform & deploy
```yaml
platform:
  app_type: "Single Page Application"
  framework: "React"
  build_tooling: "Vite (rekommenderat)"
  deploy_target: "GitHub Pages"
  static_constraints:
    - "Ingen egen server krävs för grundflödet"
    - "All konfiguration lagras klientnära (localStorage/IndexedDB)"
```

## 3) UI-struktur
```yaml
ui:
  layout:
    left_sidebar:
      required: true
      common_pattern: "Modern vänstermeny"
      bottom_action:
        id: settings_gear
        icon: "kugghjul"
        position: "längst ner"
        behavior: "Öppna Settings-vy/modal"
    main_content:
      primary_view: "Mindmap med bubblor"
      secondary_views:
        - "Anteckningseditor"
        - "Anteckningslista/filter"
```

## 4) Settings-krav
```yaml
settings:
  storage_provider:
    description: "Användaren väljer var anteckningar sparas"
    supported_options:
      - id: local
        label: "Lokal lagring"
      - id: dropbox
        label: "Dropbox"
      - id: gdrive
        label: "Google Drive"
    fields:
      - provider
      - oauth_connected
      - sync_mode   # manual | periodic
      - sync_interval_minutes
  llm:
    description: "Lokal LLM-konfiguration till ML Studio-server"
    fields:
      - base_url            # ex: http://127.0.0.1:1234
      - model_name
      - api_key_optional
      - timeout_ms
      - max_tokens
      - temperature
      - system_instruction_template
      - classification_prompt_template
    healthcheck:
      endpoint: "/health eller /v1/models (konfigurerbart)"
      ui_action: "Test Connection"
```

## 5) Komponentkarta (React)
```yaml
react_components:
  - name: AppShell
    responsibility: "Grid/layout + routing"
  - name: Sidebar
    responsibility: "Navigation + kugghjul längst ned"
  - name: SettingsPanel
    responsibility: "Konfigurera storage + LLM"
  - name: NoteEditor
    responsibility: "Skapa anteckningstext och visa LLM-genererad titel/taggar (read-only)"
  - name: NotesList
    responsibility: "Lista/sök/filter anteckningar"
  - name: MindmapCanvas
    responsibility: "Rendera anteckningsnoder/bubblor, taggkluster och länkar"
  - name: ClassificationService
    responsibility: "Anropa ML Studio för klassificering"
  - name: StorageAdapter
    responsibility: "Gemensamt interface för Local/Dropbox/GDrive"
```

## 6) Dataflöde
```mermaid
flowchart LR
  A[User writes/pastes note text] --> B[Ctrl+V detected in editor]
  B --> C[Send current text to ClassificationService]
  C --> D[ML Studio returns title/tags and optional topical hints]
  D --> E[Populate read-only title/tag fields live in editor]
  A --> F[Save note]
  F --> G[Classify again for final tags/metadata]
  G --> H[Build note-centric mindmap from notes + shared tags]
  H --> I[Render in MindmapCanvas]
  F --> J[Persist via StorageAdapter]
  J --> K[(Local / Dropbox / GDrive)]
```

## 7) Mindmap-datamodell (kompakt + LLM-vänlig)

### 7.1 Principer
```yaml
mindmap_model_principles:
  - "Kompakt JSON för låg tokenkostnad"
  - "Separata objekt för nodes och edges"
  - "Minimal men tillräcklig metadata för rendering"
  - "Stabil identifiering via korta IDs"
  - "Anteckningar är primära noder i mindmapen"
  - "Taggar används för klustring och relationsstyrka"
```

### 7.2 JSON-schema (praktiskt format)
```json
{
  "version": "1.0",
  "notes": [
    {
      "id": "n_01",
      "title": "Teststrategi för API",
      "text": "Kort sammanfattning av anteckningen...",
      "tags": ["jobb", "test", "api"],
      "ts": "2026-04-04T10:15:00Z"
    },
    {
      "id": "n_02",
      "title": "KPI-er för Q2",
      "text": "Utkast till budget och uppföljning...",
      "tags": ["jobb", "ekonomi", "budget"],
      "ts": "2026-04-04T13:00:00Z"
    }
  ],
  "edges": [
    {
      "from": "n_01",
      "to": "n_02",
      "type": "shared_tag",
      "w": 0.73,
      "shared_tags": ["jobb"]
    }
  ],
  "clusters": [
    {
      "id": "c_jobb",
      "label": "Jobb",
      "tag": "jobb",
      "size": 2,
      "note_ids": ["n_01", "n_02"]
    },
    {
      "id": "c_ekonomi",
      "label": "Ekonomi",
      "tag": "ekonomi",
      "size": 1,
      "note_ids": ["n_02"]
    }
  ]
}
```

### 7.3 Rendering-regler för bubblor
```yaml
rendering_rules:
  node_size:
    note: "baseras på antal kopplingar till andra anteckningar och antal taggar"
  node_color:
    by_primary_tag_cluster: true
  edge_visibility:
    threshold_w: 0.55
  layout:
    algorithm: "cluster-aware radial / force-inspired"
    preserve_positions: false
  clustering:
    basis: "delade taggar"
    primary_cluster: "största eller mest representativa taggen för anteckningen"
```

## 8) Klassificering (ML Studio)
```yaml
classification_pipeline:
  input:
    - note_text
    - optional_context_summary
  output:
    - generated_title
    - generated_tags[]
    - optional_topics[]
    - optional_reasoning_short
  constraints:
    - "Taggar ska kunna användas direkt för klustring och relationsberäkning mellan anteckningar"
    - "Titel och taggar ska vara maskin-genererade (inte manuellt redigerade i editorn)"
    - "Undvik långa fritextsvar"
```

Exempel på strikt svarskontrakt:
```json
{
  "title": "Teststrategi för API",
  "tags": ["jobb", "test", "api"],
  "topics": [
    {"label": "Jobb", "score": 0.97}
  ]
}
```

## 9) Adapter-interface för lagring
```ts
export interface StorageAdapter {
  init(): Promise<void>;
  saveNote(note: Note): Promise<void>;
  listNotes(): Promise<Note[]>;
  deleteNote(noteId: string): Promise<void>;
  exportMindmap(): Promise<MindmapModel>;
  importMindmap(model: MindmapModel): Promise<void>;
}
```

## 10) Milstolpar
```yaml
roadmap:
  m1:
    name: "Lokal MVP"
    includes:
      - React app shell
      - Sidebar + settings-kugghjul
      - Local storage adapter
      - Grundläggande mindmap-rendering
  m2:
    name: "LLM-klassificering"
    includes:
      - ML Studio config + connection test
      - Automatisk tagg- och metadata-generering
      - Automatisk relations- och klusterbyggnad från delade taggar
  m3:
    name: "Cloud sync"
    includes:
      - Dropbox adapter
      - Google Drive adapter
      - Konflikthantering vid sync
```
