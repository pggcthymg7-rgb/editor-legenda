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
| Testes (41) | `tests/` |
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
