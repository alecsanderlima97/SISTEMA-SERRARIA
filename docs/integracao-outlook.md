# Integracao Outlook / Hotmail

Conta alvo inicial:

- `escritoriovanmarte@hotmail.com`

Objetivo desta integracao:

- Ler e-mails recebidos
- Identificar anexos/documentos
- Enviar os documentos para fila de conferencia no sistema

Configuracoes necessarias na Vercel:

- `OUTLOOK_CLIENT_ID`
- `OUTLOOK_CLIENT_SECRET`
- `OUTLOOK_REDIRECT_URI`
- `OUTLOOK_TENANT_ID` (opcional, pode usar `common`)
- `OUTLOOK_TARGET_EMAIL=escritoriovanmarte@hotmail.com`

Escopos Microsoft planejados:

- `offline_access`
- `openid`
- `profile`
- `email`
- `Mail.Read`

Primeira etapa entregue:

- endpoint `/api/outlook-status`
- endpoint `/api/outlook-auth`
- painel visual em `Configuracoes` para mostrar status da integracao

Proximas etapas:

1. Registrar app na Microsoft
2. Configurar variaveis de ambiente na Vercel
3. Implementar callback seguro e troca do `code` por token
4. Buscar mensagens e anexos
5. Criar fila `documentos_recebidos`
6. Validar/importar no sistema
