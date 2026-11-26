# OpenCode Remote 📱

App nativo iOS (React Native + Expo) para controlar o **OpenCode** do seu PC remotamente pelo iPhone. Escaneia o QR Code original do `opencode pair --remote` e tenha terminal completo no bolso.

## ✨ Features

- 📷 **Scan QR Code nativo** - Usa `expo-barcode-scanner` para ler o QR do terminal
- ⌨️ **Terminal completo** - Input nativo, histórico, autocomplete, comandos rápidos
- 🎨 **Tema adaptativo** - Claro/Escuro/Sistema, fontes configuráveis (12-20px)
- ⚡ **Performance nativa** - 60fps, reanimated, haptics, gestos
- 🔒 **Seguro** - Armazenamento criptografado (expo-secure-store), sem cloud
- 📦 **Compacto** - ~15MB IPA, instala via esign/Sideloadly/AltStore
- ⚙️ **Totalmente configurável** - Auto-connect, keep-alive, compact mode, etc.

## 🚀 Como obter o IPA (sem Mac)

### Opção 1: GitHub Actions (Recomendado, Grátis)

1. **Fork este repo** no GitHub
2. Vá em **Settings → Secrets and variables → Actions**
3. Adicione `EXPO_TOKEN`:
   - Execute `npx eas login` localmente
   - Pegue o token em `~/.expo/credentials.json` ou crie em https://expo.dev/accounts/[username]/settings/access-tokens
4. Vá na aba **Actions** → **Build iOS IPA** → **Run workflow**
5. Escolha `preview` (para instalar direto) ou `production` (para TestFlight)
6. Aguarde ~10-15 min → Baixe o artifact `opencode-remote-ipa`
7. Instale no iPhone via **esign** / **Sideloadly** / **AltStore**

### Opção 2: EAS Build Local (precisa de conta Expo)

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
# Aguarda na nuvem → baixa o .ipa
```

### Opção 3: Codemagic / Bitrise / AppCenter

Configure o projeto Expo nesses CI/CD - todos suportam build iOS grátis.

## 📱 Instalação no iPhone

### Via esign (no próprio iPhone, sem PC)
1. Abra o esign → **Apps** → **+** → **Import IPA**
2. Selecione o `.ipa` baixado (via Files/Share)
3. Aguarde assinar → **Install**

### Via Sideloadly (Windows/Mac/Linux)
1. Conecte iPhone via USB
2. Arraste o `.ipa` para o Sideloadly
3. Insira Apple ID → **Start**

### Via AltStore (iPhone + PC na mesma rede)
1. Instale AltStore no PC e iPhone
2. No AltStore (iPhone) → **My Apps** → **+** → selecione IPA

## 🔧 Como usar

### No PC (Terminal)
```bash
# Instala opencode se não tiver
npm install -g opencode-ai

# Gera QR Code para pareamento
opencode pair --remote

# Ou mostra a chave manual
opencode pair --show-key
```

### No iPhone
1. Abra **OpenCode Remote**
2. Toque em **"Abrir Câmera"** (aba Parear)
3. Escaneie o QR Code do terminal
4. Pronto! Vai para a aba **Terminal** automaticamente

### Pareamento Manual
Se não quiser usar câmera:
1. Aba **Parear** → toque em **"Manual"**
2. Cole a **URL do servidor** (ex: `ws://192.168.1.50:8080`)
3. Cole a **Chave Pública** (do `opencode pair --show-key`)
3. Toque **Conectar**

## ⚙️ Configurações

| Opção | Descrição |
|-------|-----------|
| **Tema** | Sistema / Claro / Escuro |
| **Tamanho da Fonte** | 12-20px (botões rápidos) |
| **Números de Linha** | Mostra numeração no terminal |
| **Modo Compacto** | Reduz espaçamento vertical |
| **Auto Scroll** | Rola automaticamente para novas msgs |
| **Manter Conexão** | WebSocket ativo em background |
| **Auto-conectar** | Reconecta ao abrir o app |
| **Feedback Tátil** | Vibração em ações |

## 🏗️ Desenvolvimento

```bash
# Instala dependências
npm install

# Inicia Metro bundler
npm start

# Abre no iOS Simulator (precisa Mac)
npm run ios

# Abre no Android
npm run android

# Build local para device (precisa Mac + Xcode)
npm run build:preview
```

## 📂 Estrutura

```
src/
├── components/
│   ├── ui/           # Button, Input, Card
│   ├── QRScanner.tsx # Scanner nativo com overlay bonito
│   └── Providers.tsx # QueryClient, Theme, GestureHandler
├── hooks/
│   └── useTheme.ts   # Tema adaptativo com cores completas
├── screens/
│   ├── PairingScreen.tsx  # QR + manual pairing
│   ├── TerminalScreen.tsx # Terminal principal
│   └── SettingsScreen.tsx # Configurações completas
├── store/
│   └── index.ts      # Zustand + AsyncStorage persist
└── types/
    └── index.ts      # TypeScript types
```

## 🔐 Privacidade & Segurança

- **Zero telemetria** - Nenhum dado sai do seu dispositivo
- **Armazenamento local** - Pareamento, sessões, configurações no AsyncStorage/SecureStore
- **Rede local only** - Conecta direto no seu PC via WebSocket (ws://)
- **Open Source** - Código 100% auditável

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Câmera não autorizada" | Ajustes → OpenCode Remote → Câmera: ON |
| "Não conecta" | Verifique se PC e iPhone estão na mesma Wi-Fi; firewall liberando porta 8080 |
| "QR Code inválido" | Use `opencode pair --remote` (não `--show-key`) para QR |
| "IPA não instala" | Verifique se assinou corretamente no esign; certificado não expirado |
| "Build falha no GitHub" | Confira se `EXPO_TOKEN` está nos Secrets; repo não é privado sem config |

## 📄 Licença

MIT - Use livremente, modifique, distribua.

## 🤝 Contribuindo

PRs bem-vindos! Abra issue primeiro para discutir mudanças grandes.

---

**Feito com ❤️ para devs que codam no PC mas vivem no celular.**