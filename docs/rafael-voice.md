# Voz do Rafael — o que falta e como ligar

## Por que hoje não tem áudio

O app que você instala é um `.ipa` **já compilado**. Eu só consigo trocar o `main.jsbundle`
(JavaScript/Hermes) dentro dele. Microfone, gravação, síntese de voz e reprodução de áudio
são **código nativo** (Swift/AVFoundation) — não dá para injetar por JS.

Este binário não tem `expo-audio`, `expo-av` nem `expo-speech` compilados.
Por isso o caminho atual é o ditado do teclado do iPhone dentro do campo do Rafael.

## Como ligar de verdade (sem Mac)

O build pode ser feito na nuvem pelo EAS:

```bash
npx expo install expo-audio expo-speech
npx eas-cli build -p ios --profile preview
```

Depois disso o binário passa a ter microfone (nível de áudio em tempo real) e voz sintetizada.

## Código que passa a valer (src/rafael/voice.ts)

```ts
import { useAudioRecorder, RecordingPresets } from 'expo-audio';
import * as Speech from 'expo-speech';

export function speak(text: string) {
  Speech.speak(text, { language: 'pt-BR', rate: 1.02, pitch: 1 });
}

// nível 0..1 para o orbe reagir ao microfone
export const levelRef = { current: 0 };
```

Aí `<ParticleOrb level={levelRef.current} />` passa a vibrar com a sua voz, não só com o texto.

## Reconhecimento de fala (ditar sem teclado)

Para ouvir comandos sem abrir o teclado é preciso mais um módulo nativo
(`expo-speech-recognition` ou `@react-native-voice/voice`). É a mesma conta:
uma dependência nativa a mais, um build na nuvem.

## Resumo

| Recurso | Hoje | Com build nativo |
|---|---|---|
| Orbe reagindo ao texto | sim | sim |
| Orbe reagindo à voz | não | sim |
| Rafael falando em voz alta | não | sim |
| Comando de voz sem teclado | não (usa ditado do iOS) | sim |
