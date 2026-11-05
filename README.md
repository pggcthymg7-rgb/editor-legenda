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

1. Escolha o vídeo e o motor de transcrição:
   - **Local**: grátis e roda no Mac. Baixa o modelo na primeira vez (`small` ≈ 250 MB).
   - **API OpenAI**: copie `.env.example` para `.env`, preencha `OPENAI_API_KEY` e reinicie.
2. O editor cria as frases e sugere um modelo para cada uma:
   - hook (primeiros 6 s): serif, lilás ou bold;
   - frases com número: neon;
   - resto: palavra única.
3. Na lista da esquerda: corrigir texto, trocar modelo, adiantar/atrasar, dividir, juntar e apagar.
4. No painel da direita, três abas:
   - **Frase**: posição, escala, rotação, 3D, animação.
   - **Estilo**: fonte, cor/degradê, brilho, sombra e contorno de cada papel (ligação, normal, chave).
   - **Palavras**: estilo, posição e tempo de cada palavra.
5. Arraste o círculo no vídeo para mover a frase selecionada.
6. Use "Salvar como modelo" para criar um modelo seu.
7. Desfazer e refazer: ⌘Z / ⇧⌘Z. O projeto salva sozinho em `data/projects/`.

## Exportar

| Botão | Onde usar |
|---|---|
| MOV transparente (ProRes 4444) | Premiere e CapCut desktop: camada acima do vídeo |
| MP4 fundo verde | CapCut celular: Sobreposição → Remover fundo → Chroma key no verde |
| WebM transparente | alternativa transparente leve |
| MP4 final | vídeo pronto para postar |
| SRT | só texto e tempo |
| ASS | texto com fonte, cor e posição, sem animação |

Os exports em camada têm a duração e a resolução do vídeo original. Coloque-os no início da timeline, alinhados com o vídeo.

## App no iPhone (PWA)

Versão que roda inteira no aparelho, sem o Mac: https://editor-legenda.onrender.com

1. Abra o link no **Safari** do iPhone. Toque em Compartilhar → **Adicionar à Tela de Início**.
2. Abra o app pelo ícone **Legendas** e escolha um vídeo do Fotos.
3. Transcrição:
   - **OpenAI:** cole sua chave `sk-…` uma vez. Ela fica só no aparelho e pode ser apagada. Só o áudio vai para a OpenAI.
   - **Local:** experimental no iPhone, só com o modelo small.
   - **Sem transcrição:** você digita o texto.
4. Exportar: o vídeo é gerado no próprio iPhone, então deixe o app aberto até terminar.
   - **MP4 fundo verde** → Compartilhar → CapCut → Sobreposição → Chroma key no verde.
   - **MP4 final:** vídeo pronto, com legenda e áudio.
   - **SRT e ASS** também saem.
   - O MOV transparente (ProRes) só existe na versão do Mac.
5. Vídeos e projetos ficam guardados no aparelho. Use o ✕ na lista para apagar e liberar espaço.

Build: `npm run build:pwa` gera a pasta `dist-pwa/`. O Render publica sozinho a cada push na branch.

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
