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

## Comandos

- `npm run dev`: editor (web em 5173 e API em 3210, só localhost)
- `npm run verify`: typecheck + testes
- `npm run studio`: Remotion Studio com exemplo de todos os modelos

## Licença Remotion

O Remotion é grátis para uso individual e para empresas com até 3 pessoas. Acima disso, exige licença: https://remotion.pro
