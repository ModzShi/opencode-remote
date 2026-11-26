# Guia Rápido: Build do IPA no GitHub Actions (Grátis)

## 📋 Pré-requisitos

1. Conta no **GitHub** (grátis)
2. Conta no **Expo** (grátis) - https://expo.dev
3. iPhone com **iOS 16+**

---

## 🚀 Passo a Passo (10 min)

### 1. Fork / Clone este repo

```bash
# No GitHub: clique em "Fork" no canto superior direito
# Ou clone localmente e suba para seu GitHub:
git clone https://github.com/SEU_USUARIO/opencode-remote.git
cd opencode-remote
git push origin main
```

### 2. Crie o token do Expo

1. Acesse https://expo.dev/accounts/[SEU_USUARIO]/settings/access-tokens
2. Clique em **"Create Token"**
3. Nome: `GitHub Actions Build`
4. Copie o token (começa com `expo_...`)

### 3. Configure o Secret no GitHub

1. No seu repo forkado: **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
   - Name: `EXPO_TOKEN`
   - Value: `expo_seu_token_aqui`
3. **Add secret**

### 4. Rode o Build

1. Aba **Actions** no seu repo
2. Workflow: **"Build iOS IPA"**
3. **Run workflow** (botão verde à direita)
4. Profile: `preview` (para instalar direto no iPhone)
5. **Run workflow**

### 5. Baixe o IPA

- Aguarde ~10-15 minutos
- Clique no workflow rodado → **Artifacts** → `opencode-remote-ipa`
- Baixe o `.zip` → extraia → `opencode-remote.ipa`

---

## 📱 Instalação no iPhone

### Via esign (direto no iPhone, sem PC)

1. Abra o app **esign** no iPhone
2. **Apps** → **+** → **Import IPA**
3. Selecione o arquivo `.ipa` (via Files app / Share)
4. Aguarde assinar → **Install**
5. Confie no certificado: **Ajustes → Geral → VPN e Gerenciamento de Dispositivo**

### Via Sideloadly (Windows/Mac/Linux)

```bash
# Baixe: https://sideloadly.io/
# Conecte iPhone via USB
# Arraste IPA → Apple ID → Start
```

### Via AltStore (Wi-Fi)

1. Instale AltServer no PC + AltStore no iPhone
2. No iPhone: AltStore → **My Apps** → **+** → selecione IPA

---

## 🔧 Configuração Pós-Instalação

### No PC (Terminal)

```bash
# Instala opencode
npm install -g opencode-ai

# Gera QR Code para pareamento
opencode pair --remote

# OU mostra chave manual
opencode pair --show-key
```

### No iPhone (OpenCode Remote)

1. Abra o app → aba **Parear**
2. **Abrir Câmera** → escaneie o QR do terminal
3. Pronto! Vai para aba **Terminal**

---

## 🔄 Atualizações Futuras

Basta dar `git push` no seu fork → GitHub Actions roda automaticamente → novo IPA disponível.

Para build de **produção** (TestFlight/App Store):
- Profile: `production` no workflow
- Configure `APP_STORE_CONNECT_API_KEY` nos secrets

---

## 🐛 Problemas Comuns

| Erro | Solução |
|------|---------|
| `EXPO_TOKEN not found` | Verifique se o secret está em **Settings → Secrets → Actions** |
| `Build failed: provisioning profile` | Use profile `preview` (não precisa de certificado Apple) |
| `IPA não instala no esign` | Certifique-se de usar profile `preview`; certificado não expirou |
| `Não conecta no PC` | Mesmo Wi-Fi; firewall liberando porta 8080; `opencode pair --remote` rodando |

---

## 💡 Dicas Pro

- **Auto-build em tags**: Crie tag `v1.0.0` → gera Release automático com IPA anexado
- **Múltiplos perfis**: Edite `.github/workflows/build-ipa.yml` para adicionar `development`
- **Cache npm**: Já configurado no workflow para builds mais rápidos
- **Tamanho do IPA**: ~15MB (muito leve)

---

## 📞 Suporte

- Issues: https://github.com/SEU_USUARIO/opencode-remote/issues
- OpenCode: https://github.com/opencode-ai/opencode
- Expo Docs: https://docs.expo.dev/build/introduction/