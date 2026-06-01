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

Redirect URI sugerida:

- `https://orquestracs.com/api/outlook-callback`

Escopos Microsoft planejados:

- `offline_access`
- `openid`
- `profile`
- `email`
- `Mail.Read`

Primeira etapa entregue:

- endpoint `/api/outlook-status`
- endpoint `/api/outlook-auth`
- endpoint `/api/outlook-callback`
- endpoint `/api/outlook-disconnect`
- painel visual em `Configuracoes` para mostrar status da integracao

Proximas etapas:

1. Registrar app na Microsoft
2. Configurar variaveis de ambiente na Vercel
3. Buscar mensagens e anexos
4. Criar fila `documentos_recebidos`
5. Validar/importar no sistema
