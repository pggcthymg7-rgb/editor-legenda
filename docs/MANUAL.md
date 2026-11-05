# Manual do Editor de Legendas

Editor de legendas animadas no estilo de reels. Ele transcreve o vídeo, gera legendas com 8 modelos tipográficos, deixa editar cada frase e cada palavra, coloca a legenda atrás da pessoa e exporta camadas para o Premiere e o CapCut.

| Versão | Onde | Como abrir |
|---|---|---|
| **iPhone (PWA)** | https://editor-legenda.onrender.com | Safari → Compartilhar → **Adicionar à Tela de Início** |
| **Mac** | seu computador | `npm install && npm run dev` e abra http://localhost:5173 no Chrome |

As duas versões têm a mesma tela. O que muda é onde as coisas rodam:
- **No iPhone,** tudo fica e roda no aparelho, menos a transcrição pela nuvem.
- **No Mac,** um servidor local guarda os arquivos e gera os vídeos.

---

## 1. Tela inicial

| Item | O que faz | Como funciona |
|---|---|---|
| **Caixa tracejada** | Escolhe o vídeo (mp4, mov, m4v, webm) | No iPhone abre o Fotos ou o Arquivos. O vídeo é guardado no aparelho (iPhone) ou enviado ao servidor local (Mac). |
| **Idioma falado** | Português, Inglês, Espanhol ou Detectar sozinho | Diz à IA qual língua esperar. O idioma errado gera um texto errado. |
| **Nuvem rápida e grátis** | Transcreve em segundos (padrão) | Tira só o áudio (cerca de 0,25 MB por minuto) e manda ao nosso servidor no Render, que usa o Groq (Whisper large-v3-turbo). A chave já está no servidor. Na 1ª vez do dia pode levar até 1 min a mais, porque o servidor estava dormindo. |
| Caixa **gsk_… / Ativar** | Aparece só se o servidor estiver sem chave | Cole a sua chave grátis do Groq. Ela fica guardada só neste aparelho. **Remover chave** apaga. |
| **No aparelho, offline** | Transcreve sem internet (reserva) | Whisper roda no próprio aparelho: GPU no Chrome/Mac, processador no iPhone. Baixa o modelo uma vez. Se a nuvem falhar, o app usa este modo sozinho. |
| Seletor do modelo | base, small, medium e large-v3-turbo (os dois últimos só no Mac) | Modelo maior é mais preciso e mais lento. No iPhone use o **base**. |
| **Usar minha própria chave da OpenAI** | Opção avançada | No iPhone você cola a chave `sk-…`. No Mac ela fica no arquivo `.env`. |
| **Sem transcrição (eu digito)** | Abre o editor vazio | Você cria as frases na mão. |
| **Criar legendas** | Começa | Guarda o vídeo, transcreve, agrupa em frases e sugere um modelo para cada uma. |
| **Projetos salvos** | Lista projetos anteriores | Toque no nome para abrir. **✕** apaga o projeto e o vídeo (só no iPhone). |

---

## 2. Tela do editor (visão geral)

```
┌ Barra superior ─────────────────────────────────────────────┐
│ Biblioteca (esq.) │      Monitor (centro)     │ Inspetor (dir.) │
├────────────────────────── Timeline ─────────────────────────────┤
```

No iPhone a tela vira uma coluna só. Os botões **Inspetor** e **Frases e modelos** alternam o painel de baixo.

### 2.1 Barra superior

| Botão | Função |
|---|---|
| Nome do projeto | Toque para renomear |
| ↶ **Desfazer** / ↷ **Refazer** | Volta ou refaz até 100 passos (⌘Z / ⇧⌘Z) |
| Salvo / Salvando… / Erro | O projeto salva sozinho 1,5 s depois de cada mudança |
| ⌨ **Atalhos** | Lista de atalhos (tecla `?`). Escondido no celular. |
| **Novo** | Volta para a tela inicial para abrir outro vídeo |
| **Exportar** | Abre a janela de exportação (seção 7) |

### 2.2 Monitor (centro)

| Item | Função |
|---|---|
| Vídeo com legendas | Mostra o resultado final em tempo real |
| Clique numa legenda | Seleciona a **frase** (contorno roxo) |
| Clique de novo numa palavra (ou Alt + clique) | Seleciona só a **palavra** (contorno amarelo tracejado) |
| Arrastar | Move a frase inteira ou só a palavra selecionada |
| ◻ Alça do canto (frase selecionada, pausado) | Arraste para aumentar ou diminuir a frase |
| ○ Alça de cima | Arraste para girar a frase (ímã a cada 15°; segure Alt para girar livre) |
| ⏮ Início / ⏭ Fim | Vai para o começo ou o fim (Home / End) |
| ◁▏ / ▕▷ | Volta ou avança 1 quadro (← / →; com Shift, 1 s) |
| ▶ / ⏸ | Play e pausa (Espaço) |
| Timecode `mm:ss:qq` | Tempo atual / duração (minutos:segundos:quadros a 30 fps) |
| 🔊 Som | Liga ou desliga o som |
| ▭ **Área segura** | Mostra em vermelho as áreas que a interface do Reels/TikTok cobre (topo, base e lateral direita) |
| ▦ **Grade** | Grade de terços para compor |

### 2.3 Timeline (embaixo)

| Item | Função |
|---|---|
| **T** | Nova frase "Texto" na agulha (tecla T) |
| ✂ **Dividir** | Divide a frase selecionada na agulha (tecla S) |
| ⧉ **Duplicar** | Copia a frase logo depois dela (⌘D) |
| 🗑 **Apagar** | Apaga a frase selecionada (Delete) |
| 🧲 **Ímã** | Liga ou desliga o encaixe nas bordas das frases e na agulha |
| − / barra / + | Zoom da timeline (também ⌘ + roda do mouse) |
| 🔍 **Ajustar** | Mostra o vídeo inteiro na largura |
| Régua | Toque ou arraste para mover a agulha (linha vermelha) |
| Faixa **Legendas** | Um bloco por frase. Arrastar o meio **move**; arrastar as bordas **apara** (as palavras esticam junto). Listrado = frase atrás da pessoa. |
| Faixa **Palavras** | Um bloco por palavra. Toque seleciona; as bordas ajustam o início e o fim só daquela palavra. |
| Faixa **Áudio** | Forma de onda: os picos verdes são a fala e ajudam a acertar o tempo |

---

## 3. Biblioteca (painel da esquerda)

### Aba Frases
| Item | Função |
|---|---|
| **+ frase** | Cria uma frase no tempo atual |
| Cartão da frase | Toque seleciona e leva a agulha até ela. Mostra o tempo e o modelo. |
| Seletor de modelo | Troca o modelo da frase |
| Campo de texto | Corrige o texto. Enter confirma. Os tempos se redistribuem se o número de palavras mudar. |
| **−0,1s / +0,1s** | Adianta ou atrasa a frase |
| **Dividir** | Divide no meio |
| **Juntar ↓** | Junta com a próxima |
| **Apagar** | Remove a frase |

### Aba Modelos
Galeria dos 8 modelos, cada um com uma prévia:

| Modelo | Visual |
|---|---|
| P1 Editorial Serif | Serif de alto contraste, palavra-chave enorme em cromo |
| P2 Serif + Itálico Lilás | Palavra-chave itálica em degradê lilás |
| P3 Sans Fina Palavra-Única | Uma palavra por vez, sans fina |
| P4 Sans Bold Arredondada | Palavras pulando em arco |
| P5 Palavra Gigante | Uma palavra ocupando a largura toda |
| P6 Número Neon | Número magenta neon que conta de 0 até o valor |
| P7 Caixa Alta Mista | Caixa alta colorida, itálico e serif com 3D |
| P8 Destaque Colorido | Uma palavra em cor forte |

Passe o mouse (ou foque com Tab) para ver a prévia animada. Toque na prévia para aplicar o modelo na frase selecionada. **Em todas** aplica em todas as frases. Os seus modelos salvos aparecem no fim da lista.

### Aba Texto
| Item | Função |
|---|---|
| **Buscar / Trocar por** | Buscar e substituir em todas as frases |
| Aa | Diferencia maiúsculas de minúsculas |
| ab | Só palavra inteira |
| **Substituir tudo** | Aplica a troca e mostra quantas ocorrências |
| **−0,5s, −0,1s, +0,1s, +0,5s** | Move **todas** as legendas de uma vez (sincronia) |
| **Tirar pontuação final** | Remove `. , ! ?` do fim das palavras |
| **TUDO EM CAIXA ALTA** | Deixa todas as frases em maiúsculas |

### Aba Pessoa (legenda atrás da pessoa)
| Item | Função |
|---|---|
| **Analisar pessoa / Refazer análise** | IA (MediaPipe) recorta a pessoa quadro a quadro, no próprio aparelho. Mostra o progresso. |
| **Cancelar** | Interrompe a análise |
| **Ativar efeito** | Liga ou desliga o efeito no projeto todo sem perder a análise; desligado, volta a camada original |
| **Todas atrás / Todas na frente** | Marca ou desmarca todas as frases |

---

## 4. Inspetor (painel da direita)

Mostra o que está selecionado. Sem seleção aparece a dica e o botão **Editar a frase na agulha**.

### Aba Frase
| Controle | Função |
|---|---|
| **Posição X / Y** | Centro da frase (0 a 1 da tela) |
| **Escala** | Tamanho da frase inteira |
| **Rotação** | Gira a frase |
| **3D X / 3D Y** | Inclinação em perspectiva |
| **Alinhamento** | Esq. / Centro / Dir. |
| **Legenda atrás da pessoa** | Liga a profundidade nesta frase (precisa da análise de pessoa) |
| **Aplicar nas frases deste modelo** | Copia o visual para as frases do mesmo modelo |
| **Aplicar em todas** | Copia modelo e visual para todas as frases |
| **Salvar como modelo** | Cria um modelo seu reutilizável |
| ↺ **Restaurar** | Volta ao padrão do modelo |

### Aba Estilo
Escolha o papel e edite o estilo de todas as palavras daquele papel na frase. Os papéis são:
- **Ligação:** palavras pequenas, como "de" e "que";
- **Normal;**
- **Destaque:** a palavra-chave.

Os controles estão na seção 5.

### Aba Animação
| Controle | Função |
|---|---|
| **Revelar** | Palavra a palavra (acumula), Frase inteira ou Uma palavra por vez |
| **Entrada** | Desfoque + sobe, Pop, Fade, Desliza p/ cima, Zoom ou Corte seco |
| **Saída** | Desfoque, Fade, Zoom ou Corte seco |
| **Duração (ms)** | Tempo da animação de cada palavra |
| **Intervalo (ms)** | Atraso entre uma palavra e a próxima |
| **Segurar (ms)** | Quanto a frase fica na tela depois da última palavra |

### Aba Karaokê
**Destacar a palavra que está sendo falada**: a palavra ganha um estilo próprio enquanto é dita, no estilo CapCut/Submagic. Só os campos que você mudar aqui são aplicados.

**Pop (escala)** (1 a 1,6): a palavra falada cresce com um pulinho elástico e volta ao tamanho normal quando termina. Vai junto em **Aplicar em todas** e **Aplicar nas frases deste modelo**.

### Aba Palavra
| Controle | Função |
|---|---|
| Lista de palavras | Escolhe a palavra |
| **Texto** | Corrige só esta palavra |
| **Emoji** | Aparece quando a palavra tem sentido conhecido (ex.: dinheiro 💰, fogo 🔥). Toque para pôr o emoji no fim da palavra; tocar em outro troca |
| ✂ **Dividir nesta palavra** | A frase passa a começar nesta palavra (desligado na 1ª palavra) |
| **Papel** | Ligação / Normal / Destaque |
| **Início / Fim (ms)** | Tempo exato da palavra |
| **Posição X / Y** | Desloca só esta palavra |
| **Rotação** | Gira só esta palavra |
| **Escala horiz. / Escala vert.** | Estica ou achata a palavra |
| 🔗 Cadeado | Travado = proporção mantida; destravado = horizontal e vertical independentes |
| Estilo só desta palavra | Fonte, cor etc. só para ela (seção 5) |
| ↺ **Limpar ajustes da palavra** | Volta a palavra ao estilo da frase |

---

## 5. Editor de estilo (usado em Estilo, Karaokê e Palavra)

| Controle | Função |
|---|---|
| **Fonte** | Abre o seletor com 58 fontes grátis, cada uma escrita nela mesma. Tem busca e categorias (Serifadas, Sem serifa, Impacto, Manuscritas, Retrô). |
| **Tamanho** | Tamanho da letra, medido numa tela de 1080 px |
| **Peso** | Espessura; o limite se ajusta ao que a fonte tem |
| **Espaçamento** | Espaço entre letras |
| **Opacidade** | Transparência |
| **Itálico / CAIXA ALTA** | Liga ou desliga |
| **Cor** | Sólida ou Degradê (2 a 5 cores, com ângulo) |
| **Brilho (glow)** | Halo colorido em volta, com raio |
| **Sombra** | Cor, desfoque e altura |
| **Caixa de fundo** | Retângulo atrás da palavra (cor, opacidade, margens, cantos) |
| **Contorno** | Borda da letra (cor e espessura) |

---

## 6. Atalhos de teclado (Mac)

| Tecla | Ação |
|---|---|
| Espaço | Play / pause |
| ← / → (Shift = 1 s) | Quadro anterior / próximo |
| Alt + ← / → (Shift = 10 ms) | Adianta ou atrasa 50 ms a frase ou a palavra selecionada |
| Home / End | Início / fim |
| S | Dividir na agulha |
| T | Nova frase |
| ⌘D | Duplicar |
| Delete | Apagar frase |
| Esc | Tirar a seleção ou fechar janela |
| ⌘Z / ⇧⌘Z | Desfazer / refazer |
| ⌘ + roda | Zoom da timeline |
| ? | Ajuda de atalhos |

---

## 7. Exportar

| Item | Função |
|---|---|
| **Camada: Legendas** | Só as legendas. Frases "atrás da pessoa" já saem recortadas. |
| **Camada: Pessoa (frente)** | Só a pessoa recortada; precisa da análise. Empilhe acima de outras camadas. |
| **MOV transparente** | ProRes 4444 com transparência, para Premiere e CapCut desktop (só no Mac) |
| **MP4 fundo verde** | Para o CapCut celular: Sobreposição → Chroma key no verde |
| **WebM transparente** | Transparente e leve; aparece se o aparelho suportar |
| **MP4 final** | Vídeo pronto com a legenda gravada e o áudio |
| **SRT** | Só texto e tempo, para qualquer editor |
| **ASS** | Texto com fonte, cor, posição e escala por palavra, sem animação |
| **Compartilhar** (iPhone) | Abre o menu do iOS: Salvar vídeo, mandar ao CapCut etc. |
| **Baixar** | Salva o arquivo |
| **Cancelar** | Interrompe a geração de verdade (para o render no servidor, não só na tela) |

Observações:
- No iPhone o vídeo é gerado no próprio aparelho, em no máximo 1080 px de largura. Deixe o app aberto; a tela não apaga sozinha durante o export.
- No Premiere e no CapCut, coloque a camada no início da timeline, alinhada com o vídeo original.

---

## 8. Dúvidas comuns

| Problema | Solução |
|---|---|
| A nuvem diz "Conectando…" | O servidor grátis estava dormindo; espere até 1 min |
| A nuvem falhou | O app tenta sozinho no aparelho. Confira a internet. |
| O texto saiu em outra língua | Ajuste o **Idioma falado** e crie as legendas de novo |
| Uma palavra não seleciona no monitor | Selecione a frase primeiro e toque de novo na palavra, ou use a faixa Palavras |
| A legenda atrás da pessoa não aparece | Faça a análise na aba Pessoa, marque a frase e veja se **Ativar efeito** está ligado |
| O iPhone mostra a versão antiga | Apague o ícone da tela de início e adicione de novo |
