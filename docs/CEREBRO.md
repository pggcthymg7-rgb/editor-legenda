# Cérebro do projeto (memória para retomar)

Leia antes de qualquer trabalho. Atualizado no fim da **Etapa 1** (branch `etapa-1` (commit `4d63a18`)).

## Onde estamos
- **Etapa 1 concluída.** O editor de legendas funciona no Mac e no iPhone (PWA), com transcrição na nuvem grátis.
- **Próxima, Fase 2:** testes em aparelho real, revisão com o Antigravity e melhorias. Plano em `docs/PLANO_REVISAO.md`.
- **Manual de uso** (todos os botões): `docs/MANUAL.md`.
- **Relatórios de entrega:** `ENTREGA_PRONTA.md`.

## Links e serviços
| O quê | Onde |
|---|---|
| Repositório | `pggcthymg7-rgb/editor-legenda`. Código na `main` (merge da Etapa 1) e na branch `claude/editor-legendas-v1` |
| App iPhone (PWA) | https://editor-legenda.onrender.com (Render static, `srv-dbluvl88v5cc73d1d3j0`, build `npm run build:pwa` → `dist-pwa`) |
| Proxy da nuvem | https://editor-legenda-api.onrender.com (Render web free, `srv-dbm632rm8hqs73erfa10`, `node cloud/proxy.mjs`) |
| Chave Groq | Variável `GROQ_API_KEY` no Render (nunca no código). Foi exposta no chat; trocar (item C2 do plano). |
| Workspace Render | `tea-dbh7qoff3r2c73btlmq0` |

Observações sobre o Render:
- O deploy automático **não dispara**. Depois de cada push, rode `trigger_deploy` (MCP Render) nos dois serviços.
- Os serviços apontam para a branch `claude/editor-legendas-v1`.

## Como funciona (arquitetura)
- **Lógica pura (testada)** em `src/core/`:
  - `types`;
  - `presets`: P1–P8;
  - `fonts`: 58 fontes OFL;
  - `grouping`: frases e papéis em PT-BR;
  - `edit`: timeline (aparar, mover, dividir, buscar/substituir, encaixe);
  - `mask`: refino da máscara da pessoa;
  - `motion`, `layout`, `exporters`: SRT/ASS com escala X/Y;
  - `validate`: segurança do projeto.
- **Composição Remotion** em `src/remotion/CaptionComposition.tsx`. É a mesma no preview, no render do servidor e no render dentro do navegador.
  - A legenda atrás da pessoa usa `mask-image`, através de `useMask`.
  - A camada `layer: 'person'` gera só a pessoa recortada.
- **Interface** em `src/app/`, com layout de editor profissional:
  - `Library` (Frases, Modelos, Texto, Pessoa), `Preview` (monitor), `PhrasePanel` (inspetor com abas Frase, Estilo, Animação, Karaokê e Palavra), `Timeline`, `ExportPanel`, `FontPicker`, `UploadScreen`.
- **Plataforma**, escolhida no build (`src/app/platform/`):
  - `mac.ts`: servidor local (Express em `server/`, render com `@remotion/renderer`, ProRes alfa).
  - `device.ts`: iPhone. Vídeo, projetos e máscaras no IndexedDB; render no navegador (`@remotion/web-renderer`), até 1080 px de largura.
- **Transcrição:**
  - **Nuvem** (padrão): `src/app/cloud.ts` → `cloud/proxy.mjs` → Groq whisper-large-v3-turbo, com tempo por palavra e prompt pontuado. Aceita a chave do usuário pelo header `x-groq-key` quando o servidor não tiver chave.
  - **No aparelho:** `src/app/transcribe.ts`, transformers.js com `onnx-community/whisper-*_timestamped`.
    - GPU no Chrome; CPU (WASM) no Safari, onde o WebGPU quebra.
    - dtype na CPU: encoder q8 + decoder q4.
    - Se a nuvem falhar, o app usa este modo sozinho.
  - **Áudio:** `platform/audio.ts`, mediabunny em pedaços (sem estourar a memória do iPhone).
- **Pessoa:** `src/app/person/segment.ts`, MediaPipe selfie multiclass no navegador.
  - Usa a CPU se a GPU for por software.
  - Gera uma máscara JPEG por quadro, com refino: suavização no tempo, remoção de ilhas, preenchimento de buracos.
  - Os arquivos `/mediapipe` e `/models` são servidos pelo próprio app.

## Comandos
- `npm run verify`: tsc, 82 testes e builds do Mac e da PWA. Precisa de 0 erros.
- `npm run dev`: Mac (5173 + API 3210).
- `npm run build:pwa`: gera a PWA.
- Instalar dependências com **npm 11**: `npx npm@11 install`. O npm 10 tem bug com o vitest 4.
- O `vite preview` não serve `/mediapipe`. Para testar a PWA use `python3 -m http.server --directory dist-pwa`.

## Histórico resumido
1. Análise dos reels de @_k.elsie: 8 modelos (`docs/ANALISE.md`).
2. Editor Mac com Remotion, exports em camada e SRT/ASS.
3. PWA iPhone rodando tudo no aparelho.
4. Layout profissional, 58 fontes, edição por palavra com escala X/Y, karaokê, caixa de fundo, forma de onda e legenda atrás da pessoa.
5. iPhone real:
   - "Load failed": a CSP bloqueava os modelos. Corrigido.
   - "webgpuInit": Safari sem WebGPU no ONNX. Agora usa CPU.
   - Nuvem grátis com Groq.

## Pendências principais
Validar no iPhone, CapCut e Premiere reais; trocar a chave do Groq; deploy automático; ESLint/CI. Detalhes em `docs/PLANO_REVISAO.md`.

## Skills úteis (já instaladas em `.claude/skills/`)
- remotion-*, ffmpeg;
- ui-ux-pro-max, web-design-guidelines;
- transformers-js;
- engineering:code-review e security-review (plugins).
