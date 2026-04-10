# WhatsApp MCP Server

MCP server que conecta agentes de AI a WhatsApp usando la librería `evolution2-api-sdk`.

Permite a un agente de AI enviar y recibir mensajes de WhatsApp de forma controlada, con permisos configurables y validación de whitelist.

## Instalación

### Paquete npm

```bash
npm install -g @jskirk/mcp-whatsapp-evo
```

### Requisitos previos

- Node.js 18+ (preferiblemente 20+)
- npm o yarn
- Una instancia de [Evolution API](https://github.com/jskfox/evolution2-api-sdk) corriendo

### Desarrollo (desde el repo)

```bash
git clone https://github.com/jskfox/mcp-whatsapp-evo.git
cd mcp-whatsapp-evo
npm install
npm run build
```

## Configuración

La configuración se realiza mediante variables de entorno. Copia `.env.example` a `.env` y edita las credenciales:

```bash
cp .env.example .env
```

### Variables de entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `EVOLUTION_HOST` | URL de tu Evolution API | ✅ Sí |
| `EVOLUTION_API_KEY` | API key de autenticación | ✅ Sí |
| `EVOLUTION_INSTANCE_NAME` | Nombre de la instancia WhatsApp | ✅ Sí |
| `PERMISSIONS_TIER` | Nivel de permisos (read, send, admin) | No (default: admin) |
| `WHITELIST_ENABLED` | Habilitar whitelist (true/false) | No (default: true) |
| `WHITELIST_PHONES` | Teléfonos permitidos (comma-separated, E.164) | No |
| `WHITELIST_GROUPS` | Grupos permitidos (comma-separated, JID) | No |
| `WHITELIST_BLOCK_UNKNOWN` | Bloquear remitentes unknown | No (default: true) |
| `WEBHOOK_PORT` | Puerto del servidor webhook | No (default: 3000) |
| `WEBHOOK_PATH` | Path del endpoint webhook | No (default: /webhook) |
| `WEBHOOK_TOKEN` | Token para autenticación del webhook | No |

### Ejemplo .env

```env
EVOLUTION_HOST=http://localhost:8080
EVOLUTION_API_KEY=mi-api-key
EVOLUTION_INSTANCE_NAME=mi-instancia

PERMISSIONS_TIER=admin

WHITELIST_ENABLED=true
WHITELIST_PHONES=+5491112345678,+5491187654321
WHITELIST_GROUPS=123456789@g.us
WHITELIST_BLOCK_UNKNOWN=true

WEBHOOK_PORT=3000
WEBHOOK_PATH=/webhook
WEBHOOK_TOKEN=mi-token-secreto
```

## Uso

### Ejecución con npx (sin instalar)

```bash
npx @jskirk/mcp-whatsapp-evo
```

### Ejecución instalada globalmente

```bash
# Después de: npm install -g @jskirk/mcp-whatsapp-evo
mcp-whatsapp-evo
```

### Ejecución desde desarrollo

```bash
# Carga variables de entorno desde .env
export $(cat .env | xargs)
node dist/index.js

# O directamente con dotenv
node -r dotenv/config dist/index.js
```

### Integración con Editors (MCP Clients)

#### Cursor

Agrega en `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "bash",
      "args": ["-c", "source ~/.env_whatsapp && mcp-whatsapp-evo"]
    }
  }
}
```

Luego crea `~/.env_whatsapp` con las variables:

```env
EVOLUTION_HOST=http://localhost:8080
EVOLUTION_API_KEY=mi-api-key
EVOLUTION_INSTANCE_NAME=mi-instancia
PERMISSIONS_TIER=admin
WHITELIST_ENABLED=true
WHITELIST_PHONES=+5491112345678
WEBHOOK_PORT=3000
WEBHOOK_TOKEN=mi-token
```

#### VS Code (con extension MCP)

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "bash",
      "args": ["-c", "source ~/.env_whatsapp && mcp-whatsapp-evo"]
    }
  }
}
```

#### Claude Desktop (Anthropic)

En Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
En Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "bash",
      "args": ["-c", "source ~/.env_whatsapp && mcp-whatsapp-evo"]
    }
  }
}
```

#### Windsurf

En `~/.windsurf/mcp.json`:

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "bash",
      "args": ["-c", "source ~/.env_whatsapp && mcp-whatsapp-evo"]
    }
  }
}
```

## Herramientas Disponibles (16 tools)

### Mensajería

| Tool | Descripción | Permiso |
|------|-------------|---------|
| `whatsapp_send_text` | Enviar mensaje de texto | send |
| `whatsapp_send_media` | Enviar imagen, video, documento | send |
| `whatsapp_send_location` | Enviar ubicación | send |
| `whatsapp_send_contact` | Enviar contacto | send |
| `whatsapp_send_reaction` | Enviar reacción | send |

### Instancia

| Tool | Descripción | Permiso |
|------|-------------|---------|
| `whatsapp_connect` | Conectar instancia | admin |
| `whatsapp_disconnect` | Desconectar instancia | admin |
| `whatsapp_connection_status` | Estado de conexión | read |
| `whatsapp_set_presence` | Configurar presencia | admin |

### Chats

| Tool | Descripción | Permiso |
|------|-------------|---------|
| `whatsapp_get_chats` | Listar chats | read |
| `whatsapp_get_contacts` | Listar contactos | read |
| `whatsapp_get_messages` | Historial de mensajes | read |
| `whatsapp_mark_as_read` | Marcar como leído | send |
| `whatsapp_check_number` | Verificar si tiene WhatsApp | read |
| `whatsapp_block_number` | Bloquear/desbloquear número | send |

### Grupos

| Tool | Descripción | Permiso |
|------|-------------|---------|
| `whatsapp_get_groups` | Listar grupos | read |
| `whatsapp_get_group_members` | Miembros de grupo | read |
| `whatsapp_send_group_message` | Mensaje a grupo | send |
| `whatsapp_create_group` | Crear grupo | admin |
| `whatsapp_update_group` | Actualizar grupo | admin |

## Sistema de Permisos

3 niveles jerárquicos:

```
admin > send > read
```

Un agente con tier `send` puede usar herramientas `read` y `send`, pero no `admin`.

## Whitelist

Cuando `WHITELIST_ENABLED=true`:

- **Envíos salientes**: Solo puede enviar a números/grupos en la whitelist
- **Recepciones entrantes**: Si `WHITELIST_BLOCK_UNKNOWN=true`, ignora mensajes de números no en whitelist

Cuando `WHITELIST_ENABLED=false`:
- Puede enviar a cualquier número
- recibe de cualquier número

## Webhook (Mensajes Entrantes)

El servidor levanta un HTTP server en el puerto configurado (`default: 3000`).

El endpoint `POST /webhook` recibe mensajes entrantes de WhatsApp.

### Configurar Webhook en Evolution API

En tu Evolution API, configura la URL del webhook:

```
http://tu-servidor:3000/webhook?token=tu-token-secreto
```

### Formato del Webhook

```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5491112345678@s.whatsapp.net",
      "fromMe": false
    },
    "message": {
      "conversation": "Hola!"
    },
    "pushName": "Nombre"
  }
}
```

## Integración con n8n

### Opción 1: n8n como MCP Client

n8n puede usar este MCP server como integración:

1. ** Instala el n8n MCP extension** (si disponible)
2. **Configura en n8n settings:**

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "node",
      "args": ["/path/to/mcp-whatsapp-evo/dist/index.js"]
    }
  }
}
```

3. **Usa las tools en workflows n8n** para enviar mensajes de WhatsApp desde tus automatizaciones.

### Opción 2: n8n como Webhook Receiver

Puedes usar n8n para recibir eventos del MCP y procesarlos:

1. El MCP recibe un mensaje entrante por webhook
2. n8n hace polling a los recursos del MCP o recibe notificaciones
3. n8n procesa y actúa según el contenido

### Opción 3: HTTP Request Node

Usa el n8n HTTP Request Node para llamar directamente a la Evolution API:

```
┌─────────────┐      HTTP Request       ┌──────────────┐
│   n8n       │ ──────────────────────► │ Evolution API│
│  Workflow   │                         │   (directo)  │
└─────────────┘                         └──────────────┘
```

Esta opción es útil si prefieres no usar MCP pero quieres automatizar con n8n.

## Casos de Uso

### 1. Escalation Agent (Man in the Loop)

Cuando un agente necesita ayuda humana:

```
Agente AI ──send_message──► WhatsApp ──webhook──► Humano
                                        ▲
                                        │
                                    Responde
                                        │
Agente AI ◄──── Continúa ──────────────┘
```

### 2. Notificaciones

El agente envía actualizaciones a usuarios:

```
Agente AI ──send_message──► WhatsApp ──► Usuario
```

### 3. Queries

El agente consulta información:

```
Agente AI ──get_messages──► WhatsApp ◄── Chat History
```

## Logs

Los logs van a stdout/stderr:

```
[server] Starting WhatsApp MCP server...
[config] Loaded configuration from environment
[sdk] Evolution API SDK initialized
[sdk] Connected to WhatsApp instance
[mcp] Registered 16 tools
[mcp] MCP server started on stdio transport
[webhook] Webhook server running at http://localhost:3000
```

## Troubleshooting

### "Instance not connected"

Verifica que tu Evolution API tenga la instancia conectada y el webhook configurado.

### "Number not in whitelist"

El número no está en la whitelist. Agrégalo a `.env` en `WHITELIST_PHONES`.

### "Permission denied"

El tier del agente es insuficiente para esa tool. Aumenta el tier en `PERMISSIONS_TIER`.

### Tests fallan

```bash
npm test
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Build
npm run build

# Modo watch
npm run watch

# Lint
npm run lint

# Tests
npm test
```

## Publicar en npm

```bash
# Login en npm
npm login

# Publicar (scoped package requiere access)
npm publish --access public
```

## Arquitectura de Seguridad

```
┌─────────────────────────────────────────────────────────┐
│                    Agente AI                            │
└─────────────────┬───────────────────────────────────────┘
                  │ MCP (stdio)
┌─────────────────▼───────────────────────────────────────┐
│              MCP Server (mcp-whatsapp)                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Permission Guard (¿tiene tier suficiente?)    │   │
│  └─────────────────────┬───────────────────────────┘   │
│  ┌─────────────────────▼───────────────────────────┐   │
│  │ 2. Whitelist Validator (¿está en lista blanca?) │   │
│  └─────────────────────┬───────────────────────────┘   │
│  ┌─────────────────────▼───────────────────────────┐   │
│  │ 3. Sanitizer (¿input seguro?)                   │   │
│  └─────────────────────┬───────────────────────────┘   │
│  ┌─────────────────────▼───────────────────────────┐   │
│  │ 4. Evolution SDK (¿respuesta válida?)            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              Evolution API / WhatsApp                    │
└─────────────────────────────────────────────────────────┘
```

## Licencia

ISC

## Autor

**Jorge Solano Kirk**

- GitHub: [jskfox](https://github.com/jskfox)
- Twitter/X: [@jskfox](https://x.com/jskfox)
- LinkedIn: jorge.skirk

---

Hecho con ❤️
