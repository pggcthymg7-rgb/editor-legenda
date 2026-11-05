# editor-legenda

Editor local de legendas animadas no estilo de reels: transcreve o vídeo, gera blocos tipográficos com 8 modelos (serif editorial, itálico lilás, palavra única, bold em arco, palavra gigante, número neon, caixa alta mista, destaque colorido), deixa editar tudo e exporta para Premiere e CapCut.

## Instalar (Mac)

1. Instale o Node 22 ou mais novo: `brew install node`
2. No terminal:
   ```bash
   git clone https://github.com/pggcthymg7-rgb/editor-legenda.git
   cd editor-legenda
   npm install
   npm run dev
   ```
3. Abra **http://localhost:5173** no **Chrome** (a transcrição local usa WebGPU).

O ffmpeg vem junto com o Remotion. Não precisa instalar.

## Uso

A tela segue a lógica de editor profissional (Premiere/CapCut):

| Área | O que faz |
|---|---|
| **Barra de cima** | Nome do projeto, desfazer/refazer, status de salvamento, atalhos e **Exportar** |
| **Biblioteca (esquerda)** | **Frases** (lista e texto), **Modelos** (galeria; clique aplica), **Texto** (buscar e substituir, sincronia global, caixa alta), **Pessoa** (legenda atrás da pessoa) |
| **Monitor (centro)** | Player com transporte (quadro a quadro, timecode), guias de área segura Reels/TikTok e grade de terços. Clique numa legenda para selecionar e arraste para mover. Clique de novo numa palavra (ou Alt + clique) para editar só ela |
| **Inspetor (direita)** | Abas **Frase** (posição, escala, rotação, 3D, profundidade), **Estilo** (por papel), **Animação**, **Karaokê** (destaque da palavra falada) e **Palavra** (texto, tempo, posição, rotação, **escala horizontal e vertical**, fonte e cor só dela) |
| **Timeline (baixo)** | Régua, agulha, faixa de legendas (arrastar move, bordas aparam), faixa de palavras (bordas ajustam o tempo de cada palavra) e forma de onda do áudio. Ímã de encaixe e zoom (⌘ + roda) |

Fontes: 58 fontes grátis (licença OFL), em 5 categorias: serifadas, sem serifa, impacto, manuscritas e retrô. O seletor mostra cada fonte escrita nela mesma e tem busca.

Atalhos: Espaço (play), ← → (quadro; com Shift, 1 s), S (dividir na agulha), T (nova frase), ⌘D (duplicar), Delete (apagar), Esc (tirar a seleção), ⌘Z / ⇧⌘Z, ? (ajuda).

### Legenda atrás da pessoa (opcional)

1. Abra a aba **Pessoa** e clique em **Analisar pessoa**. Uma IA (MediaPipe, roda no próprio aparelho) recorta a pessoa quadro a quadro. Num Mac com GPU são segundos para um reel.
2. No Inspetor, aba Frase, marque **Legenda atrás da pessoa**. Também dá para usar "Todas atrás" ou "Todas na frente".
3. Desligue **Ativar efeito** para voltar à camada original sem perder a análise.
4. Na exportação, a camada **Legendas** já sai recortada atrás da pessoa. A camada **Pessoa (frente)** sai só com a pessoa recortada, para empilhar no Premiere ou no CapCut.

## Exportar

| Botão | Onde usar |
|---|---|
| MOV transparente (ProRes 4444) | Premiere e CapCut desktop: camada acima do vídeo (só no Mac) |
| MP4 fundo verde | CapCut celular: Sobreposição → Remover fundo → Chroma key no verde |
| WebM transparente | alternativa transparente leve |
| MP4 final | vídeo pronto para postar |
| SRT | só texto e tempo |
| ASS | texto com fonte, cor, posição e escala X/Y por palavra, sem animação. Instale a fonte grátis de mesmo nome no computador |
| Camada **Pessoa (frente)** | MOV/WebM transparente ou MP4 verde só com a pessoa |

Os exports em camada têm a duração e a resolução do vídeo original. Coloque-os no início da timeline, alinhados com o vídeo.

## App no iPhone (PWA)

Versão que roda inteira no aparelho, sem o Mac: https://editor-legenda.onrender.com

1. Abra o link no **Safari** do iPhone. Toque em Compartilhar → **Adicionar à Tela de Início**.
2. Abra o app pelo ícone **Legendas** e escolha um vídeo do Fotos.
3. Transcrição (escolha o idioma falado: português, inglês, espanhol ou automático):
   - **Nuvem rápida e grátis (recomendado):** o app tira só o áudio no iPhone (cerca de 0,25 MB por minuto) e manda para o nosso servidor grátis no Render. O servidor repassa ao Groq (Whisper large-v3-turbo), que transcreve 1 minuto em segundos. É o mesmo modelo que o CapCut usa: transcrição na nuvem. Você não digita chave nenhuma no celular.
   - **No aparelho, offline:** a IA (Whisper em WebGPU) roda no próprio iPhone. Baixa o modelo uma vez (base ≈ 200 MB). Leva alguns minutos e é a reserva automática se a nuvem cair.
   - **Sua chave da OpenAI** (avançado) ou **sem transcrição**.
4. Exportar: o vídeo é gerado no próprio iPhone, então deixe o app aberto até terminar.
   - **MP4 fundo verde** → Compartilhar → CapCut → Sobreposição → Chroma key no verde.
   - **MP4 final:** vídeo pronto, com legenda e áudio.
   - **SRT e ASS** também saem.
   - O MOV transparente (ProRes) só existe na versão do Mac.
5. Vídeos e projetos ficam guardados no aparelho. Use o ✕ na lista para apagar e liberar espaço.

Build: `npm run build:pwa` gera a pasta `dist-pwa/`. O Render publica sozinho a cada push na branch.

### Ativar a nuvem (uma vez só, grátis)

1. Crie uma conta grátis em https://console.groq.com e gere uma API key (começa com `gsk_`).
2. No Render, abra o serviço **editor-legenda-api**, vá em **Environment** e adicione `GROQ_API_KEY` com a chave. Salve; ele reinicia sozinho.
3. Pronto. A chave fica só no servidor, nunca no app nem no GitHub.

O plano grátis do Groq permite 2.000 transcrições/dia e cerca de 8 h de áudio por dia. O servidor grátis do Render dorme após 15 min sem uso; o app já acorda ele ao abrir, então a 1ª transcrição do dia pode levar ~1 min a mais. Limite de proteção: 60 transcrições por hora por IP (`LIMIT_PER_HOUR`).

## Comandos

- `npm run build:pwa` / `npm run preview:pwa`: versão iPhone (porta 4173)

- `npm run dev`: editor (web em 5173 e API em 3210, só localhost)
- `npm run verify`: typecheck, testes e os dois builds (Mac e iPhone)
- `npm run studio`: Remotion Studio com exemplo de todos os modelos

## Licença Remotion

O Remotion é grátis para uso individual e para empresas com até 3 pessoas. Acima disso, exige licença: https://remotion.pro

A versão iPhone bloqueia, pela política de segurança (CSP), o contador de uso do Remotion (`remotion.pro`). Nenhum dado sai do aparelho além do áudio enviado à OpenAI. Se você for uma empresa licenciada, libere esse domínio na CSP do `vite.config.ts`.

Instale as dependências com npm 11: `npx npm@11 install`. O npm 10 tem um bug com o vitest 4.

Alertas do `npm audit`: restam 4 de severidade baixa, todos do `deepmerge` dentro do `workbox-build`. Esse pacote só roda no build da PWA e ainda não tem correção.
