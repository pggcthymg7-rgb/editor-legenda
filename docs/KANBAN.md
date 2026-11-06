# 📋 Kanban Oficial do Projeto — `editor-legenda`

> **Regra Obrigatória para Agentes (`Antigravity` & `Claude Code`)**:
> Sempre que qualquer tarefa for planejada, colocada na fila, iniciada, entrar em correção, for finalizada ou descartada, **atualize obrigatoriamente este arquivo (`docs/KANBAN.md`) e o painel visual (`public/kanban.html`)**.
> - **Painel Visual Interativo (Navegador):** `http://127.0.0.1:5173/kanban.html`

---

## 👥 0. Quadro de Funções de Fácil Acesso (Quem Faz o Quê + Mapa do Editor)

### 🎨 Divisão de Papéis: Antigravity vs. Claude Code
| Área / Especialidade | Quem Cuida | O que faz na prática (Popular) | Onde atua no código (Engenharia) |
|---|---|---|---|
| **🎨 Design UI/UX, Layout & Mobile (CapCut)** | **Antigravity** *(Líder de Design)* | Cuida de toda a beleza visual, cores, tipografia, botões, layout fixo no iPhone, alças de girar/aumentar no vídeo e experiência fácil de usar. | `src/app/styles.css`, `Preview.tsx`, `Timeline.tsx`, `PhrasePanel.tsx`, `StyleEditor.tsx`, `FontPicker.tsx` + skills `ui-ux-pro-max` e `web-design-guidelines`. |
| **✨ Modelos Visuais (P1–P8), Karaokê 2.0 & Emojis** | **Antigravity** *(com apoio do Claude no export ASS)* | Cria e ajusta o visual das legendas animadas, o efeito de "pulinho" na palavra falada e a sugestão inteligente de emojis. | `src/core/presets.ts`, `src/core/emojis.ts`, `src/core/motion.ts`, `Library.tsx`. |
| **⚙️ Motor Pesado, Memória & Segurança** | **Claude Code** *(Líder de Core/Infra)* | Cuida para o app não travar a memória do iPhone em vídeos 4K, sincroniza a máscara da pessoa quadro a quadro e bloqueia invasões. | `src/app/waveform.ts`, `CaptionComposition.tsx` (`useMask`), `src/core/validate.ts`, `cloud/proxy.mjs`. |
| **☁️ Servidor Mac, FFmpeg & Deploy Render** | **Claude Code & Antigravity** | Cuida da gravação do vídeo final em MP4/ProRes no Mac e publica as atualizações na nuvem (Render) para o iPhone. | `server/render.ts`, `server/index.ts`, MCP Render (`srv-dbluvl88v5cc73d1d3j0` e `srv-dbm632rm8hqs73erfa10`). |
| **🧪 Qualidade Total & Kanban Vivo** | **Conjunto (Ambos)** | Um revisa o código do outro (`docs/COLAB.md`), rodam os **114 testes** (`npm run verify`) e mantêm este Kanban atualizado. | `tests/*.test.ts`, `docs/KANBAN.md`, `public/kanban.html`. |

---

### 🕹️ Mapa Rápido de Funções do Aplicativo ("Para que serve cada parte da tela")
| Função / Tela do Editor | 🗣️ O que faz (Linguagem Popular) | 🔧 Arquivo Responsável (Engenharia) |
|---|---|---|
| **1. Tela de Entrada & Transcrição** | Recebe seu vídeo (`.mov`/`.mp4`), extrai o som sem travar o aparelho e transforma a voz em texto com tempo exato de cada palavra (Nuvem Groq grátis ou Offline no aparelho). | [`UploadScreen.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/UploadScreen.tsx), [`cloud.ts`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/cloud.ts), [`transcribe.ts`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/transcribe.ts) |
| **2. Monitor de Vídeo Interativo** | Mostra o vídeo ao vivo com a legenda. Permite arrastar a frase, alinhar no centro com **ímã automático (50%)**, **aumentar/diminuir pelo canto** e **girar pelo topo**. | [`Preview.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/Preview.tsx), [`CaptionComposition.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/remotion/CaptionComposition.tsx) |
| **3. Linha do Tempo (Timeline)** | Mostra as ondas de som do vídeo e os bloquinhos de cada frase/palavra para você puxar o início, o fim ou dividir com a tecla `S`. | [`Timeline.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/Timeline.tsx), [`waveform.ts`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/waveform.ts), [`edit.ts`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/core/edit.ts) |
| **4. Biblioteca Lateral (Esquerda)** | Tem 4 abas: **Frases** (lista de falas), **Modelos** (P1 a P8 com prévia animada + seus modelos salvos), **Texto** (buscar e substituir palavras) e **Pessoa** (IA que recorta você para pôr a legenda atrás). | [`Library.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/Library.tsx), [`PhraseList.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/PhraseList.tsx), [`PersonPanel.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/PersonPanel.tsx) |
| **5. Inspetor (Direita — 5 Abas)** | Onde você personaliza tudo: **Frase** (texto, posição, escala, 3D, emojis), **Estilo** (58 fontes, cores, degradê, borda, sombra, caixa), **Animação** (pop, slide, máquina de escrever), **Karaokê** (cor e pulo da palavra falada) e **Palavra** (ajuste individual e corte `✂`). | [`PhrasePanel.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/PhrasePanel.tsx), [`StyleEditor.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/StyleEditor.tsx), [`FontPicker.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/FontPicker.tsx) |
| **6. Exportação Profissional** | Baixa o vídeo pronto (MP4), só a legenda com fundo transparente (ProRes 4444 / WebM), só a pessoa recortada ou arquivos `.srt` e `.ass`. | [`ExportPanel.tsx`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/app/components/ExportPanel.tsx), [`server/render.ts`](file:///Users/joaogabrielzava/Projetos/editor-legenda/server/render.ts), [`exporters.ts`](file:///Users/joaogabrielzava/Projetos/editor-legenda/src/core/exporters.ts) |

---

## 📣 Mini-Guia: Como Avisar o Claude Code que é Sobre Este Projeto

Já deixamos configurado um **atalho global automático** no seu Mac (`/Users/joaogabrielzava/.claude/CLAUDE.md`). Você tem **3 jeitos super fáceis** de acionar o Claude Code:

### Opção 1: O Atalho Curto (De qualquer lugar do Mac)
Basta abrir o Claude e digitar:
```text
voltar legenda
```
*(Ao ler essas duas palavras, o Claude já carrega automaticamente a pasta `/Users/joaogabrielzava/Projetos/editor-legenda`, lê o `CLAUDE.md`, o `BRAIN.md` e este `docs/KANBAN.md`!)*

### Opção 2: Mensagem Completa Pronta para Copiar e Colar (Quando quiser pedir uma tarefa direta)
Se quiser já passar uma instrução completa para ele, copie e cole este bloco:
```text
voltar legenda — Estamos no projeto Editor de Legendas (/Users/joaogabrielzava/Projetos/editor-legenda). Leia primeiro CLAUDE.md, BRAIN.md e docs/KANBAN.md. Ao concluir qualquer alteração, rode npm run verify (0 erros) e atualize obrigatoriamente docs/KANBAN.md e public/kanban.html com Linguagem Popular, Engenharia de Software, O que altera, Qual era o erro e Resultado final. Minha solicitação é:
```

### Opção 3: Pelo Terminal direto na pasta do projeto
Se quiser abrir o Claude Code pelo Terminal já dentro da pasta certa:
```bash
cd /Users/joaogabrielzava/Projetos/editor-legenda && claude
```

---

## 📊 Resumo de Status Atual
| Aba / Coluna | Quantidade | Descrição |
|---|:---:|---|
| 🧠 **1. Em Planejamento** | `0` | Plano da Fase 3 aprovado e concluído. |
| ⏳ **2. Na Fila** | `0` | Todos os 5 lotes (`UI-L1` a `UI-L5`) foram concluídos. |
| ⚡ **3. Em Execução** | `0` | Nenhum lote pendente no momento. |
| 🛠️ **4. Em Correção** | `0` | Tarefas que falharam no `npm run verify` ou no teste real e estão sendo ajustadas. |
| ✅ **5. Finalizado** | `28` | Tarefas 100% concluídas e validadas no `npm run verify` (`114/114 testes`). |
| 🗑️ **6. Descartado** | `3` | Abordagens ou pacotes descartados por incompatibilidade técnica ou redundância. |

---

## 🧠 1. Em Planejamento
*(Plano aprovado e 100% executado)*

---

## ⏳ 2. Na Fila (Branch `feat/ui-capcut-mobile`)
*(Fila zerada — todos os lotes `UI-L1` a `UI-L5` foram finalizados)*

---

## ⚡ 3. Em Execução
*(Nenhuma tarefa em execução no momento)*

---

## 🛠️ 4. Em Correção
*(Nenhum bug em aberto — `npm run verify` com 0 erros)*

---

## ✅ 5. Finalizado (Histórico Completo de Engenharia & Explicação Popular)

### [UI-L5] Barra Contextual Inferior (Dock `64px` ↔ Slide-up de Seleção) + Bottom Sheets (`45dvh`) no Mobile (`App.tsx`, `Library.tsx`, `styles.css`)
- **Responsável:** Antigravity | **Categoria:** UI/UX & Mobile | **Status:** Finalizado
- **🗣️ Explicação Popular:** Eliminamos aqueles dois botões grandes fixos (`Inspetor` | `Frases e modelos`) e a tela vazia quando nenhuma legenda estava selecionada. No lugar deles, entrou uma barra inteligente estilo CapCut no rodapé (`64px`): sem legenda selecionada, ela mostra ícones claros (`+ Texto`, `Modelos`, `Frases`, `Buscar`, `Pessoa`, `Na agulha`); quando você toca numa legenda, a barra desliza mostrando as ações daquela legenda (`Editar`, `Modelos`, `Dividir`, `Duplicar`, `Excluir`, `Fechar`), abrindo o Inspetor ou a Biblioteca numa gaveta de `45%` da altura sem cobrir o vídeo!
- **🔧 Engenharia de Software:** Em `src/app/App.tsx`, `src/app/components/Library.tsx` e `src/app/styles.css`, substituímos no mobile a `.mobile-tabs` e o `.empty-inspector` por `.mobile-dock` (`~64px`, ícones `20px` + micro-label `11px`) com animação `dock-slide-up` (`cubic-bezier(0.32, 0.72, 0, 1)`) e Bottom Sheets fixas de `45dvh` (`data-msheet='inspetor' | 'biblioteca' | 'none'`) usando `transform: translateY(115%)` quando fechadas para manter `PersonPanel` 100% montado no DOM.
- **🔄 O que altera no App:** Ergonomia idêntica ao CapCut Mobile: zero área morta, ferramentas autoexplicativas no rodapé e vídeo sempre visível acima das gavetas.
- **🐛 Qual era o Erro (Antes):** Dois botões gigantes ocupavam o meio da tela e, sem seleção, metade da tela do celular ficava ocupada pela mensagem vazia `"Selecione uma legenda..."`.
- **✅ Resultado Final (Depois):** Dock contextual + Slide-up + Bottom Sheets `45dvh` operacionais no mobile, layout NLE de 3 colunas intacto no Desktop e `npm run verify` com 0 erros.
- **📂 Arquivos:** `src/app/App.tsx`, `src/app/components/Library.tsx`, `src/app/styles.css`.

### [UI-L4] Timeline Estilo CapCut: Pílulas (`8px`), Pinch-to-Zoom Touch e Limpeza Visual (`Timeline.tsx` + `styles.css`)
- **Responsável:** Antigravity | **Categoria:** UI/UX & Mobile | **Status:** Finalizado
- **🗣️ Explicação Popular:** Deixamos os bloquinhos das legendas, palavras e áudio na linha do tempo com formato de pílulas arredondadas (`8px`), seleção destacada em azul-índigo (`#6366F1`) e adicionamos o gesto de pinça com 2 dedos para aproximar/afastar o zoom na tela do celular, escondendo os botões `+` e `−` no mobile.
- **🔧 Engenharia de Software:** Em `src/app/components/Timeline.tsx` e `src/app/styles.css`, aplicamos `border-radius: 8px` em `.clip`, `.wclip` e `.vclip`, seleção em `--primary` com halo luminoso, agulha `.playhead` fluida com brilho sutil, gesto `onTouchStart`/`onTouchMove` de 2 dedos em `.tl-scroll` invocando o handler `zoom(factor)` já existente, e ocultamos os botões `Minus`/`Plus` no mobile (`hide-sm`) mantendo `Magnet` (Snap) e `ZoomIn` (Ajustar ao vídeo).
- **🔄 O que altera no App:** Zoom natural com dois dedos na timeline do iPhone e visual moderno de pílulas arredondadas estilo CapCut (`~32dvh`).
- **🐛 Qual era o Erro (Antes):** No celular não havia gesto de pinça na timeline (dependia dos botões `+` e `−` na barra) e os blocos tinham cantos retos (`5px`).
- **✅ Resultado Final (Depois):** Pinch-to-zoom funcional chamando `zoom()`, pílulas de `8px` e `npm run verify` com 0 erros.
- **📂 Arquivos:** `src/app/components/Timeline.tsx`, `src/app/styles.css`.

### [UI-L3] Casca do Editor Mobile (`48px` Header + `42%` Monitor + `36px` Faixa de Transporte)
- **Responsável:** Antigravity | **Categoria:** UI/UX & Mobile | **Status:** Finalizado
- **🗣️ Explicação Popular:** Organizamos o topo e o meio da tela no celular: uma barra superior compacta (`48px`) com botão de voltar (`ChevronLeft`), nome do projeto truncado, desfazer/refazer, indicador discreto de salvamento e o botão verde `"Exportar"`; logo abaixo, o vídeo grande ocupando `42%` da tela e uma faixa única de `36px` com todos os controles de reprodução (`Play/Pause` em pílula destacada, avançar/voltar quadro, tempo, som, área segura e grade de terços).
- **🔧 Engenharia de Software:** Em `src/app/App.tsx`, `src/app/components/Preview.tsx` e `src/app/styles.css`, posicionamos o botão `.back-btn` à esquerda do input `.name` com `ChevronLeft` no mobile (`.only-sm`) e `FilePlus2` no desktop (`.hide-sm`), aplicamos `.export-cta` (`--accent-export: #10B981`) no botão `"Exportar"`, `.viewer` com `42dvh` no mobile e `.transport` de `36px` com ícones de `18px` e `.play` destacado em `--primary`.
- **🔄 O que altera no App:** Dá mais área útil ao vídeo no celular e cria hierarquia imediata para o Play/Pause e para o botão Exportar.
- **🐛 Qual era o Erro (Antes):** Botão Exportar usava a mesma cor de seleção (`primary`), o botão de voltar ficava no meio da topbar e o Play/Pause não tinha destaque visual na barra de transporte.
- **✅ Resultado Final (Depois):** Header `48px`, Monitor `42dvh` e Transporte `36px` validados no `npm run verify` com 0 erros.
- **📂 Arquivos:** `src/app/App.tsx`, `src/app/components/Preview.tsx`, `src/app/styles.css`.

### [UI-L2] Home Limpa com Revelação Progressiva via Bottom Sheet (`UploadScreen.tsx` + `styles.css`)
- **Responsável:** Antigravity | **Categoria:** UI/UX & Mobile | **Status:** Finalizado
- **🗣️ Explicação Popular:** Ao abrir o aplicativo, a tela inicial agora destaca apenas a grande área `"Toque para escolher o vídeo"` e a lista de `"Projetos salvos"`. Assim que você escolhe um vídeo (ou toca no ícone de opções), sobe uma gaveta suave (Bottom Sheet) com as configurações de idioma, nuvem/offline e o botão `"Criar legendas"`.
- **🔧 Engenharia de Software:** Em `src/app/components/UploadScreen.tsx` e `src/app/styles.css`, preservados 100% dos estados (`file`, `engine`, `model`, `cloud`, `lang`, `openai`, `busy`, `msg`, `progress`, `error`, `saved`) e handlers (`start`, `remove`, `GroqKeyBox`, `KeySettings`), movendo o `<fieldset>` de transcrição e o CTA `.primary` para `.home-sheet` com transição `cubic-bezier(0.32, 0.72, 0, 1)`.
- **🔄 O que altera no App:** Primeira impressão limpa e intuitiva, sem formulário técnico exposto antes de escolher o vídeo.
- **🐛 Qual era o Erro (Antes):** Todas as opções de motores, rádios e chaves apareciam abertas na tela inicial antes mesmo do usuário escolher um vídeo.
- **✅ Resultado Final (Depois):** Home limpa + Bottom Sheet funcional validado no `npm run verify` com 0 erros.
- **📂 Arquivos:** `src/app/components/UploadScreen.tsx`, `src/app/styles.css`.

### [UI-L1] Tokens de Tema Slate/Indigo/Emerald e Tipografia (`src/app/styles.css` + `src/app/main.tsx`)
- **Responsável:** Antigravity | **Categoria:** UI/UX & Mobile | **Status:** Finalizado
- **🗣️ Explicação Popular:** Trocamos as cores escuras antigas por uma paleta moderna de editor profissional (azul-ardósia profundo `#0F172A`, destaque índigo `#6366F1` e verde-esmeralda `#10B981`), carregando as fontes variáveis Inter e Outfit e aplicando efeito de vidro fosco (`blur`) nos modais e seletores.
- **🔧 Engenharia de Software:** Definidos tokens globais `--bg-app: #0F172A`, `--bg-surface: #1E293B`, `--bg-elevated: rgba(30, 41, 59, 0.88)` com `backdrop-filter: blur(16px)`, `--primary: #6366F1`, `--accent-export: #10B981`, `--danger: #EF4444`, `--text-primary: #F8FAFC`, `--text-muted: #94A3B8`, curva `--ease-sheet: cubic-bezier(0.32, 0.72, 0, 1)` e imports de `@fontsource-variable/inter` e `@fontsource-variable/outfit` em `main.tsx`.
- **🔄 O que altera no App:** Nova identidade visual limpa, moderna e com contraste de estúdio no Mac e no iPhone, sem alterar nenhuma regra de negócio.
- **🐛 Qual era o Erro (Antes):** Tema antigo sem hierarquia cromática separada entre seleção (`--primary`) e CTA de exportação (`--accent-export`) e cores hardcoded (`#0b0b0e`, `#211d2e`).
- **✅ Resultado Final (Depois):** Tokens aplicados em `src/app/styles.css` e `src/app/main.tsx`, `npm run verify` com 0 erros.
- **📂 Arquivos:** `src/app/styles.css`, `src/app/main.tsx`.

### [ETAPA-1] Fundação do Editor de Legendas (Mac + iPhone PWA + Nuvem)
- **Responsável:** Claude Code | **Categoria:** Arquitetura Base | **Commit:** `4d63a18`
- **🗣️ Explicação Popular:** Construção inicial do aplicativo completo de legendas animadas estilo Reels, funcionando tanto no computador (Mac) quanto no celular (iPhone) e transcrevendo a voz automaticamente.
- **🔧 Engenharia de Software:** Arquitetura modular separando domínio puro (`src/core/`), composição declarativa Remotion (`src/remotion/CaptionComposition.tsx`), abstração de plataforma (`mac.ts` via Express + `@remotion/renderer` vs `device.ts` via IndexedDB + `@remotion/web-renderer`) e proxy serverless para Groq Whisper (`cloud/proxy.mjs`).
- **🔄 O que altera no App:** Permite enviar vídeos, transcrever áudio com tempos por palavra, aplicar modelos P1–P8, posicionar legenda atrás da pessoa e exportar MP4/MOV/SRT/ASS.
- **🐛 Qual era o Erro (Antes):** Projeto ainda não existia (zero absoluto).
- **✅ Resultado Final (Depois):** Base funcional entregue com 82 testes unitários e 8 modelos visuais (P1 a P8).
- **📂 Arquivos:** `src/core/*`, `src/remotion/*`, `src/app/*`, `server/*`, `cloud/proxy.mjs`.

---

### [INFRA-01] Cérebro Central (`BRAIN.md`) + Grafo AST (`graphify`)
- **Responsável:** Antigravity | **Categoria:** Qualidade & Infra | **Commit:** `33c09f0`
- **🗣️ Explicação Popular:** Criamos um "mapa de GPS" completo do projeto para que qualquer inteligência artificial (Antigravity ou Claude) saiba exatamente onde fica cada botão, regra e arquivo sem precisar procurar às cegas e sem gastar tokens à toa.
- **🔧 Engenharia de Software:** Extração de grafo de conhecimento via AST (`graphify-out/GRAPH_REPORT.md`) mapeando 640 nós, 1.489 arestas, 57 comunidades e 0 ciclos de importação (`0 circular dependencies`), consolidado na matriz de roteamento rápido do `BRAIN.md`.
- **🔄 O que altera no App:** Acelera qualquer manutenção futura, reduz o consumo de tokens e documenta as invariantes de segurança.
- **🐛 Qual era o Erro (Antes):** Não havia mapa unificado de dependências nem grafo navegável na raiz do repositório.
- **✅ Resultado Final (Depois):** `BRAIN.md` e `graphify-out/GRAPH_REPORT.md` integrados e sincronizados com as skills em `.agents/skills/`.
- **📂 Arquivos:** `BRAIN.md`, `graphify-out/GRAPH_REPORT.md`, `.agents/skills/*`.

---

### [C-01] Exportação da Camada "Pessoa (frente)" no iPhone com Oclusão Desligada
- **Responsável:** Antigravity | **Categoria:** Motor Remotion & Exportação | **Severidade:** Crítica | **Commit:** `8ab8bf9`
- **🗣️ Explicação Popular:** No iPhone, se você recortasse a pessoa do vídeo, mas desligasse o botão "Ativar efeito" na hora de editar e depois pedisse para exportar só o vídeo da pessoa recortada, o vídeo saía totalmente vazio. Agora ele exporta a pessoa recortada normalmente.
- **🔧 Engenharia de Software:** `App.tsx` filtrava `activeMasks` por `occlusionOn` e repassava o resultado para `ExportPanel`. Quando `occlusion=false`, `ExportPanel` tentava buscar máscaras usando `playable.video.src` (`blob:...`), falhando no regex `LOCAL_SRC` (`/^local:/`) de `device.ts`. Separamos `personMasks={maskUrls}` (bruto) de `activeMasks` (filtrado para o preview).
- **🔄 O que altera no App:** O botão de exportar a camada `"Pessoa (frente)"` funciona sempre que houver análise de pessoa salva, mesmo que o efeito na legenda esteja desativado no preview.
- **🐛 Qual era o Erro (Antes):** `platform.maskUrls("blob:...")` retornava `[]` no iPhone quando `occlusion=false`, gerando vídeo transparente sem pessoa.
- **✅ Resultado Final (Depois):** `ExportPanel` recebe `personMasks={maskUrls}` diretamente de `App.tsx`.
- **📂 Arquivos:** `src/app/App.tsx`, `src/app/components/ExportPanel.tsx`, `tests/fase2-lote1.test.ts`.

---

### [C-02] Forma de Onda em Streaming (`waveform.ts`) sem Estourar a RAM do iPhone
- **Responsável:** Claude Code | **Categoria:** Performance & Memória | **Severidade:** Crítica | **Commit:** `b88db79`
- **🗣️ Explicação Popular:** Antes, para desenhar aquelas barrinhas de som (forma de onda) na linha do tempo, o aplicativo tentava carregar o vídeo inteiro de uma vez na memória do celular. Em vídeos grandes (4K), isso travava o iPhone. Agora ele lê o som em pedacinhos leves sem pesar na memória.
- **🔧 Engenharia de Software:** Substituição de `fetch(url).arrayBuffer()` + `ctx.decodeAudioData(buf)` pelo pipeline de streaming por pacotes `AudioSampleSink` do `mediabunny` (16 kHz mono), com limite de segurança de 64 MB no fallback, fechamento garantido do `AudioContext` em bloco `finally` e cache LRU de 8 entradas.
- **🔄 O que altera no App:** Vídeos 4K longos abrem na linha do tempo do iPhone e do Mac sem travar a aba do Safari/Chrome e sem vazar contextos de áudio.
- **🐛 Qual era o Erro (Antes):** Alocação integral do arquivo MOV/MP4 em memória RAM e vazamento de `AudioContext` em vídeos sem faixa de som.
- **✅ Resultado Final (Depois):** Extração em streaming testada inclusive com vídeo real 4K de 84,8 MB (`video teste.mov`).
- **📂 Arquivos:** `src/app/waveform.ts`, `tests/edit.test.ts`.

---

### [C-03] Ciclo de Vida `delayRender` / `continueRender` na Máscara da Pessoa (`useMask`)
- **Responsável:** Claude Code | **Categoria:** Motor Remotion | **Severidade:** Crítica | **Commit:** `b88db79`
- **🗣️ Explicação Popular:** Na hora de gerar o vídeo final com a legenda atrás da pessoa, o gravador às vezes tirava a "foto" do quadro um milissegundo antes da máscara da pessoa terminar de aparecer na tela, deixando a legenda piscar na frente do rosto. Agora o gravador espera a máscara estar 100% pronta antes de gravar cada quadro.
- **🔧 Engenharia de Software:** Em `CaptionComposition.tsx` (`useMask`), `continueRender(handle)` era disparado no `.finally()` da Promise antes do React commitar o `setState`. Refatorado em dois `useEffect`: o primeiro inicia `delayRender` e busca o DataURL usando `maskIndexAt(tMs, MASK_FPS, masks.length)`; o segundo libera `continueRender` exclusivamente após `state?.key === key` estar commitado (ou no unmount), protegido por flag idempotente `done`.
- **🔄 O que altera no App:** Elimina piscadas (flicker) da legenda sobre o rosto da pessoa no 1º quadro de cada frase exportada e evita travamento de render se o componente desmontar.
- **🐛 Qual era o Erro (Antes):** Race condition entre resolução da Promise de imagem e commit de estado do React durante o render quadro a quadro.
- **✅ Resultado Final (Depois):** Sincronismo exato de quadros e índice calculado via função pura `maskIndexAt`.
- **📂 Arquivos:** `src/remotion/CaptionComposition.tsx`, `src/core/mask.ts`, `tests/edit.test.ts`.

---

### [C-04] Blindagem Profunda de Segurança (`validateProject` + Fuzzing 500x)
- **Responsável:** Claude Code | **Categoria:** Segurança | **Severidade:** Crítica | **Commit:** `1070720`
- **🗣️ Explicação Popular:** Criamos um "detector de metais" rigoroso para qualquer arquivo de projeto aberto ou enviado ao servidor. Mesmo que alguém tente mexer no código do projeto para injetar comandos maliciosos disfarçados de cor ou fonte, o sistema bloqueia na hora.
- **🔧 Engenharia de Software:** Expansão de `validateProject` em `src/core/validate.ts` para inspecionar recursivamente `roleStyles`, `highlight`, `w.style`, `customPresets` e `ph.animation`. Adicionada regex estrita `COLOR` (`#hex` ou `rgba(...)` sem parênteses extras), validação de `endMs >= startMs`, limites finitos numéricos e manutenção das travas globais contra `url(`, `<script`, `javascript:` e `expression(`.
- **🔄 O que altera no App:** Impede crashes de renderização por JSON corrompido (ex.: `scaleX: 0` ou `NaN`) e protege o servidor contra injeção de CSS/XSS.
- **🐛 Qual era o Erro (Antes):** `validateProject` checava apenas o topo das frases, deixando passar objetos aninhados malformados em `roleStyles` ou `customPresets`.
- **✅ Resultado Final (Depois):** Blindado e validado com teste automatizado de fuzzing (500 mutações aleatórias maliciosas, 0 exceções não tratadas).
- **📂 Arquivos:** `src/core/validate.ts`, `tests/core.test.ts`, `tests/server.test.ts`.

---

### [A-01] Limpeza de Memória de Vídeos Antigos (`revokeOther`) e Cache de Máscaras (`clearMaskCache`)
- **Responsável:** Antigravity & Claude Code | **Categoria:** Performance & Memória | **Severidade:** Alta | **Commits:** `d21f2ab`, `8381d38`
- **🗣️ Explicação Popular:** Quando você trocava de projeto no celular ou refazia o recorte da pessoa no Mac, o aplicativo guardava as imagens antigas na memória e continuava mostrando o recorte velho. Agora ele limpa a memória ao trocar de vídeo e atualiza o recorte na hora.
- **🔧 Engenharia de Software:** Adicionada função `revokeOther(keepSrc)` em `device.ts` para chamar `URL.revokeObjectURL` em todos os blobs de projetos anteriores no `urlCache` e `maskCache`. Adicionada `clearMaskCache()` exportada de `CaptionComposition.tsx` e invocada em `PersonPanel.tsx` após `saveMasks`.
- **🔄 O que altera no App:** Evita que o Safari iOS feche o app por falta de RAM após editar vários vídeos seguidos e garante atualização imediata ao clicar em "Refazer" na aba Pessoa.
- **🐛 Qual era o Erro (Antes):** `urlCache` e `maskCache` cresciam indefinidamente durante a sessão e serviam máscaras antigas em URLs de mesmo índice (`/0.jpg`).
- **✅ Resultado Final (Depois):** Memória revogada automaticamente na troca de projeto e cache invalidado ao reanalisar pessoa.
- **📂 Arquivos:** `src/app/platform/device.ts`, `src/remotion/CaptionComposition.tsx`, `src/app/components/PersonPanel.tsx`, `tests/ui.test.ts`.

---

### [A-02] Correção de Timestamps Negativos no MediaPipe (`segment.ts`) em Vídeos do iPhone
- **Responsável:** Antigravity | **Categoria:** IA & Visão Computacional | **Severidade:** Alta | **Commit:** `8ab8bf9`
- **🗣️ Explicação Popular:** Vídeos gravados no iPhone (formato `.mov`) costumam ter uma pequena marcação de tempo negativa no primeiro quadro por conta da compressão da Apple. Isso fazia a inteligência artificial que recorta a pessoa travar logo no início. Agora o sistema corrige esse tempo automaticamente.
- **🔧 Engenharia de Software:** Em `src/app/person/segment.ts`, `track.getFirstTimestamp()` pode retornar valor negativo em vídeos HEVC/H.264 com B-frames (`composition time offset`), violando a exigência de timestamp estritamente crescente $\ge 0$ de `segmenter.segmentForVideo(canvas, tsMs)`. Aplicado `Math.max(0, await track.getFirstTimestamp())`, timestamp monotônico `(i + 1) * Math.round(1000 / MASK_FPS)` e guarda `if (frames.length === 0) throw`.
- **🔄 O que altera no App:** A aba "Pessoa" analisa vídeos `.mov` nativos do iPhone sem erro no MediaPipe.
- **🐛 Qual era o Erro (Antes):** Crash em `segmentForVideo` quando `t0 < 0` e loop infinito se o vídeo não retornasse quadros decodificados.
- **✅ Resultado Final (Depois):** Recorte de pessoa estável em arquivos `.mov` e `.mp4`.
- **📂 Arquivos:** `src/app/person/segment.ts`, `tests/fase2-lote1.test.ts`.

---

### [A-03] Contador Numérico do Modelo P6 com Milhar e Centavos (`counterText`)
- **Responsável:** Antigravity | **Categoria:** Core / Matemática | **Severidade:** Alta | **Commit:** `8ab8bf9`
- **🗣️ Explicação Popular:** No modelo "P6 Número Neon" (que faz os números subirem contando de 0 até o valor falado), se a frase tivesse um valor em reais com centavos como `R$ 1.500,00`, ele confundia a vírgula dos centavos com ponto de milhar e contava até `R$ 150.000` (100 vezes mais!). Agora ele entende valores em reais perfeitamente.
- **🔧 Engenharia de Software:** Em `src/core/motion.ts` (`counterText`), a limpeza `raw.replace(/[.,]/g, '')` concatenava as casas decimais ao inteiro quando ambos os separadores estavam presentes. Ajustado o parser para detectar sufixo decimal `[.,]\d{1,2}$`, preservar a parte inteira na interpolação e reconstruir o sufixo decimal formatado em PT-BR.
- **🔄 O que altera no App:** Valores monetários (`R$ 1.500,00`, `1.250,50`) contam até o número real correto no preset P6.
- **🐛 Qual era o Erro (Antes):** `1.500,00` virava `150000` durante a animação de contagem.
- **✅ Resultado Final (Depois):** Contagem precisa preservando milhar e centavos, coberta por testes unitários.
- **📂 Arquivos:** `src/core/motion.ts`, `tests/fase2-lote1.test.ts`.

---

### [A-04] Proteção contra Esmagamento de Palavras em `0ms` (`shiftPhrase` e `retextPhrase`)
- **Responsável:** Antigravity | **Categoria:** Core / Matemática | **Severidade:** Alta | **Commit:** `8ab8bf9`
- **🗣️ Explicação Popular:** Se a primeira legenda começasse logo no segundo zero do vídeo e você clicasse no botão de atrasar `−0,5s`, todas as palavras da frase eram esmagadas umas em cima das outras no instante zero. Agora a frase trava no início do vídeo sem estragar a duração de cada palavra.
- **🔧 Engenharia de Software:** Em `src/core/grouping.ts`, `shiftPhrase` subtraía `deltaMs` individualmente com `Math.max(0, w.startMs + deltaMs)`, colapsando a duração das palavras quando `deltaMs < -phraseStart(p)`. Aplicado `const d = Math.max(-phraseStart(p), deltaMs)` uniforme para toda a frase, e em `retextPhrase` garantida janela mínima de `800ms` quando `words` anterior estiver vazio.
- **🔄 O que altera no App:** Os botões `−0,5s` / `−0,1s` e a edição de texto em frases novas nunca mais zeram a duração das palavras.
- **🐛 Qual era o Erro (Antes):** Palavras iniciais ficavam com `0..40ms` (piscando invisíveis) ao puxar frase para antes de `0ms`.
- **✅ Resultado Final (Depois):** Deslocamento rígido preservando o espaçamento interno entre palavras.
- **📂 Arquivos:** `src/core/grouping.ts`, `tests/fase2-lote1.test.ts`.

---

### [A-05] Travas de Segurança nos Sliders e Tempos de Palavra (`PhrasePanel.tsx`)
- **Responsável:** Antigravity | **Categoria:** UI/UX & Inspetor | **Severidade:** Alta | **Commit:** `c5eb5b3`
- **🗣️ Explicação Popular:** Antes, se você apagasse o número de tamanho/escala da legenda para digitar outro, o aplicativo tentava salvar "escala zero" no meio da digitação, o que dava erro ou travava a proporção. Agora você pode digitar livremente e o sistema ajusta o valor com segurança ao terminar.
- **🔧 Engenharia de Software:** Adicionado estado local `draft` com clamp `[min, max]` no `onBlur`/`Enter` nos componentes `<Slider>` e `<Num>` em `PhrasePanel.tsx`, guarda contra divisão por zero quando `lockRatio` está ativo e substituição da mutação manual de `startMs`/`endMs` por `setWordTime` (que garante distância mínima de `40ms`).
- **🔄 O que altera no App:** Digitação fluida em todos os campos numéricos do Inspetor sem alertas de erro e sem risco de inverter o início/fim de uma palavra.
- **🐛 Qual era o Erro (Antes):** Digitar `0` disparava erro de validação (`scaleX < 0.05`) e gerava `0/0 = NaN` com o cadeado de proporção ligado.
- **✅ Resultado Final (Depois):** Inputs numéricos validados com clamp automático e `setWordTime`.
- **📂 Arquivos:** `src/app/components/PhrasePanel.tsx`, `src/app/components/StyleEditor.tsx`.

---

### [A-06] Proteção Anti-Spoofing de IP e Fila LRU no Proxy da Nuvem (`cloud/proxy.mjs`)
- **Responsável:** Claude Code | **Categoria:** Segurança & Nuvem | **Severidade:** Alta | **Commit:** `1070720`
- **🗣️ Explicação Popular:** O servidor na nuvem que faz a transcrição grátis tem um limite para evitar que robôs gastem toda a cota. Antes, um invasor podia fingir que tinha outro endereço de internet (IP) para burlar esse limite. Agora o servidor lê o endereço real verificado pelo Render.
- **🔧 Engenharia de Software:** Em `cloud/proxy.mjs`, `clientIp()` lia o primeiro elemento de `x-forwarded-for.split(',')[0]` (controlado pelo cliente) e `allow()` executava `HITS.clear()` global ao atingir 5.000 chaves. Corrigido para ler o último IP anexado pelo balanceador do Render (`.at(-1)`) e aplicar evicção FIFO/LRU individual da chave mais antiga no `Map`.
- **🔄 O que altera no App:** Protege a chave `GROQ_API_KEY` no Render contra abuso e garante disponibilidade da transcrição grátis.
- **🐛 Qual era o Erro (Antes):** Possibilidade de bypass de rate-limit via header `X-Forwarded-For` forjado.
- **✅ Resultado Final (Depois):** Rate-limit seguro e testado em `tests/cloud.test.ts`.
- **📂 Arquivos:** `cloud/proxy.mjs`, `cloud/proxy.d.mts`, `tests/cloud.test.ts`.

---

### [A-07] Cancelamento Real de Renderização de Vídeo no Servidor Mac (`server/render.ts`)
- **Responsável:** Claude Code & Antigravity | **Categoria:** Servidor Mac & Remotion | **Severidade:** Alta | **Commits:** `d21f2ab`, `398af39`
- **🗣️ Explicação Popular:** Antes, quando você clicava em "Cancelar" durante a exportação de um vídeo no Mac, a janela fechava, mas o computador continuava gastando processador escondido no fundo até terminar o vídeo. Agora clicar em "Cancelar" para o motor de gravação imediatamente.
- **🔧 Engenharia de Software:** Integrado `makeCancelSignal()` do `@remotion/renderer` em `server/render.ts`, exposta função `cancelJob(id)` e criada rota `DELETE /api/render/:id` em `server/index.ts`, acionada pelo listener `signal.addEventListener('abort')` em `src/app/platform/mac.ts`, além de checagens `if (isCanceled(job)) return;` antes e depois de `selectComposition`.
- **🔄 O que altera no App:** O botão "Cancelar" interrompe de imediato o processo do Chromium/FFmpeg no Mac e libera a fila para uma nova exportação.
- **🐛 Qual era o Erro (Antes):** O abort no navegador interrompia apenas o loop de polling HTTP, deixando o job órfão rodando na CPU.
- **✅ Resultado Final (Depois):** Cancelamento real ponta a ponta validado em `tests/server.test.ts`.
- **📂 Arquivos:** `server/render.ts`, `server/index.ts`, `src/app/platform/mac.ts`, `tests/server.test.ts`.

---

### [M-01] Modelo P7 com Fonte Serifada Itálica + 3D e Exportação ASS com Karaokê Real (`\kf`)
- **Responsável:** Claude Code | **Categoria:** Core & Paridade com Manual | **Severidade:** Média | **Commit:** `d21f2ab`
- **🗣️ Explicação Popular:** O modelo "P7 Editorial" prometia no manual uma letra clássica (serifada) em itálico com inclinação 3D, mas estava usando uma letra comum reta. Além disso, o arquivo de legenda profissional (`.ass`) não levava o efeito de karaokê. Corrigimos o modelo P7 e turbinamos a exportação `.ass`.
- **🔧 Engenharia de Software:** Atualizado `p7-misto` em `src/core/presets.ts` para usar a fonte serifada `fraunces` em itálico no papel `key` e inclinação 3D (`rotateX: 14`, `rotateY: -8`) no preset. Reescrito `toAss` em `src/core/exporters.ts` para emitir uma linha `Style:` por preset/papel, tags de rotação 3D (`\frx`, `\fry`), alinhamento `\an`, deslocamento `\pos` e tags `\kf` em centésimos de segundo para karaokê.
- **🔄 O que altera no App:** O preset P7 fica idêntico ao prometido no manual e legendas `.ass` abrem no Premiere/DaVinci/Aegisub com animação de karaokê e 3D.
- **🐛 Qual era o Erro (Antes):** P7 usava apenas `inter`/`montserrat` sem 3D, e `toAss` gerava um único estilo estático sem `\kf`.
- **✅ Resultado Final (Depois):** Paridade total com o manual e validada com o vídeo real `video teste.mov`.
- **📂 Arquivos:** `src/core/presets.ts`, `src/core/exporters.ts`, `src/core/types.ts`, `tests/core.test.ts`.

---

### [M-02] Aceleração de 60fps no Preview (`measureText` Cache + `useFontsReady` Memo)
- **Responsável:** Claude Code | **Categoria:** Performance | **Severidade:** Média | **Commit:** `b88db79`
- **🗣️ Explicação Popular:** Durante a reprodução do vídeo, o aplicativo media o tamanho de cada palavra do zero 30 a 60 vezes por segundo. Criamos uma memória rápida (cache) para que ele meça cada palavra apenas uma vez, deixando o vídeo muito mais liso.
- **🔧 Engenharia de Software:** Adicionado cache LRU de 2.000 entradas em `measureText` (`src/remotion/fonts.ts`), memoização `useMemo` da assinatura de fontes em `useFontsReady` e eliminação da chamada duplicada de `computeLines` por frase em `CaptionComposition.tsx`.
- **🔄 O que altera no App:** Reprodução a 30/60fps mais fluida e menor consumo de bateria no Mac e no iPhone.
- **🐛 Qual era o Erro (Antes):** Medição repetitiva no contexto 2D do `<canvas>` e recálculo de lista de fontes em todo frame.
- **✅ Resultado Final (Depois):** Zero trabalho redundante por frame durante o playback.
- **📂 Arquivos:** `src/remotion/fonts.ts`, `src/remotion/CaptionComposition.tsx`.

---

### [UI-01] Correção do Histórico Desfazer/Refazer (`⌘Z`), Aba Palavra e Botão "Novo"
- **Responsável:** Antigravity | **Categoria:** UI/UX & Inspetor | **Severidade:** Alta | **Commits:** `c5eb5b3`, `8381d38`
- **🗣️ Explicação Popular:** Antes, se você mudasse a fonte e logo em seguida trocasse a cor, o botão "Desfazer" (`⌘Z`) desfazia as duas coisas juntas de uma vez. Além disso, clicar em "Novo" muito rápido podia perder a última alteração feita, e trocar de aba cancelava o recorte da pessoa. Tudo isso foi corrigido.
- **🔧 Engenharia de Software:** Ajustado `merge = false` para ações discretas (botões, selects, checkboxes) mantendo `merge = true` apenas em drags/sliders contínuos; desbloqueada a aba `Palavra` com seletor de chips da frase; flush imediato do auto-save antes de `Novo`; e manutenção de `PersonPanel` e `ExportPanel` montados no DOM (`display: none` quando ocultos) para não abortar tarefas assíncronas.
- **🔄 O que altera no App:** `⌘Z` preciso passo a passo, preservação de progresso do MediaPipe/Export ao navegar pelas abas e preservação de canal alfa na cor da sombra (`StyleEditor.tsx`).
- **🐛 Qual era o Erro (Antes):** Fusão indevida de passos no histórico de Undo, desmontagem de painéis em execução e perda de opacidade ao usar `<input type="color">`.
- **✅ Resultado Final (Depois):** Todos os controles do Inspetor e Biblioteca testados e consistentes.
- **📂 Arquivos:** `src/app/App.tsx`, `src/app/components/PhrasePanel.tsx`, `src/app/components/StyleEditor.tsx`, `src/app/components/PhraseList.tsx`, `src/app/components/Library.tsx`.

---

### [MOB-01] Layout Mobile Estilo CapCut (`100dvh`) e Ergonomia de Toque na Timeline e Monitor
- **Responsável:** Antigravity | **Categoria:** UI/UX & Mobile iPhone | **Severidade:** Alta | **Commit:** `8381d38`
- **🗣️ Explicação Popular:** Antes, quando você abria o editor no iPhone e rolava a tela para mudar a cor da legenda, o vídeo sumia lá em cima e você editava "às cegas". Além disso, tentar rolar a linha do tempo com o dedo acabava tirando as legendas do lugar sem querer. Agora o vídeo fica fixo no topo (igual ao CapCut) e o toque diferencia rolar de arrastar.
- **🔧 Engenharia de Software:** Reestruturado o CSS mobile (`@media (max-width: 900px)`) em `src/app/styles.css` para `height: 100dvh; overflow: hidden`, mantendo `.preview-area` e `.timeline` fixos no topo e rolando apenas o painel inferior ativo. Adicionado `drag-threshold` de `4px` em `Preview.tsx` e `Timeline.tsx`, `touch-action: pan-x` na trilha da timeline, `.grip` visível apenas no item selecionado, matriz de rotação inversa 2D no arraste de palavra inclinada, listener `pointercancel` e remoção de `autoFocus` em touch no `FontPicker.tsx`.
- **🔄 O que altera no App:** Experiência nativa de aplicativo mobile no iPhone: vídeo sempre visível enquanto você edita e rolagem suave na linha do tempo sem bagunçar os tempos.
- **🐛 Qual era o Erro (Antes):** Página inteira rolava escondendo o monitor; qualquer toque na timeline movia frases acidentalmente; teclado do iOS abria sozinho cobrindo a lista de fontes.
- **✅ Resultado Final (Depois):** Ergonomia mobile padrão CapCut/Submagic.
- **📂 Arquivos:** `src/app/styles.css`, `src/app/components/Preview.tsx`, `src/app/components/Timeline.tsx`, `src/app/components/FontPicker.tsx`.

---

### [FEAT-01] Guias Magnéticas de Centro (`50%`) + Alças Visuais de Escala e Rotação no Monitor
- **Responsável:** Antigravity | **Categoria:** Benchmark CapCut / Premiere | **Severidade:** Evolução | **Commits:** `8381d38`, `faef1ee`
- **🗣️ Explicação Popular:** Agora, quando você arrasta a legenda pelo vídeo, aparecem linhas-guia que "puxam" a legenda suavemente para o meio exato da tela (como um ímã). E na caixa que envolve a legenda, adicionamos duas bolinhas: uma no canto para aumentar/diminuir o tamanho com o mouse ou dedo, e outra no topo para girar a legenda!
- **🔧 Engenharia de Software:** Implementado snap magnético em `X = 50%` e `Y = 50%` (tolerância de `1.5%`) com guias visuais `.snap-guide.x` e `.snap-guide.y` em `Preview.tsx`. Adicionadas alças interativas `.handle.scale` (canto inferior direito, ajustando `phrase.scale` proporcionalmente à distância do centro) e `.handle.rotate` (topo, calculando `Math.atan2` com snap de `15°` ao segurar `Shift`).
- **🔄 O que altera no App:** Permite centralizar, redimensionar e inclinar legendas diretamente no vídeo sem precisar abrir a aba Frase e procurar barras numéricas.
- **🐛 Qual era o Erro (Antes):** A caixa de seleção no monitor só permitia mover a posição X/Y; escalar ou girar exigia ir até o painel lateral.
- **✅ Resultado Final (Depois):** Manipulação direta completa no Monitor validada em `tests/lote-a4.test.ts`.
- **📂 Arquivos:** `src/app/components/Preview.tsx`, `src/app/styles.css`.

---

### [FEAT-02] Karaokê 2.0 com Pop Dinâmico de Escala (`highlight.scale`)
- **Responsável:** Antigravity | **Categoria:** Benchmark Submagic / Captions.ai | **Severidade:** Evolução | **Commit:** `faef1ee`
- **🗣️ Explicação Popular:** Sabe aquele efeito famoso dos Reels onde a palavra que está sendo falada dá um "pulinho" (cresce um pouquinho enquanto é pronunciada e depois volta ao normal)? Adicionamos o controle "Pop de escala na palavra ativa" na aba Karaokê!
- **🔧 Engenharia de Software:** Adicionado campo opcional `scale?: number` (`0.5` a `2.5`) em `PhraseHighlight` (`src/core/types.ts`), validado em `src/core/validate.ts`, calculado via função pura `highlightPop(active, progress, targetScale)` em `src/core/motion.ts` com curva suave `Math.sin(progress * Math.PI)` e aplicado na composição de transformações da palavra em `CaptionComposition.tsx` sem sobrescrever o `fontSize` dos papéis `small`/`normal`/`key`.
- **🔄 O que altera no App:** Nova barra `"Pop de escala na palavra ativa"` (ex.: `115%`) na aba **Karaokê** do Inspetor.
- **🐛 Qual era o Erro (Antes):** O Karaokê mudava apenas cor/caixa ou alterava o tamanho fixo da fonte inteira.
- **✅ Resultado Final (Depois):** Efeito Submagic/Captions nativo e testado em `tests/lote-a4.test.ts`.
- **📂 Arquivos:** `src/core/types.ts`, `src/core/motion.ts`, `src/core/validate.ts`, `src/remotion/CaptionComposition.tsx`, `src/app/components/PhrasePanel.tsx`, `tests/lote-a4.test.ts`.

---

### [FEAT-03] Sugestão Inteligente de Emojis Contextuais + Prévia Animada de Modelos + Divisão na Palavra
- **Responsável:** Antigravity | **Categoria:** Benchmark Submagic / CapCut | **Severidade:** Evolução | **Commit:** `faef1ee`
- **🗣️ Explicação Popular:** O editor agora lê o que foi falado na frase (ex.: "dinheiro", "casa", "fogo", "foguete", "atenção") e sugere emojis prontos para você inserir com 1 clique na frase ou na palavra. Também colocamos um botão `"✂ Dividir nesta palavra"` para quebrar uma legenda exatamente na palavra escolhida, e os cartões da aba Modelos agora se mexem quando você passa o mouse!
- **🔧 Engenharia de Software:** Criado dicionário semântico offline PT/EN em `src/core/emojis.ts` (`suggestEmojis`, `suggestForText`, `withEmoji` idempotente), integrado nas abas `Frase` e `Palavra` de `PhrasePanel.tsx`. Adicionado botão de corte direto `splitPhrase(p, wordIdx)` na aba `Palavra`, atalhos de teclado `S` (divide sob a agulha) e `Alt + ←/→` (nudge de `±50ms`/`±10ms`), e animação CSS em hover nos cards de `Library.tsx`.
- **🔄 O que altera no App:** Edição muito mais rápida e criativa com emojis sugeridos automaticamente, corte cirúrgico por palavra e visualização viva dos modelos.
- **🐛 Qual era o Erro (Antes):** Não havia sugestão de emojis, dividir exigia posicionar a agulha manualmente no milissegundo exato e os cards de modelos eram estáticos.
- **✅ Resultado Final (Depois):** Testado e blindado em `tests/lote-a4.test.ts`.
- **📂 Arquivos:** `src/core/emojis.ts`, `src/app/components/PhrasePanel.tsx`, `src/app/components/Library.tsx`, `src/app/App.tsx`, `tests/lote-a4.test.ts`.

---

### [QUAL-01] Linter Estrito (`eslint`), Limpeza de Pacotes e Invariantes de Segurança (`114/114 Testes`)
- **Responsável:** Claude Code & Antigravity | **Categoria:** Qualidade & Infra | **Commits:** `ee07160`, `92ccf98`
- **🗣️ Explicação Popular:** Instalamos um "revisor automático de código" (`eslint`) e testes de segurança que rodam toda vez que salvamos uma versão, garantindo que nenhuma chave secreta vaze e que nenhum erro passe despercebido.
- **🔧 Engenharia de Software:** Configurado `eslint.config.mjs` (TypeScript ESLint flat config) integrado ao `npm run verify`, removidos tipos `any` em `transcribe.ts` e `device.ts`, adicionados 6 testes de UI/plataforma em `tests/ui.test.ts` e 4 testes de invariantes de segurança (zero `GROQ_API_KEY` hardcoded, `public/models` intacto, CSP e bloqueio de `url(`) em `tests/server.test.ts`.
- **🔄 O que altera no App:** Código mais enxuto, seguro e com verificação automática de **114 testes em 10 suítes**.
- **🐛 Qual era o Erro (Antes):** Não havia linter configurado no `npm run verify` e as checagens de invariantes dependiam de revisão manual.
- **✅ Resultado Final (Depois):** `npm run verify` passa com 0 erros de tipos, 0 erros de lint, 114/114 testes e builds limpos.
- **📂 Arquivos:** `eslint.config.mjs`, `package.json`, `tests/ui.test.ts`, `tests/server.test.ts`, `docs/ci-workflow.yml`.

---

### [TEST-REAL] Teste de Fogo Ponta a Ponta com Vídeo Real 4K 60fps (`video teste.mov`)
- **Responsável:** Antigravity | **Categoria:** Validação Real | **Commit:** `398af39`
- **🗣️ Explicação Popular:** Pegamos o seu vídeo real dos Downloads (`video teste.mov`, em 4K 60 quadros por segundo) e passamos por todas as etapas do editor: envio, ondas de som, transcrição automática na nuvem (que reconheceu as 9 frases e 30 palavras em português), aplicação dos modelos, recorte de pessoa e exportação real em vídeo MP4 e ProRes transparente.
- **🔧 Engenharia de Software:** Teste integrado com arquivo QuickTime HEVC Main 10 (`2160×3840`, 60fps, `11.05s`, `80.90 MB`, 5 trilhas de metadados Apple). Validados upload multipart, extração `mediabunny`, transcrição via proxy Groq (`whisper-large-v3-turbo`), geração de máscaras MediaPipe, exportadores SRT/ASS (`\kf` + `\frx`/`\fry`), render H.264 (`2.26 MB`), render ProRes 4444 (`yuva444p10le`, `5.86 MB`) e cancelamento real via `DELETE /api/render/:id`.
- **🔄 O que altera no App:** Deixa o projeto real `"video teste"` já salvo e pronto para você abrir em `http://127.0.0.1:5173`.
- **🐛 Qual era o Erro (Antes):** Durante a compilação estrita `tsc --noEmit`, detectamos que `selectComposition` do `@remotion/renderer` v4.0.449 não aceitava `cancelSignal` na assinatura TypeScript (apenas `renderMedia` aceita).
- **✅ Resultado Final (Depois):** Ajustado `if (isCanceled(job)) return;` antes e depois de `selectComposition` e mantido `cancelSignal` em `renderMedia`. Tudo funcionando com 0 erros.
- **📂 Arquivos:** `server/render.ts`, `data/projects/proj_mw3uvhi30czmj.json`, `data/media/m_videoteste.mov`.

---

### [CLOUD-01] Sincronização e Deploy em Produção no Render (iPhone PWA + Proxy API)
- **Responsável:** Antigravity & Claude Code | **Categoria:** Servidor & Nuvem | **Commit:** `92ccf98`
- **🗣️ Explicação Popular:** Atualizamos o servidor na internet (Render) onde fica o link do aplicativo para o seu iPhone e o servidor de transcrição automática, garantindo que o celular tenha exatamente a mesma versão nova que está no seu Mac.
- **🔧 Engenharia de Software:** Sincronizada a branch `origin/claude/editor-legendas-v1` com `main` (`92ccf98`) e disparados os builds no Render via MCP (`dep-dbmhq115efls73dv9tug` para `srv-dbluvl88v5cc73d1d3j0` e `dep-dbmhq1ei0phs739jjhd0` para `srv-dbm632rm8hqs73erfa10`). Verificados endpoints em produção com HTTP 200 OK.
- **🔄 O que altera no App:** O link `https://editor-legenda.onrender.com` no iPhone agora conta com o layout CapCut fixo, Karaokê 2.0, alças de escala/rotação, emojis e todas as correções de memória.
- **🐛 Qual era o Erro (Antes):** O Render ainda estava rodando o commit antigo da Etapa 1 antes das melhorias da Fase 2.
- **✅ Resultado Final (Depois):** Ambos os serviços `live` e verificados.
- **📂 Arquivos:** `docs/CEREBRO.md`, `BRAIN.md`.

---

## 🗑️ 6. Descartado (O que decidimos NÃO usar e por quê)

### [DESC-01] Pacotes `@remotion/whisper-webgpu` e `@remotion/captions`
- **Responsável:** Claude Code | **Categoria:** Limpeza de Dependências | **Commit:** `ee07160`
- **🗣️ Explicação Popular:** Eram duas peças de biblioteca que estavam instaladas na pasta do projeto desde o início, mas não estavam sendo usadas porque criamos um motor próprio mais leve e compatível com o português. Removemos para deixar o projeto mais leve.
- **🔧 Engenharia de Software:** Pacotes listados no `package.json` sem nenhum `import` ativo no código-fonte (a transcrição local usa `@huggingface/transformers` e o agrupamento PT-BR usa `src/core/grouping.ts`). Removidos com redução de 16 pacotes na árvore do `node_modules`.

### [DESC-02] Forçar WebGPU na Transcrição Local dentro do Safari iOS (iPhone)
- **Responsável:** Claude Code & Antigravity | **Categoria:** Compatibilidade iPhone
- **🗣️ Explicação Popular:** Tentar usar a placa de vídeo (WebGPU) dentro do navegador Safari do iPhone para transcrever áudio faz o Safari fechar sozinho por um defeito do próprio iOS. Por isso descartamos o WebGPU no Safari e usamos o processador normal (CPU/WASM) com modelo compactado, que funciona sem fechar o app.
- **🔧 Engenharia de Software:** Mantida a trava `isSafariLike()` em `src/app/transcribe.ts` que força `device: 'wasm'` com quantização híbrida (`encoder_model: 'q8'`, `decoder_model_merged: 'q4'`) no iOS/Safari, reservando `webgpu` (`fp32`) apenas para navegadores Chromium no Desktop.

### [DESC-03] Workflow em `.github/workflows/ci.yml` via Token OAuth sem Escopo `workflow`
- **Responsável:** Antigravity | **Categoria:** Infraestrutura GitHub | **Commit:** `52bed91`
- **🗣️ Explicação Popular:** O GitHub bloqueia o envio de arquivos na pasta `.github/workflows` quando a credencial salva no Mac não tem uma permissão especial chamada `workflow`. Em vez de travar seus envios para o GitHub, movemos as verificações de segurança para dentro do próprio teste do projeto (`npm run verify`) e guardamos o modelo em `docs/ci-workflow.yml`.
- **🔧 Engenharia de Software:** A chave OAuth atual do Keychain possui escopos `repo, read:org, gist`. Para não bloquear `git push`, as invariantes de CI foram incorporadas diretamente em `tests/server.test.ts` (executadas em todo `npm test` e `npm run verify`) e o template YAML ficou documentado em `docs/ci-workflow.yml`.

