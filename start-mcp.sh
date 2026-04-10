#!/bin/bash
# Script para cargar variables de entorno y ejecutar el MCP WhatsApp

# Obtener el directorio donde está este script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cambiar al directorio del script para asegurar que npx encuentre el package.json
cd "$SCRIPT_DIR"

# Cargar variables de entorno desde .env
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a  # Exportar automáticamente todas las variables
    source "$SCRIPT_DIR/.env"
    set +a  # Desactivar exportación automática
fi

# Ejecutar el servidor MCP
exec npx @jskirk/mcp-whatsapp-evo "$@"
