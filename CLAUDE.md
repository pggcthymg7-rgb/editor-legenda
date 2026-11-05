# editor-legenda

Editor local de legendas animadas estilo reels (referência: @_k.elsie). Análise dos modelos: `docs/ANALISE.md`.

**Ao retomar: leia primeiro `docs/CEREBRO.md` (estado e arquitetura), depois `docs/PLANO_REVISAO.md` (Fase 2) e `AGENTS.md`. Manual de uso: `docs/MANUAL.md`.**

## Comandos
- Verificação completa: `npm run verify` (tsc + vitest). Nada está pronto sem 0 erros.
- Rodar: `npm run dev` → http://localhost:5173 (API 127.0.0.1:3210)

## Mapa
- `src/core/`: lógica pura e testada: `types`, `presets` (P1–P8), `grouping` (frases e papéis PT-BR), `layout`, `motion`, `exporters` (SRT/ASS), `transcript`, `validate`
- `src/remotion/`: composição (`CaptionComposition.tsx`), fontes locais (`fonts.ts`), `Root.tsx`
- `src/app/`: interface React (Player, lista, painel, export)
- `server/`: Express só em 127.0.0.1. Upload, OpenAI, fila de render, projetos. Segurança: checagem de Host, header `x-editor` (CSRF), `inside()` contra path traversal, `validateProject`
- `tests/`: `core.test.ts`, `server.test.ts`

## Regras
- Estilo é dado (JSON). Modelo novo = entrada em `PRESETS`, não código novo.
- Strings de estilo vão para CSS inline: a validação bloqueia `url(`/script. Não afrouxar.
- Texto atrás da pessoa: `src/app/person/segment.ts` (MediaPipe) → máscaras → `useMask` em `CaptionComposition.tsx`. Opcional por frase (`behind`) e global (`occlusion`).
- Relatório da última entrega: `ENTREGA_PRONTA.md`.
