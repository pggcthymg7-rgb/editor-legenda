# AGENTS.md: instruções para qualquer agente (Antigravity, Claude Code, Codex…)

Projeto: **Editor de Legendas** (legendas animadas estilo reels, Mac + iPhone PWA). Idioma do projeto: **PT-BR**.

## Leia primeiro
1. `docs/CEREBRO.md`: estado atual, arquitetura, serviços e comandos.
2. `docs/KANBAN.md` e `public/kanban.html` (`http://127.0.0.1:5173/kanban.html`): quadro Kanban oficial do projeto (Em Planejamento, Na Fila, Em Execução, Em Correção, Finalizado, Descartado).
3. `docs/PLANO_REVISAO.md`: o que revisar e testar agora (Fase 2). Marque `[x]` ao concluir.
4. `docs/MANUAL.md`: como o app funciona, botão por botão.

## Regras
- **Kanban Obrigatório (`docs/KANBAN.md` + `public/kanban.html`):** Antigravity e Claude Code devem manter o Kanban sempre atualizado em qualquer mudança de status de tarefa, preenchendo sempre: **🗣️ Linguagem Popular**, **🔧 Engenharia de Software**, **🔄 O que altera no App**, **🐛 Qual era o Erro (Antes)** e **✅ Resultado Final (Depois)**.
- Nada está pronto sem `npm run verify` com 0 erros. Ele roda tipos, testes, build do Mac e build da PWA.
- Instale dependências com `npx npm@11 install`.
- Um item do plano por commit, com mensagem clara em PT-BR.
- **Estilo é dado (JSON):** modelo novo é uma entrada em `PRESETS`, não código novo. A validação bloqueia `url(` e `<script`; não afrouxe.
- **Segredos:** nunca coloque chaves no código. A chave do Groq fica só no Render (`GROQ_API_KEY`).
- **Arquivos pesados:**
  - não remova `public/models/` (IA de pessoa, offline);
  - não remova o plugin `mediapipe` do `vite.config.ts`.
- **iPhone:**
  - a transcrição local usa CPU no Safari (`isSafariLike`);
  - não force WebGPU lá;
  - mantenha a CSP liberando `remotion.media`, `cdn.jsdelivr.net`, `*.hf.co` e o proxy.
- **Depois de publicar:** o deploy do Render é manual (veja `CEREBRO.md`).
