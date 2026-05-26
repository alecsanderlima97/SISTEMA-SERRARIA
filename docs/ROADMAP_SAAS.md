# Roadmap SaaS - Sistema Serraria

Este documento organiza a evolucao do sistema para um produto comercial, seguro e escalavel.

## Ponto de seguranca

Backup local criado em:

`backups/backup ponto de segurança 2026-05-26_11-19-14`

## Fase 1 - Seguranca e estabilidade

- Revisar regras do Firestore por perfil de usuario. **Publicado em 2026-05-26:** usuarios pendentes nao acessam colecoes operacionais e usuarios comuns nao podem promover o proprio cargo.
- Criar base para multiempresa usando `empresaId`. **Iniciado:** novos usuarios e gravacoes via `window.FS` recebem `empresaId`.
- Registrar `criadoPor`, `criadoEm`, `atualizadoPor` e `atualizadoEm` nos documentos principais. **Iniciado:** gravacoes via `window.FS` recebem metadados.
- Reduzir dependencia de `localStorage` em dados operacionais.
- Criar logs de auditoria para edicoes e exclusoes.
- Configurar backup automatico do Firestore. **Iniciado:** script `scripts/backup-firestore.ps1` e guia `docs/BACKUP_FIRESTORE.md` criados.

## Fase 2 - Organizacao tecnica

- Separar melhor responsabilidades entre HTML, modulos JS e servicos de dados.
- Criar camada unica de acesso ao Firestore.
- Padronizar validacoes, mascaras, erros e mensagens.
- Corrigir problemas de encoding em textos acentuados.
- Documentar instalacao, deploy, configuracao Firebase e uso dos modulos.
- Aposentar modulos antigos sem uso. **Iniciado:** `js/romaneio.legacy.js` marcado como legado; fluxo atual usa `js/romaneio_v2.js`.

## Fase 3 - Produto comercial

- Criar cadastro de empresas/clientes do SaaS.
- Criar planos de acesso e limites por plano.
- Criar tela de configuracoes da empresa.
- Criar onboarding inicial.
- Criar relatorios executivos para dono/gestor.
- Preparar apresentacao comercial e proposta de implantacao.

## Fase 4 - Automacoes

- Alertas de estoque baixo.
- Relatorio diario automatico.
- Lembretes de financeiro e cobranca.
- Follow-up de orcamentos.
- Backup automatico na VPS.
- Integracao futura com WhatsApp.

## Prioridade recomendada

Comecar por seguranca e multiempresa antes de vender para mais de uma serraria. Isso evita mistura de dados, reduz risco operacional e aumenta o valor comercial do produto.
