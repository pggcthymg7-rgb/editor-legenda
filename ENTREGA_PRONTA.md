# Entrega: editor de legendas profissional (sessão noturna)

Branch: `claude/editor-legendas-v1`. App iPhone (PWA): https://editor-legenda.onrender.com. Mac: `npm install && npm run dev`.

## O que mudou

### 1. Layout de editor profissional (desktop e PWA)
- **Estrutura de NLE:** barra superior, biblioteca à esquerda, monitor no centro, inspetor à direita e timeline embaixo.
- **Timeline:**
  - régua e agulha;
  - faixa de legendas: arrastar move a frase, as bordas aparam;
  - faixa de palavras: as bordas ajustam o tempo de cada palavra;
  - forma de onda do áudio;
  - ímã de encaixe e zoom.
- **Monitor:**
  - clicar seleciona a frase; clicar de novo seleciona a palavra;
  - arrastar move a frase ou a palavra;
  - contorno de seleção;
  - transporte quadro a quadro com timecode;
  - guias de área segura (Reels/TikTok) e grade de terços.
- **Inspetor contextual:** abas Frase / Estilo / Animação / Karaokê / Palavra.
- **Atalhos:** Espaço, ← →, S, T, ⌘D, Delete, Esc, ⌘Z, ?.
- **Celular:** coluna única, sem estouro de largura, alvos de toque de 40 px e abas Inspetor / Frases.
- **Skills usadas:**
  - `find-skills` instalou `web-design-guidelines` (Vercel) e `ui-ux-pro-max`;
  - as regras aplicadas foram: foco visível, rótulos em botões de ícone, `prefers-reduced-motion`, `touch-action`, `overscroll` em modais, aviso de alteração não salva e Esc fechando modais.

### 2. Palavra individual
- **Escala horizontal e vertical** (com cadeado de proporção), posição X/Y, rotação, texto, papel e tempo.
- Fonte, cor, degradê, brilho, sombra, contorno e caixa de fundo só daquela palavra.
- O export ASS leva `\fscx`/`\fscy` e o espaçamento entre letras.

### 3. Fontes
- **58 fontes grátis (OFL)** em 5 categorias (serifadas, sem serifa, impacto, manuscritas, retrô).
- Seletor visual com busca, cada fonte escrita nela mesma.
- O peso se ajusta à faixa que a fonte tem.
- A validação só aceita fontes da biblioteca.

### 4. Legenda atrás da pessoa (opcional)
- **Análise:** MediaPipe Image Segmenter (selfie multiclass) roda no aparelho, quadro a quadro.
- **Refino da máscara:**
  - suavização no tempo;
  - borda suave;
  - remoção de manchas soltas;
  - preenchimento de buracos (roupa clara).
- **Liga/desliga:** por frase ("Legenda atrás da pessoa") e no projeto todo ("Ativar efeito"). Com o efeito desligado volta a camada original.
- **Export:**
  - a camada **Legendas** já sai recortada;
  - a camada **Pessoa (frente)** sai em MOV/WebM transparente ou MP4 verde.
- **Funciona em três lugares:**
  - preview;
  - render do servidor no Mac (máscaras em `data/media/masks`);
  - render no iPhone (máscaras no IndexedDB).

### 5. Paridade com os editores de ponta
| Recurso (CapCut / Premiere / Submagic) | Status |
|---|---|
| Timeline com aparar, mover e dividir na agulha | feito |
| Ajuste de tempo por palavra | feito (faixa de palavras) |
| Karaokê (destaque da palavra falada) | feito (aba Karaokê) |
| Caixa de fundo atrás do texto | feito |
| Buscar e substituir, sincronia global | feito |
| Guias de área segura | feito |
| Forma de onda do áudio | feito |
| Legenda atrás da pessoa + camada da pessoa | feito |
| Modelos (presets) com galeria e "aplicar em todas" | feito |
| Export em camada para Premiere/CapCut + SRT/ASS | feito |

Ainda não feito: emojis animados, transcrição de vários idiomas na mesma tela e trilha de B-roll. Ficam como próximos passos.

## Bugs corrigidos
- **Monitor:** não dava para clicar numa palavra ainda invisível (revelação palavra a palavra). Agora ela é achada pela caixa.
- **Forma de onda:** no iPhone tentava ler o endereço `local:` e o navegador bloqueava. Agora usa o endereço do vídeo no aparelho.
- **Servidor:** arquivo inexistente em `/media` respondia 500. Agora responde 404 e erros 4xx não expõem caminho de arquivo.
- **PWA no celular:** a página estourava a largura da tela e o timecode quebrava em duas linhas.
- **PWA, arquivos para offline:** pré-carregava cerca de 120 arquivos de fonte japonesa e os de alfabetos que não usamos. Agora só os de alfabeto latino entram (6,8 MB); o resto é baixado quando usado.
- **Pacote de fonte:** o `@fontsource-variable/big-shoulders-display` usa um formato antigo e quebrava o build.
- **Pessoa em máquina sem GPU:** a GPU por software era mais lenta que a CPU. Agora detecta e usa a CPU direto.
- **Texto da frase:** reescrever o texto apagava os ajustes individuais das palavras.

## Testes
- `npm run verify`: tipos, 70 testes unitários e de servidor, build do Mac e build da PWA. Tudo com 0 erros.
- **E2E desktop** (Playwright, servidor do Mac):
  - upload, nova frase (T), aparar na timeline;
  - selecionar palavra no monitor, escala 1,8 × 0,7 e fonte Bebas Neue só nela;
  - análise de pessoa (121 quadros) e máscara aplicada no preview;
  - MP4 final com a legenda atrás da pessoa (conferido no quadro);
  - MOV ProRes 4444 com alfa da camada da pessoa.
- **E2E iPhone 15** (PWA, tudo no aparelho):
  - service worker ativo e layout sem estouro;
  - inspetor e escala por palavra;
  - análise de pessoa;
  - MP4 verde e MP4 verde da camada da pessoa;
  - funciona offline;
  - nenhuma requisição externa.
- **Não testado aqui (sem aparelho):** Safari de um iPhone real, GPU real e importação no Premiere/CapCut.

## Auditoria de segurança
- **Segredos:** nenhum no repositório nem nos builds. `.env` fora do git. A chave da OpenAI no iPhone fica só no aparelho.
- **Rotas novas de máscara:**
  - id validado;
  - índice inteiro limitado;
  - só JPEG de verdade (assinatura FF D8 FF), até 1 MB;
  - `inside()` contra path traversal;
  - header `x-editor` contra CSRF.
  - Os testes cobrem todos esses casos.
- **CORS de `/media`:** só para origens `localhost`/`127.0.0.1`, necessário para o render ler as máscaras. Teste confirma que outra origem não recebe.
- **Cabeçalhos:** `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, `COOP`. A PWA bloqueia ser aberta dentro de iframe.
- **CSP da PWA:** bloqueia os contadores de uso enviados pelo Remotion e pelo MediaPipe. Nenhum dado sai do aparelho, exceto o áudio enviado à OpenAI quando o usuário escolhe.
- **Validação do projeto:** fontes, escalas, máscara, `behind`/`occlusion`; `url(` e `<script` continuam bloqueados.
- **`npm audit`:** 4 alertas baixos, todos do `deepmerge` dentro do `workbox-build`, que só roda no build e ainda não tem correção. Antes havia 2 críticos (vitest/tinypool) e 1 alto (vite), corrigidos ao subir para vitest 4.1.12 e vite 6.4.5.

## Observação
- O modelo de IA de pessoa (`public/models/selfie_multiclass_256x256.tflite`, 16 MB, licença Apache 2.0) está no repositório para funcionar offline.


---

# Entrega 2: transcrição no iPhone ("Load failed")

## Causa do erro no iPhone
- O Whisper local baixa o modelo de `https://remotion.media/` e o runtime ONNX do `cdn.jsdelivr.net`. A política de segurança (CSP) da PWA só liberava huggingface, então o Safari bloqueava e mostrava "Load failed".
- O site no Render também estava numa versão antiga, porque o deploy automático não disparava. Agora o deploy é disparado a cada entrega.

## Como os apps fazem
- O CapCut transcreve na nuvem: o celular manda o áudio e o servidor devolve o texto com os tempos. Fontes: a ajuda oficial do CapCut diz que o reconhecimento usa processamento em nuvem.
- Apps nativos de iPhone podem usar o reconhecimento de fala da Apple. Um PWA não tem acesso a ele.
- O app "Letr" não foi encontrado nas buscas.

## Solução implantada (grátis)
1. **Nuvem (padrão):** `cloud/proxy.mjs`, um serviço grátis no Render (`editor-legenda-api.onrender.com`) que repassa ao Groq whisper-large-v3-turbo, com tempos por palavra.
   - O iPhone extrai só o áudio (AAC mono 16 kHz) em pedaços, com mediabunny e WebCodecs, e envia cerca de 0,25 MB por minuto.
   - A chave fica só no servidor (variável `GROQ_API_KEY`). No app há apenas um header público e a lista de origens permitidas.
   - Limite de 60 transcrições por hora por IP, até 25 MB, tipos de áudio validados, sem repassar erro do provedor e sem guardar áudio.
2. **No aparelho (reserva automática):** Whisper WebGPU (modelo base no iPhone, small no Mac).
   - CSP corrigida.
   - O áudio é decodificado em pedaços, não com `decodeAudioData` do arquivo inteiro, que estourava a memória do iPhone com MOV grande.
   - Se a nuvem falhar, o app tenta no aparelho sozinho.
3. **Idioma da fala:** português, inglês, espanhol ou detecção automática.
4. **Export no iPhone:** limitado a 1080 px de largura (vídeo 4K do iPhone).

## Testes
- 78 testes unitários, incluindo 7 do proxy: origem, header, tipo, idioma, limite, chave só no servidor e erro sem vazamento. Builds do Mac e da PWA passam.
- **E2E da PWA no perfil iPhone, Whisper no aparelho com WebGPU:**
  - clipe MP4 em português: 16 palavras;
  - clipe **MOV** de 15 s em inglês: 53 palavras corretas ("People say you can't sell real estate from social media…").
  - Sem erros de console.
- **E2E completo da PWA:** editor, palavra, pessoa, export verde e da pessoa, offline. Passou.
- **Proxy publicado:** `/health`, preflight CORS 204 e 503 claro sem chave.

## Falta uma ação sua (1 minuto)
- Criar a chave grátis do Groq e colar em Render → `editor-legenda-api` → Environment → `GROQ_API_KEY`.
- Sem ela, a opção Nuvem aparece desligada e o app usa a IA no aparelho.


---

# Entrega 3: correções do teste no iPhone real

## O que o iPhone mostrou
1. **Erro "no available backend found… webgpuInit is not a function".**
   - Causa: no Safari, o transformers.js 4.2 carrega de propósito o runtime ONNX sem WebGPU (`ort-wasm-simd-threaded.mjs`). O `@remotion/whisper-webgpu` força WebGPU, então quebrava.
   - Correção: o Whisper agora roda pelo transformers.js direto (`src/app/transcribe.ts`).
     - Chrome/Mac: WebGPU.
     - Safari/iPhone: CPU (WASM).
     - Se a GPU falhar, cai sozinho para a CPU.
   - Modelo: `onnx-community/whisper-*_timestamped` do Hugging Face, com tempo por palavra.
   - Na CPU: encoder q8 + decoder q4. O decoder q8 "merged" quebra no ONNX Runtime 1.26 com "Missing required scale".
2. **Não dava para tocar em "Nuvem".**
   - Causa: a opção ficava desligada porque o servidor estava sem chave.
   - Correção:
     - a opção agora pode ser tocada;
     - aparece uma caixa para colar a chave grátis do Groq uma vez (guardada só no aparelho, enviada ao nosso proxy no header `x-groq-key`);
     - o proxy usa a chave do usuário só se o servidor não tiver uma, e valida o formato `gsk_…`.

## Testes
- 82 testes unitários; builds do Mac e da PWA passam.
- **Caminho do iPhone** (perfil iPhone, CPU/WASM, MOV de 15 s em inglês): 53 palavras corretas.
- **Caminho do desktop** (WebGPU): 16 palavras corretas.
- **Ao vivo no site publicado**, com perfil de iPhone e chave Groq falsa:
  - a nuvem é chamada (`/transcribe` → 502 porque a chave é falsa);
  - o app cai sozinho para o aparelho e transcreve o MOV em cerca de 1 min.
- Não testado: o Safari de um iPhone real. Aqui roda o Chromium com o mesmo user agent, e o transformers.js usa o mesmo runtime que usa no Safari.
