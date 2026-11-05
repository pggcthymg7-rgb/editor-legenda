# Cérebro da sessão: mapa e resumo

Leia isto antes de retomar o trabalho. Caminhos marcados como (efêmero) somem quando o container é reciclado. O que está no git sobrevive.

## Mapa de pastas

| O quê | Onde |
|---|---|
| Editor de legendas (projeto principal) | `/home/user/editor-legenda`, branch `claude/editor-legendas-v1`, repo `pggcthymg7-rgb/editor-legenda` |
| Análise dos reels + plano | `docs/ANALISE.md` |
| Regras e mapa de código | `CLAUDE.md` |
| Lógica pura (modelos, frases, animação, export) | `src/core/` |
| Composição Remotion e fontes | `src/remotion/` |
| Interface React | `src/app/` |
| Servidor local (upload, OpenAI, render) | `server/` |
| Testes (70) | `tests/` (`core`, `server`, `device`, `edit`, `mask`) |
| Relatório de entrega | `ENTREGA_PRONTA.md`, `BACKLOG_TAREFAS.md` |
| UI profissional | `src/app/components/` (`Timeline`, `Preview` = monitor, `PhrasePanel` = inspetor, `Library`, `PersonPanel`, `FontPicker`, `ExportPanel`) |
| Edição pura (timeline) | `src/core/edit.ts`; máscara: `src/core/mask.ts`; fontes: `src/core/fonts.ts` (58) |
| Pessoa (segmentação) | `src/app/person/segment.ts` + `public/models/` + plugin `mediapipe` no `vite.config.ts` |
| Camada Mac × iPhone | `src/app/platform/` (`mac.ts`, `device.ts`, `idb.ts`, `audio.ts`, `openai-browser.ts`) |
| PWA iPhone (site) | https://editor-legenda.onrender.com (Render static `srv-dbluvl88v5cc73d1d3j0`, build `build:pwa` → `dist-pwa`) |
| Dados de execução (vídeos, renders, projetos) | `data/` (fora do git) |
| Bot de imóveis (outro projeto) | `/home/user/secretaria-imoveis-whatsapp`, branch `claude/skills-find-caveman` |
| Skills find-skills + caveman | `secretaria-imoveis-whatsapp/.claude/skills/` |
| Skills Remotion + ffmpeg | `editor-legenda/.claude/skills/` |
| Reels de referência (6 mp4) (efêmero) | `/root/.claude/uploads/1fb9c1c7-0502-54dc-a80e-5974d212e086/` |
| Atalhos v1–v6, grades de quadros (efêmero) | `/tmp/claude-0/-home-user-secretaria-imoveis-whatsapp/1fb9c1c7-0502-54dc-a80e-5974d212e086/scratchpad/reels/` |

Mapa v1–v6 (prefixo do arquivo enviado): v1 `24a23180`, v2 `5ac019f4`, v3 `88dd67b3`, v4 `bc375648`, v5 `cab1a471`, v6 `d9827f4c`.

## Resumo

Instalamos as skills `find-skills` (Vercel) e `caveman` no bot de imóveis. O caveman deixa as respostas curtas, em português.

O usuário quer um editor que reproduza as legendas dos reels de @_k.elsie, totalmente editáveis e exportáveis como camada. O Instagram bloqueou o acesso automático. O usuário enviou 6 reels, que analisei por grade de quadros e tiras a 10 fps, só nos trechos com legenda. Achei 8 modelos (P1–P8). Cada frase vira um bloco de 2 a 4 linhas: palavras de ligação pequenas, palavra-chave grande. Fontes misturadas: serif, itálico lilás em degradê, sans fina, sans bold em arco, número neon. Entrada com desfoque subindo em cerca de 250 ms, saída com desfoque. Há texto atrás da pessoa. Ela provavelmente edita no After Effects.

Decisões: roda local no Mac. Transcrição por Whisper WebGPU no Chrome ou API OpenAI opcional. Português BR. Remotion para preview e render. Fontes locais (@fontsource). Repo separado.

Construído e verificado (fases 1–4):
- upload e transcrição;
- agrupamento em frases com papéis;
- modelos guardados como dados;
- editor com lista de frases, abas Frase/Estilo/Palavras, arrastar no preview, desfazer e salvar automático;
- exports MOV ProRes 4444 transparente, WebM transparente, MP4 verde, MP4 final, SRT e ASS;
- servidor só local, com proteção contra pedidos de outros sites e contra acesso a arquivos fora da pasta;
- 41 testes passando, `npm audit` sem vulnerabilidades.

Bugs corrigidos: largura do bloco, frases saindo da tela (encolhe para caber), pacote de render desatualizado, cor do ASS.

Não testado aqui: Whisper local (sem GPU), chamada real da OpenAI, importação no Premiere/CapCut.

Pendente: fase 5, texto atrás da pessoa (MediaPipe ou Robust Video Matting, com export com e sem oclusão). Também abrir PR para a `main`, se o usuário pedir.

## Sessão 2: PWA para iPhone

O usuário pediu para rodar no iPhone como app (PWA), com tudo no aparelho, sem o Mac.

Feito:
- **Camada `platform`, escolhida no build:** `VITE_TARGET=device` (arquivo `.env.pwa`) usa a versão do aparelho.
  - Vídeo guardado no IndexedDB como `local:<id>`; projetos também no IndexedDB.
  - OpenAI chamada direto do navegador, com a chave do usuário guardada no localStorage.
  - Áudio extraído com o mediabunny.
  - Render no navegador com `@remotion/web-renderer`: MP4 verde, MP4 final e WebM transparente, quando o aparelho suporta. MOV só no Mac.
- **Composição:** usa `Video` de `@remotion/media`. O render no servidor do Mac foi testado de novo e continua funcionando.
- **PWA:** `vite-plugin-pwa`, ícones em `public/icons`, CSP via meta e funcionamento offline.
- **Celular:** layout em uma coluna abaixo de 900px, wake lock e Compartilhar do iOS no export.
- **Teste:** Playwright com perfil iPhone 15 (Chromium): upload, edição, arrastar, MP4 verde e final, projeto salvo e offline. Tudo passou.
- **Dependências:** vite 6.4.5 e vitest 4.1.12. Usar npm 11 (`packageManager`), porque o npm 10 quebra com o erro `edgesOut`.

Pendente:
- testar no iPhone real, com WebKit;
- fase 5 (texto atrás da pessoa);
- PR para a `main`.

## Sessão 3: noturna autônoma (/resolver-tudo)

Pedido: terminar o projeto sem perguntar.
- auditar;
- layout de editor profissional;
- legenda atrás da pessoa, opcional, com camada da frente;
- mais fontes grátis;
- palavra individual com escala X/Y;
- comparar com CapCut, Premiere e Submagic.

Feito, com detalhes em `ENTREGA_PRONTA.md`:
- **Layout NLE:** biblioteca, monitor, inspetor e timeline com aparar, encaixe, zoom e forma de onda. Usamos as skills `web-design-guidelines` e `ui-ux-pro-max`.
- **Edição:** 58 fontes OFL com seletor visual, karaokê e caixa de fundo.
- **Pessoa:** MediaPipe segmenta no navegador e gera uma máscara JPEG por quadro.
  - Mac: as máscaras vão para o servidor (`/api/masks`).
  - iPhone: as máscaras ficam no IndexedDB (store `masks`, DB versão 2).
  - Na composição, a frase com `behind` recebe um `mask-image` com buraco onde está a pessoa. A camada `layer: 'person'` exporta só a pessoa.
- **Testes:** e2e no desktop e no iPhone passaram e a auditoria foi feita.

Atenção ao testar:
- O `vite preview` não serve `/mediapipe/` (404). Para testar a PWA use um servidor estático, por exemplo `python3 -m http.server --directory dist-pwa`. No Render funciona.
