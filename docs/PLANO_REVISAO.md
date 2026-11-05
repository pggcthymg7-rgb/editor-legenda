# Plano de revisão e auditoria (Fase 2: testes e melhorias)

**Base:** tag `v1.0-etapa1` (branch `main`).
**Equipe:** Claude Code e Antigravity em conjunto.
**Regras para todo ciclo:**
- 1 item por commit;
- `npm run verify` com 0 erros;
- marcar o item `[x]` aqui.

## A. Validação em aparelho real (prioridade máxima; o que não deu para testar na nuvem)
- [ ] A1. Safari no iPhone real, PWA instalada:
  - transcrição pela **Nuvem** (pt, en, auto);
  - transcrição **No aparelho** (base, em CPU);
  - tempo medido para 1 min de vídeo.
- [ ] A2. MOV HEVC 4K 60 fps do iPhone:
  - preview tocando;
  - análise de pessoa;
  - export MP4 verde e MP4 final, sem travar a memória.
- [ ] A3. Importar no **CapCut celular** o MP4 verde e conferir o chroma key.
- [ ] A4. Importar no **Premiere** e no **CapCut desktop** o MOV ProRes 4444 e conferir o alfa; ASS e SRT no Premiere.
- [ ] A5. Mac (Chrome):
  - `npm run dev`;
  - Whisper local na GPU;
  - render no servidor dos 4 formatos e da camada da pessoa.
- [ ] A6. PWA offline depois do 1º uso, com o modelo já baixado (modo avião).

## B. Auditoria de código
- [ ] B1. Revisão geral (skill `engineering:code-review`):
  - `src/app/App.tsx`
  - `components/Timeline.tsx`, `components/Preview.tsx`, `components/PhrasePanel.tsx`
  - `remotion/CaptionComposition.tsx`
- [ ] B2. Tipos: tirar os `as unknown as` / `any` em `platform/device.ts` e `transcribe.ts`.
- [ ] B3. Desempenho:
  - `CaptionComposition` recalcula estilos por quadro → memoizar `resolveWordStyle` e `measureText`;
  - medir FPS do preview com 50 frases.
- [ ] B4. Memória:
  - revogar os blob URLs de máscara e vídeo ao trocar de projeto;
  - limite de cache de `useMask` (150) no iPhone.
- [ ] B5. Lint/format: adicionar ESLint + Prettier (ainda não há) e um CI no GitHub Actions rodando `npm run verify`.
- [ ] B6. Testes de componente (Vitest + Testing Library) para Timeline (arrastar/aparar), FontPicker e ExportPanel.
- [ ] B7. E2E fixos no repositório:
  - levar os scripts Playwright de `scratchpad/` (`e2e-pro`, `e2e-pwa2`, `e2e-local`, `e2e-cloud`) para `tests/e2e/`;
  - comando `npm run e2e`.

## C. Auditoria de segurança (skill `security-review`)
- [ ] C1. Proxy da nuvem (`cloud/proxy.mjs`):
  - limite por IP;
  - header `x-groq-key`;
  - tamanho máximo;
  - CORS;
  - nunca registrar áudio ou chave em log.
- [ ] C2. Trocar a chave do Groq que foi exposta no chat (criar nova direto no Render).
- [ ] C3. Servidor local (`server/`): Host, CSRF `x-editor`, `inside()`, rotas de máscara, CORS só local.
- [ ] C4. CSP da PWA:
  - reavaliar `script-src blob:` e jsDelivr;
  - opção: hospedar o runtime ONNX no próprio app.
- [ ] C5. `validateProject`: rodar fuzz com JSON malicioso (fontes, `url(`, números extremos).
- [ ] C6. `npm audit` (hoje: 4 baixos em `deepmerge`, só no build).

## D. Funcionamento e UX
- [ ] D1. Mensagens de erro claras em todos os fluxos (sem texto técnico para o usuário).
- [ ] D2. Barra de progresso real na transcrição no aparelho (hoje não há progresso durante a inferência).
- [ ] D3. Acessibilidade: navegação por teclado na timeline (mover/aparar com setas), leitor de tela.
- [ ] D4. Desfazer/refazer em todas as ações da Pessoa e do Export.
- [ ] D5. Seletor de fontes no celular: altura do popover e rolagem.
- [ ] D6. Comparação com CapCut/Submagic: emojis animados, B-roll, várias trilhas de legenda.

## E. Infra
- [ ] E1. Deploy automático do Render não dispara: conectar o GitHub ao Render ou usar um Blueprint (`render.yaml`).
- [ ] E2. Mudar o deploy da branch `claude/editor-legendas-v1` para `main` depois da validação.
- [ ] E3. Servidor grátis dorme: avaliar keep-alive ou plano pago se o uso crescer.

## Como reportar
Cada achado: `arquivo:linha`, o problema, como reproduzir, a correção proposta e um teste que prova a correção.
