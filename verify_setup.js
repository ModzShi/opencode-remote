#!/usr/bin/env node
/**
 * Verifica se o projeto está configurado corretamente para build
 */

const fs = require('fs');
const path = require('path');

const checks = [
  { file: 'package.json', desc: 'Package.json existe' },
  { file: 'app.json', desc: 'App config (app.json)' },
  { file: 'eas.json', desc: 'EAS config (eas.json)' },
  { file: 'tsconfig.json', desc: 'TypeScript config' },
  { file: 'app/_layout.tsx', desc: 'Root layout' },
  { file: 'app/(tabs)/_layout.tsx', desc: 'Tabs layout' },
  { file: 'app/(tabs)/terminal.tsx', desc: 'Terminal tab' },
  { file: 'app/(tabs)/pairing.tsx', desc: 'Pairing tab' },
  { file: 'app/(tabs)/settings.tsx', desc: 'Settings tab' },
  { file: 'src/store/index.ts', desc: 'Zustand store' },
  { file: 'src/hooks/useTheme.ts', desc: 'Theme hook' },
  { file: 'src/hooks/useWebSocket.ts', desc: 'WebSocket hook' },
  { file: 'src/utils/websocket.ts', desc: 'WebSocket utility' },
  { file: 'src/components/QRScanner.tsx', desc: 'QR Scanner component' },
  { file: 'src/components/Providers.tsx', desc: 'Providers wrapper' },
  { file: 'src/screens/PairingScreen.tsx', desc: 'Pairing screen' },
  { file: 'src/screens/TerminalScreen.tsx', desc: 'Terminal screen' },
  { file: 'src/screens/SettingsScreen.tsx', desc: 'Settings screen' },
  { file: 'assets/icon.png', desc: 'App icon' },
  { file: 'assets/splash.png', desc: 'Splash screen' },
  { file: 'assets/adaptive-icon.png', desc: 'Android adaptive icon' },
  { file: 'assets/favicon.png', desc: 'Web favicon' },
  { file: '.github/workflows/build-ipa.yml', desc: 'GitHub Actions workflow' },
  { file: '.gitignore', desc: 'Git ignore' },
  { file: 'README.md', desc: 'Documentation' },
  { file: 'BUILD_GUIDE.md', desc: 'Build guide' },
];

console.log('🔍 Verificando estrutura do projeto...\n');

let passed = 0;
let failed = 0;

for (const check of checks) {
  const exists = fs.existsSync(path.join(__dirname, check.file));
  const status = exists ? '✅' : '❌';
  if (exists) passed++; else failed++;
  console.log(`${status} ${check.desc} (${check.file})`);
}

console.log(`\n📊 Resultado: ${passed}/${checks.length} verificações passaram`);

if (failed > 0) {
  console.log('\n⚠️  Arquivos faltando. Verifique a lista acima.');
  process.exit(1);
} else {
  console.log('\n🎉 Projeto pronto para build!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Faça push para o GitHub');
  console.log('2. Adicione EXPO_TOKEN nos Secrets do repo');
  console.log('3. Rode o workflow "Build iOS IPA" na aba Actions');
  console.log('4. Baixe o artifact e instale via esign');
  process.exit(0);
}