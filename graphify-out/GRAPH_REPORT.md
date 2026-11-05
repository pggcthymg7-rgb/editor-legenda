# Graph Report - editor-legenda  (2026-11-05)

## Corpus Check
- Corpus is ~44,919 words - fits in a single context window. You may not need a graph.

## Summary
- 640 nodes · 1489 edges · 57 communities (16 shown, 41 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core Domain (grouping)
- Core Domain (types)
- Module: @huggingface/transformers
- Platform Abstraction (types)
- Remotion Render & Masks (CaptionComposition)
- Express Local Server (render)
- Module: devDependencies
- Module: dependencies
- Module: @fontsource/black-ops-one@5.
- Module: package.json
- Cloud Groq Proxy
- Person Segmentation & Masks
- Module: tsconfig.json
- Module: scripts
- Project Brain & Documentation
- Module: overrides
- Module: @remotion/cli@4.0.540
- Module: env.d.ts
- Module: @fontsource/abril-fatface@5.
- Module: @fontsource/alfa-slab-one@5.
- Module: @fontsource/allura@5.3.0
- Module: @fontsource/archivo-black@5.
- Module: @fontsource/bangers@5.3.0
- Module: @fontsource/bebas-neue@5.3.0
- Module: @fontsource/bowlby-one-sc@5.
- Module: @fontsource/bungee@5.3.0
- Module: @fontsource/dela-gothic-one@
- Module: @fontsource/great-vibes@5.3.
- Module: @fontsource/league-gothic@5.
- Module: @fontsource/monoton@5.3.0
- Module: @fontsource/parisienne@5.3.0
- Module: @fontsource/permanent-marker
- Module: @fontsource/playfair-display
- Module: @fontsource/prata@5.3.0
- Module: @fontsource/press-start-2p@5
- Module: @fontsource/russo-one@5.3.0
- Module: @fontsource/sacramento@5.3.0
- Module: @fontsource/shrikhand@5.3.0
- Module: @fontsource/titan-one@5.3.0
- Module: @fontsource-variable/archivo
- Module: @fontsource-variable/big-sho
- Module: @fontsource-variable/bodoni-
- Module: @fontsource-variable/caveat@
- Module: @fontsource-variable/cinzel@
- Module: @fontsource-variable/cormora
- Module: @fontsource-variable/dm-sans
- Module: @fontsource-variable/fraunce
- Module: @fontsource-variable/inter@5
- Module: @fontsource-variable/manrope
- Module: @fontsource-variable/montser
- Module: @fontsource-variable/orbitro
- Module: @fontsource-variable/outfit@
- Module: @fontsource-variable/playfai
- Module: @fontsource-variable/space-g
- Module: @fontsource-variable/syne@5.
- Module: @fontsource-variable/unbound
- Module: @fontsource/yellowtail@5.3.0

## God Nodes (most connected - your core abstractions)
1. `Project` - 25 edges
2. `phraseStart()` - 21 edges
3. `findPreset()` - 19 edges
4. `react` - 18 edges
5. `Platform` - 17 edges
6. `phraseEnd()` - 17 edges
7. `App()` - 16 edges
8. `Timeline()` - 15 edges
9. `compilerOptions` - 15 edges
10. `TranscribedWord` - 14 edges

## Surprising Connections (you probably didn't know these)
- `transcribeOpenAi()` --calls--> `fromOpenAi()`  [EXTRACTED]
  server/openai.ts → src/core/transcript.ts
- `ph()` --calls--> `buildPhrase()`  [EXTRACTED]
  tests/edit.test.ts → src/core/grouping.ts
- `BRAIN.md (Cérebro Central)` --references--> `docs/CEREBRO.md (Memória e Deploy)`  [EXTRACTED]
  BRAIN.md → docs/CEREBRO.md
- `BRAIN.md (Cérebro Central)` --references--> `docs/COLAB.md (Protocolo Claude ↔ Antigravity)`  [EXTRACTED]
  BRAIN.md → docs/COLAB.md
- `BRAIN.md (Cérebro Central)` --references--> `docs/MANUAL.md (Manual de Uso)`  [EXTRACTED]
  BRAIN.md → docs/MANUAL.md

## Import Cycles
- None detected.

## Communities (57 total, 41 thin omitted)

### Community 0 - "Core Domain (grouping)"
Cohesion: 0.06
Nodes (81): remotion@4.0.540, lucide-react, react, remotion, @remotion/player, App(), MobileTab, SHORTCUTS (+73 more)

### Community 1 - "Core Domain (types)"
Cohesion: 0.06
Nodes (50): FontPicker(), Props, ENTRANCE_LABEL, EXIT_LABEL, MODE_LABEL, Props, ROLE_LABEL, Slider() (+42 more)

### Community 2 - "Module: @huggingface/transformers"
Cohesion: 0.06
Nodes (50): @huggingface/transformers@4.2.0, mediabunny@1.64.0, @huggingface/transformers, mediabunny, CLOUD_URL, cloudHealth(), CloudState, cloudTranscribe() (+42 more)

### Community 3 - "Platform Abstraction (types)"
Cohesion: 0.06
Nodes (34): ExportPanel(), Job, keepAwake(), saveText(), devicePlatform, maskCache, safeName(), StoredProject (+26 more)

### Community 4 - "Remotion Render & Masks (CaptionComposition)"
Cohesion: 0.10
Nodes (43): assBgr(), assColor(), assTime(), escapeAss(), mainColor(), pad(), srtTime(), toAss() (+35 more)

### Community 5 - "Express Local Server (render)"
Cohesion: 0.08
Nodes (31): app, DIST, PORT, extractAudio(), hasOpenAiKey(), REMOTION_BIN, run, transcribeOpenAi() (+23 more)

### Community 6 - "Module: devDependencies"
Cohesion: 0.07
Nodes (26): devDependencies, concurrently@9.1.2, fake-indexeddb@6.2.7, tsx@4.20.3, @types/express@5.0.3, @types/node@22.15.30, @types/react@19.1.8, @types/react-dom@19.1.6 (+18 more)

### Community 7 - "Module: dependencies"
Cohesion: 0.08
Nodes (26): dependencies, @fontsource/anton@5.3.0, @fontsource/dm-serif-display@5.3.0, @fontsource/luckiest-guy@5.3.0, lucide-react@1.59.0, @mediabunny/aac-encoder@1.64.0, @mediapipe/tasks-vision@1.1.1, react@19.1.0 (+18 more)

### Community 8 - "Module: @fontsource/black-ops-one@5."
Cohesion: 0.10
Nodes (23): @fontsource/black-ops-one@5.3.0, @fontsource/pacifico@5.3.0, @fontsource/righteous@5.3.0, @fontsource/rock-salt@5.3.0, @fontsource/rubik-mono-one@5.3.0, @fontsource/satisfy@5.3.0, @fontsource-variable/bricolage-grotesque@5.3.0, @fontsource-variable/oswald@5.3.0 (+15 more)

### Community 9 - "Module: package.json"
Cohesion: 0.09
Nodes (22): express@5.1.0, @fontsource/instrument-serif@5.3.0, @fontsource/kaushan-script@5.3.0, @fontsource/lobster@5.3.0, @fontsource/poppins@5.3.0, @fontsource-variable/dancing-script@5.3.0, @fontsource-variable/nunito@5.3.0, react-dom@19.1.0 (+14 more)

### Community 10 - "Cloud Groq Proxy"
Cohesion: 0.11
Nodes (15): allow(), AUDIO_TYPES, HITS, LIMIT_PER_HOUR, ORIGINS, PORT, PROMPTS, provider() (+7 more)

### Community 11 - "Person Segmentation & Masks"
Cohesion: 0.22
Nodes (14): analyzePerson(), base(), createSegmenter(), MaskResult, softwareGpu(), fillHoles(), grayToAlpha(), MASK_FPS (+6 more)

### Community 12 - "Module: tsconfig.json"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+8 more)

### Community 13 - "Module: scripts"
Cohesion: 0.18
Nodes (11): scripts, build:pwa, dev, preview:pwa, server, start, studio, test (+3 more)

### Community 14 - "Project Brain & Documentation"
Cohesion: 0.40
Nodes (6): docs/ANALISE.md (Modelos @_k.elsie P1-P8), BRAIN.md (Cérebro Central), docs/CEREBRO.md (Memória e Deploy), docs/COLAB.md (Protocolo Claude ↔ Antigravity), docs/MANUAL.md (Manual de Uso), docs/PLANO_REVISAO.md (Plano Fase 2)

### Community 15 - "Module: overrides"
Cohesion: 0.40
Nodes (5): overrides, adm-zip, sharp, workbox-build, glob

## Knowledge Gaps
- **2 isolated node(s):** `docs/CEREBRO.md (Memória e Deploy)`, `docs/ANALISE.md (Modelos @_k.elsie P1-P8)`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 164 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Cloud Groq Proxy` to `Core Domain (grouping)`, `Module: @huggingface/transformers`, `Remotion Render & Masks (CaptionComposition)`, `Express Local Server (render)`, `Module: package.json`, `Person Segmentation & Masks`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `docs/CEREBRO.md (Memória e Deploy)`, `docs/ANALISE.md (Modelos @_k.elsie P1-P8)` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Domain (grouping)` be split into smaller, more focused modules?**
  _Cohesion score 0.05584158415841584 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Module: dependencies` to `Core Domain (grouping)`, `Module: @huggingface/transformers`, `Module: @fontsource/black-ops-one@5.`, `Module: package.json`, `Module: @remotion/cli@4.0.540`, `Module: @fontsource/abril-fatface@5.`, `Module: @fontsource/alfa-slab-one@5.`, `Module: @fontsource/allura@5.3.0`, `Module: @fontsource/archivo-black@5.`, `Module: @fontsource/bangers@5.3.0`, `Module: @fontsource/bebas-neue@5.3.0`, `Module: @fontsource/bowlby-one-sc@5.`, `Module: @fontsource/bungee@5.3.0`, `Module: @fontsource/dela-gothic-one@`, `Module: @fontsource/great-vibes@5.3.`, `Module: @fontsource/league-gothic@5.`, `Module: @fontsource/monoton@5.3.0`, `Module: @fontsource/parisienne@5.3.0`, `Module: @fontsource/permanent-marker`, `Module: @fontsource/playfair-display`, `Module: @fontsource/prata@5.3.0`, `Module: @fontsource/press-start-2p@5`, `Module: @fontsource/russo-one@5.3.0`, `Module: @fontsource/sacramento@5.3.0`, `Module: @fontsource/shrikhand@5.3.0`, `Module: @fontsource/titan-one@5.3.0`, `Module: @fontsource-variable/archivo`, `Module: @fontsource-variable/big-sho`, `Module: @fontsource-variable/bodoni-`, `Module: @fontsource-variable/caveat@`, `Module: @fontsource-variable/cinzel@`, `Module: @fontsource-variable/cormora`, `Module: @fontsource-variable/dm-sans`, `Module: @fontsource-variable/fraunce`, `Module: @fontsource-variable/inter@5`, `Module: @fontsource-variable/manrope`, `Module: @fontsource-variable/montser`, `Module: @fontsource-variable/orbitro`, `Module: @fontsource-variable/outfit@`, `Module: @fontsource-variable/playfai`, `Module: @fontsource-variable/space-g`, `Module: @fontsource-variable/syne@5.`, `Module: @fontsource-variable/unbound`, `Module: @fontsource/yellowtail@5.3.0`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `Core Domain (types)` be split into smaller, more focused modules?**
  _Cohesion score 0.05628415300546448 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Core Domain (grouping)` to `Core Domain (types)`, `Module: @huggingface/transformers`, `Platform Abstraction (types)`, `Remotion Render & Masks (CaptionComposition)`, `Module: dependencies`, `Module: @fontsource/black-ops-one@5.`, `Module: package.json`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `Module: @huggingface/transformers` be split into smaller, more focused modules?**
  _Cohesion score 0.06497175141242938 - nodes in this community are weakly interconnected._