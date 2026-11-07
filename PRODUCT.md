# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(PWA instalada no iPhone é a experiência principal; a versão Mac roda a mesma interface no Chrome com servidor local.)

## Users
- **Hoje:** o próprio autor (João Gabriel), editando seus reels no iPhone, no dia a dia, e no Mac quando precisa de render pesado ou ProRes.
- **Depois:** criadores de conteúdo e social media em geral (planejado em `docs/ESCALA_FUTURA.md`; ainda não aberto ao público).
- Trabalho: pegar um vídeo falado, transcrever, aplicar legenda animada no estilo reels, ajustar frase a frase / palavra a palavra e exportar.

## Product Purpose
Editor de legendas animadas estilo reels (referência: @_k.elsie). Transcreve o vídeo, gera legendas com 8 modelos tipográficos, permite editar cada frase e palavra, coloca a legenda atrás da pessoa e exporta em camadas. Sucesso = um reel legendado com qualidade de motion designer, feito no celular. **Pendente:** meta de tempo/métrica de sucesso não definida.

## Positioning
Combinação que um app genérico de legenda não entrega junto:
1. **Legenda atrás da pessoa** (MediaPipe no próprio aparelho, máscara por quadro).
2. **Fidelidade aos 8 modelos P1–P8** tipográficos, com estilo tratado como dado (JSON em `PRESETS`).
3. **Export em camadas** (ProRes alfa, SRT, ASS) para Premiere e CapCut.
4. **Tudo roda no iPhone** (PWA, vídeo e máscaras no IndexedDB, render no navegador), com transcrição grátis na nuvem (Groq) ou no aparelho.
Todos os quatro são inegociáveis.

## Operating Context
- iPhone Safari como PWA ("Adicionar à Tela de Início"); toque, telas pequenas, memória limitada (áudio/vídeo em streaming via mediabunny).
- Mac: `npm run dev`, Chrome, Express em 127.0.0.1, render com `@remotion/renderer`.
- Fluxo: upload → idioma → transcrição (nuvem/aparelho) → editor (Library, Preview/monitor, PhrasePanel, Timeline) → export.
- Referência de UX mobile: CapCut (branch `refactor/mobile-capcut-ux`).

## Capabilities and Constraints
- Estilo é dado: modelo novo = entrada em `PRESETS`, não código.
- Strings de estilo vão para CSS inline; a validação bloqueia `url(`/script — não afrouxar.
- Paridade de composição entre preview, render Mac e render no navegador (mesma `CaptionComposition`).
- Render no iPhone limitado a 1080 px de largura; Safari sem WebGPU no ONNX (usa CPU).
- 58 fontes OFL locais.
- Idiomas de transcrição: PT, EN, ES, auto. Interface em PT-BR.
- Divisão de papéis: Antigravity cuida de UI/UX/front-end; Claude Code do core, motor, segurança e deploy.

## Brand Commitments
- Nome em uso: "Editor de Legendas" / `editor-legenda`. Interface e textos em PT-BR.
- **Pendente:** nome final de produto, logo, tom de voz da marca e identidade visual oficial (nada disso foi confirmado; não inventar).

## Evidence on Hand
- Análise dos modelos de referência: `docs/ANALISE.md`.
- Manual completo de botões: `docs/MANUAL.md`.
- Sem depoimentos, clientes, métricas ou preços — não inventar.

## Product Principles
1. O celular é o estúdio: toda decisão de interface parte do iPhone.
2. Qualidade de motion designer, não de app de legenda automática.
3. Estilo é dado, não código.
4. Privado e local por padrão; a nuvem é só para transcrever áudio.
5. Saída profissional: o que sai daqui entra limpo no Premiere/CapCut.

## Accessibility & Inclusion
**Pendente:** nenhum requisito específico (ex.: WCAG, tamanho mínimo de toque, leitor de tela) foi confirmado ainda.

## Open Decisions
- Público externo: quando e para quem abrir (ver `docs/ESCALA_FUTURA.md`) — pendente.
- Monetização/preço — pendente.
