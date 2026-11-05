# Plano — Editor de Legendas estilo @_k.elsie

## 0. Decisões fechadas
- Roda local no Mac (navegador em localhost). Node + ffmpeg via Homebrew.
- Transcrição: whisper.cpp local (Metal/Apple Silicon) padrão; API OpenAI opcional com `OPENAI_API_KEY`.
- Idioma: PT-BR (stopwords PT para palavra-chave).
- Oclusão (texto atrás da pessoa): fase 5.
- Repo: `pggcthymg7-rgb/editor-legendas` (novo, vazio).
- CapCut desktop + celular: export `.mov` ProRes 4444 alpha **e** `.mp4` fundo verde chroma (#00FF00) para o celular.

## 1. Análise (6 reels, 410 s, 720x1280 @ 29,97 fps)

Método: grade 1 fps → só quadros com legenda ampliados → tiras 10 fps nas animações. Quadros sem texto ignorados.

### Padrão geral
- Legenda **não é faixa fixa**. É tipografia cinética: cada frase vira um "lockup" de 2–4 linhas com fontes, tamanhos e cores misturados.
- Palavra-chave grande; palavras de ligação ("and", "with a", "the") pequenas, coladas em cima ou ao lado.
- Hook (0–6 s) sempre em lockup grande. Resto do vídeo alterna lockup e legenda mínima palavra-a-palavra.
- **Texto atrás da pessoa** (oclusão): cabelo/corpo cobre parte das letras ("can't sell", "Have you ever", "luxury", "market"). Exige segmentação de pessoa.

### Modelos identificados (viram presets)

| # | Nome | Fonte (similar livre) | Cor | Posição | Animação | Exemplo |
|---|---|---|---|---|---|---|
| P1 | Editorial Serif | serif didone alto contraste (Playfair Display / DM Serif Display) + itálico | branco, prata-cromo, lilás degradê | terço sup. ou centro, atrás da pessoa | blur→nítido + sobe 20 px, 250 ms; saída blur | "People say", "Views don't sell homes", "LET'S TALK ABOUT IT" |
| P2 | Mix Serif + Itálico Lilás | serif + itálico script-like (Playfair Italic) | lilás→roxo degradê (#B9A2FF→#6B3FD1), leve glow | 2 linhas desalinhadas | palavra a palavra, blur-in escalonado 80 ms | "real estate", "luxury Farmhouse", "Best Features" |
| P3 | Sans Fina Palavra-Única | sans light (Inter Light / Helvetica Neue Light) | branco 90%, sombra suave | centro, altura do peito (~55% y) | 1 palavra por vez, fade+blur 120 ms | "solely", "from", "Instagram," |
| P4 | Sans Bold Arredondada | sans black arredondada (Nunito Black / SF Rounded) | branco, laranja degradê, lilás, rosa | lockup inclinado / em arco | pop escala 0.6→1.05→1 + rotação; saída motion-blur | "this is it.", "with a bridge", "Ya'll know" |
| P5 | Palavra Gigante | sans bold (Inter Black / Helvetica Bold) | branco | ocupa largura toda, atrás de objetos | corte seco + zoom leve | "not", "two", "terraces," |
| P6 | Número Neon | sans bold | magenta neon #FF3FD8 + glow forte | topo ou centro | contador sobe (6,000→260,000) + glow pulsando | "73%", "74%", "260,000" |
| P7 | Caixa Alta Mista | sans bold caps + serif itálica + script | multi (rosa, roxo, verde, vermelho) | lockup com rotação 3D/perspectiva | entrada por palavra com rotação | "Before I share this location", "A curved BALCONY overlooking", "let me SHOW you" |
| P8 | Destaque Colorido | sans bold | 1 palavra em cor sólida (teal, vermelho) entre brancas | lockup | idem P4 | "did HOW you?", "Views" |

Efeitos transversais (aplicáveis a qualquer preset): preenchimento degradê, cromo/metal, glow, sombra suave, oclusão atrás da pessoa, perspectiva 3D, motion blur na saída.

Fora do escopo v1 (motion graphics, não legenda): balões de chat, ícones de redes, cards de perfil, arco neon decorativo.

## 2. Como ela gera
Alta probabilidade: editor profissional em **After Effects** (lockups manuais, Roto Brush para texto atrás da pessoa, glow/motion blur nativos). Possível CapCut Pro em partes simples (P3). Não é ferramenta automática tipo Submagic: posição e composição mudam a cada frase.

Consequência: o editor precisa **gerar automático** (layout sugerido por regras) e deixar **ajustar tudo à mão**.

## 3. Ferramentas

| Função | Ferramenta | Motivo |
|---|---|---|
| Transcrição palavra-a-palavra | Whisper (whisper.cpp local via `@remotion/install-whisper-cpp`, ou API OpenAI) | timestamp por palavra, PT-BR bom |
| Preview + render | **Remotion** (React) + `@remotion/player` | animação por código, render .mov com alpha |
| Segmentação pessoa (texto atrás) | MediaPipe Selfie Segmentation (rápido) ou Robust Video Matting (melhor cabelo) | gera máscara por quadro |
| Vídeo | ffmpeg | extrair áudio, ProRes 4444, WebM alpha |
| Fontes | Google Fonts (Playfair Display, DM Serif Display, Inter, Nunito) | licença livre, parecidas |
| Skills | `remotion-dev/skills@remotion-best-practices`, `@remotion-captions`, `@remotion-render`, `digitalsamba/claude-code-video-toolkit@ffmpeg` | padrões oficiais |

Licença Remotion: grátis p/ pessoa física e empresas até 3 pessoas; acima disso, licença paga.

## 4. Arquitetura

```
editor-legendas/
  app/            React + Vite: upload, timeline, painel de estilo, preview (@remotion/player)
  remotion/       composições: <CaptionTrack>, presets P1–P8, efeitos
  server/         Node/Express: upload, whisper, segmentação, fila de render, export
  presets/*.json  estilo como dado (fonte, cor, degradê, posição, animação, timing)
```

Fluxo:
1. Upload vídeo → ffmpeg extrai áudio → Whisper → `transcript.json` (palavra, início, fim).
2. Agrupador divide em frases (pausa > 350 ms, pontuação, máx. 4 palavras) e marca palavra-chave (maior/substantivo/número).
3. Usuário escolhe preset por frase (ou "automático": hook = P1/P2, números = P6, resto = P3).
4. Editor: texto, tempo, fonte, tamanho, cor/degradê, posição (arrastar no preview), rotação, animação, oclusão on/off.
5. Export.

## 5. Edição (etapa 5)
- Por palavra: texto, cor, fonte, tamanho, peso, itálico, deslocamento X/Y, rotação.
- Por frase: preset, posição, escala, alinhamento, entrada/saída, duração.
- Global: preset padrão, paleta, fonte padrão, área segura.
- Salvar preset próprio (duplicar e editar JSON via UI).
- Desfazer/refazer, atalhos.

## 6. Export (etapa 6)
| Arquivo | Uso | Mantém animação |
|---|---|---|
| `.mov` ProRes 4444 com alpha | Premiere: camada acima do vídeo | sim |
| `.webm` VP9 alpha | CapCut/web (alternativa) | sim |
| sequência PNG (zip) | fallback universal | sim |
| `.mov` com oclusão já aplicada | sobrepor ao vídeo original sem cortes | sim |
| `.srt` | qualquer editor | não (só texto/tempo) |
| `.ass` | estilo básico (fonte, cor, posição) | parcial |
| vídeo final queimado `.mp4` | postar direto | sim |

Obs.: oclusão só bate se o vídeo de fundo não for recortado no editor depois. Por isso export separado com/sem oclusão.

## 7. Fases de construção
1. Base: projeto, upload, Whisper, transcript editável. (verificar: transcreve vídeo PT de teste)
2. Remotion + presets P3, P1, P2 + preview. (verificar: preview sincronizado)
3. Export .mov alpha + .srt + .ass. (verificar: importa no Premiere/CapCut)
4. Editor completo (etapa 5) + presets P4–P8.
5. Segmentação + texto atrás da pessoa.
6. Testes automatizados (agrupador, export SRT/ASS, render curto) + checagem de segurança.

## 8. Verificação
- Testes unitários: agrupador de frases, gerador SRT/ASS, validação de preset JSON.
- Render de 5 s por preset comparado lado a lado com quadro do reel original.
- Import manual no Premiere e CapCut (você confirma).
