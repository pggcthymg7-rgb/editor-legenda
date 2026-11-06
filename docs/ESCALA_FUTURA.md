# 📈 Registro de Decisões de Escala Futura (Pós-Teste Fechado)

Este documento registra todas as simplificações de engenharia adotadas conscientemente durante a fase de **teste fechado (~10 usuários)**, detalhando o motivo atual e a rota de evolução para a fase de uso comercial em larga escala.

---

## 1. Matriz de Decisões e Evolução

| Área | Decisão Atual (Fase de Teste Fechado) | Motivo da Simplificação Atual | Rota de Evolução (Fase Comercial) |
|---|---|---|---|
| **Controle de Cotas** | Contagem de segundos e requisições mantida estritamente na memória RAM do Node (`cloud/proxy.mjs`). | Tráfego baixo (~10 pessoas) e custo zero de infraestrutura. | Migrar para cache distribuído atômico (Redis/Upstash) com janelas móveis persistentes entre múltiplos workers. |
| **Identificação de Usuário** | Rate limit baseado em hash SHA-256 da chave Groq (`x-groq-key`) e IP de fallback. | Não há tela de login nem cadastro de usuários no editor. | Implementar autenticação de ponta a ponta (Auth0/Supabase/Clerk) com limites associados à conta (`user_id`). |
| **Modelo de Custos** | BYOK obrigatório (cada usuário cadastra e consome sua própria chave Groq gratuita). | Elimina qualquer risco de faturamento inesperado para o projeto no teste. | Decidir entre plano por assinatura (o servidor banca a API com pooling de chaves pagas) ou modelo freemium híbrido. |
| **Segurança de Origem** | Checagem de cabeçalhos `Origin` e `x-app: legendas` no proxy. | Suficiente contra chamadas CSRF acidentais de navegadores comuns. | Adicionar autenticação com tokens JWT assinados ou HMAC temporário gerado pelo app cliente. |
| **Parâmetros de Limites** | Variáveis de ambiente no Render (`LIMIT_REQ_MIN`, `LIMIT_AUDIO_SEC_HOUR`, etc.) com defaults estáticos. | Facilidade de ajuste rápido durante os testes sem redeploy. | Gerenciamento de cotas em tabela de planos vinculada ao gateway de pagamento (Stripe). |
| **Deploy do Proxy (Render)** | Deploy manual acionado pelo operador no painel do Render. | Evita builds desnecessários a cada commit de desenvolvimento local. | Configurar CI/CD automático via GitHub Actions / Webhooks oficiais do Render (item E1 do plano geral). |
| **Privacidade e Dados** | Nenhuma gravação persistente de áudio, transcrições ou chaves nos servidores. | Conformidade e segurança por design para os testadores conhecidos. | Elaborar Termos de Uso e Política de Privacidade formal (LGPD / GDPR) com consentimento explícito. |
| **Servidor Local (Uploads)** | Validação de magic bytes (.mp4, .mov, .webm) sem sandbox pesada. | O servidor local roda apenas na máquina do próprio usuário em 127.0.0.1. | Se no futuro houver upload para nuvem central, processar mídias em containers isolados efêmeros. |
| **Rastreio 3D (Track3D)** | Jobs do COLMAP armazenados em Map de memória com limpeza automática local (TTL 30 min). | Uso monoposto no Mac local. | Em versão cloud, despachar renderização e processamento 3D para filas dedicadas (BullMQ / AWS SQS + Worker GPU). |

---

## 2. Cronograma de Revisão de Limites

- **Data de Revisão**: **30 dias após o início dos testes com os 10 usuários** (ou caso algum usuário reporte bloqueio prematuro de 429).
- **Métricas a Monitorar**:
  - Duração média dos vídeos testados (em segundos).
  - Frequência de atingimento do teto de 90% (6.480 s/hora).
  - Taxa de conversão de quem prefere transcrição offline no aparelho vs. nuvem.
