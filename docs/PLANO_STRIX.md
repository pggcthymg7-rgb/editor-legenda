# 🛡️ Plano de Segurança e Atualização (Baseado no Scan Strix)

Plano organizado e priorizado para a fase de **teste fechado (~10 usuários com BYOK - Bring Your Own Key)**.

---

## 1. Tabela de Achados e Ações Priorizadas

| ID | Prioridade | Veredito | Arquivo:linha | O que muda (linguagem simples) | Dono | Revisor | Teste que prova | Risco de regressão | Custo | Depende de |
|---|---|---|---|---|---|---|---|---|---|---|
| **STX-01** | **P0** | **CONFIRMADO** (validado pelo Claude Code) | `cloud/proxy.mjs:28-33` | O servidor passa a usar estritamente a chave individual de cada usuário (BYOK) e nunca queima cota do projeto. | Claude Code | Antigravity | `provider({ GROQ_API_KEY: 'srv' }, 'gsk_user').key === 'gsk_user'` | Baixo | Baixo | Conferência manual no Render |
| **STX-02** | **P0** | **CONFIRMADO** | `cloud/proxy.mjs:60-140` | O proxy bloqueia automaticamente a chave quando atingir 90% do teto oficial da Groq (segundos/pedidos). | Claude Code | Antigravity | Mock de janela móvel excedendo 6.480s/hora ou 18 req/min retornando 429 com Retry-After | Médio | Médio | STX-01 |
| **STX-03** | **P0** | **CONFIRMADO** | `src/app/cloud.ts:58-75` + `src/app/components/UploadScreen.tsx:220` | O app envia a duração do áudio e exibe mensagem amigável quando a cota da Groq bater no teto ou der 429. | Antigravity | Claude Code | Mock de resposta 429 exibindo aviso claro de horário de retorno em vez de falha genérica | Baixo | Baixo | STX-02 |
| **STX-04** | **P1** | **PARCIAL** (validado pelo Claude Code) | `cloud/proxy.mjs:110-125` | O proxy oculta o nome do provedor no `/health` e exige cabeçalho de origem caso haja uso de chave global. | Claude Code | Antigravity | Teste de requisição direta sem Origin e teste de `/health` não ecoando `"groq"` | Baixo | Baixo | STX-01 |
| **STX-05** | **P1** | **NÃO PROCEDE** (validado pelo Claude Code) | `cloud/proxy.mjs:42-45` | Nenhuma alteração de código: documenta no código que o Render sempre anexa o IP legítimo no final do `x-forwarded-for`. | Claude Code | Antigravity | Teste unitário existente de extração do último IP de `x-forwarded-for` | Nulo | Baixo | - |
| **STX-06** | **P2** | **CONFIRMADO** (validado pelo Claude Code) | `server/index.ts:140-165` | O servidor local valida a assinatura real dos bytes (magic bytes) no upload para rejeitar arquivos corrompidos ou falsos. | Claude Code | Antigravity | Upload de payload falso (`GIF89a...`) com extensão `.mp4` retornando erro 415 | Baixo | Baixo | - |
| **STX-07** | **P2** | **CONFIRMADO** (validado pelo Claude Code) | `server/track3d.ts:18-25, 103-110` | Limpeza automática (TTL 30 min) e IDs seguros em jobs de câmera 3D para evitar acúmulo de memória. | Claude Code | Antigravity | Teste com fake timers verificando descarte do job após 31 minutos | Baixo | Baixo | - |
| **STX-08** | **P2** | **PARCIAL** | `src/core/validate.ts:50-130` + `tests/server.test.ts` | Testes de borda adicionais em `safeMediaName` e padronização das validações de entrada. | Antigravity | Claude Code | Suíte de testes unitários com caracteres exóticos e caminhos relativos em `safeMediaName` | Baixo | Baixo | - |

---

## 2. Ordem de Execução em Lotes

### 🚀 Lote 1 — Blindagem de Cotas & BYOK (P0)
- **Foco**: Garantir isolamento financeiro total e proteção contra travamento de cotas dos testadores.
- **Arquivos**: `cloud/proxy.mjs`, `src/app/cloud.ts`, `src/app/components/UploadScreen.tsx`, `tests/cloud.test.ts`.
- **Entregáveis**:
  1. `cloud/proxy.mjs`: `provider()` prioriza chave do usuário (`userKey`) e rejeita ausência de chave se o Render estiver desprovido de segredo global.
  2. `cloud/proxy.mjs`: Janela deslizante de contagem em memória por hash SHA-256 da chave (`x-groq-key`), limitando em 90% (18 req/min, 1.800 req/dia, 6.480 s de áudio/hora e 25.920 s de áudio/dia), com parâmetros configuráveis via `process.env`.
  3. `src/app/cloud.ts`: Envio do cabeçalho `x-audio-seconds`.
  4. `src/app/components/UploadScreen.tsx`: Captura do status 429 e exibição visual didática com contador/horário de liberação.

### 🛡️ Lote 2 — Higiene de Proxy e Informações (P1)
- **Foco**: Reduzir pegada de reconhecimento externo do proxy.
- **Arquivos**: `cloud/proxy.mjs`, `tests/cloud.test.ts`.
- **Entregáveis**:
  1. `cloud/proxy.mjs`: `/health` responde apenas `{ ok: true, ready: true }` sem o campo `provider: "groq"`.
  2. `cloud/proxy.mjs`: Comentário arquitetural e teste de conformidade de IP do Render (`last IP` no `x-forwarded-for`).

### 📦 Lote 3 — Robustez do Servidor Local e Qualidade (P2)
- **Foco**: Integridade de mídia local e descarte de recursos.
- **Arquivos**: `server/index.ts`, `server/track3d.ts`, `tests/server.test.ts`.
- **Entregáveis**:
  1. `server/index.ts`: Checagem dos primeiros 12 bytes no stream de upload (`ftyp` para MP4/MOV e `1A 45 DF A3` para WebM).
  2. `server/track3d.ts`: `pruneJobs()` com expiração em 30 minutos e geração de ID via `newId('t3')`.
  3. `tests/server.test.ts`: Bateria de testes de borda para `safeMediaName`.

---

## 3. O que NÃO Fazer (Itens Descartados e Justificativas)

1. **Exigir `Origin` incondicionalmente no `/health`**:
   - *Motivo*: O `/health` serve apenas para o navegador e monitorias checarem se o container do Render acordou. Bloquear requests sem Origin quebra ferramentas de healthcheck externas e testes automatizados sem ganho real de segurança.
2. **Alterar a lógica de leitura do `X-Forwarded-For`**:
   - *Motivo*: O relatório sugeriu que o IP poderia ser falsificado. No entanto, a infraestrutura do Render anexa o IP real do cliente no final da cadeia. Usar a primeira entrada geraria sim risco de falsificação; a implementação atual (última entrada) está tecnicamente correta.
3. **Persistência pesada de banco de dados para contagem de cotas nesta fase**:
   - *Motivo*: O grupo é de apenas ~10 testadores. Um Redis ou banco SQL traria complexidade desproporcional. Contagem em memória no Node é suficiente para este estágio.

---

## 4. Ações que Dependem do Usuário

1. **Painel do Render**: Acessar o dashboard do Render e certificar-se de que as variáveis `GROQ_API_KEY` e `OPENAI_API_KEY` estejam vazias/removidas (forçando 100% de uso BYOK dos testadores).
2. **Revogação de Chave**: Caso alguma chave pessoal tenha sido colada em ambiente público, revogá-la imediatamente em `console.groq.com/keys`.
3. **Conferência de Cotas**: Orientar os testadores a observarem suas cotas individuais em `console.groq.com/settings/limits`.
4. **Deploy em Produção**: Disparar o deploy manual no Render após a aprovação e commit do Lote 1 e Lote 2 (conforme item E1 do projeto).
5. **Reteste do Strix**: Executar o scanner novamente após o deploy dos lotes.

---

## 5. Comando Sugerido para Reteste do Strix

Após a implementação dos lotes aprovados:
```bash
cd ~/Projetos/editor-legenda && strix --target . --output-dir ~/Projetos/editor-legenda-teste/strix_runs/retest_$(date +%Y%m%d)
```
