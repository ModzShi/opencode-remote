# Agentes do Rafael

Instale copiando estes arquivos para o diretório de agentes do opencode:

- Windows: `%USERPROFILE%\.config\opencode\agent\`
- macOS/Linux: `~/.config/opencode/agent/`

Depois o app consegue ativar `rafael` na sessão (`POST /api/session/{id}/agent`).

| Agente | Modo | Modelo |
|---|---|---|
| `rafael` | primary | freellmapi/claude-opus-4-5 |
| `rafael-pesquisa` | subagent | freellmapi/claude-sonnet-4-5 |
| `rafael-engenharia` | subagent | freellmapi/claude-sonnet-4-5 |
| `rafael-revisao` | subagent | freellmapi/claude-opus-4-5 |
