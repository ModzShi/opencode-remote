# Voz do Rafael

Estado atual (v1.1.0): microfone, ditado e voz na nuvem já vão compilados no `.ipa`
pelo workflow de CI (`macos-26` + prebuild + archive).

## Como funciona

1. **Toque no orbe** → o Rafael começa a ouvir (`expo-speech-recognition`, ditado do iOS em pt-BR).
2. A transcrição aparece na legenda em tempo real. Quando você para de falar,
   o texto é enviado sozinho para a sessão do OpenCode no PC.
3. A resposta chega por streaming; ao terminar, o Rafael fala com a voz do Fish Audio.
4. **Toque de novo** durante a fala encerra a escuta e envia o que já foi ouvido.
5. **Digitar** abre o teclado para quem preferir escrever.

## Voz (Fish Audio)

- Endpoint: `POST https://api.fish.audio/v1/tts`, modelo `s2.1-pro-free` (grátis).
- A chave **não** fica no repositório: secret `FISH_API_KEY` do GitHub → `EXPO_PUBLIC_FISH_API_KEY` no build.
- Sem chave, cai na voz nativa do iOS (`expo-speech`, pt-BR).
- Ajustes → **Rafael**: 30 vozes do Fish (`src/rafael/voices.ts`), modelo de voz
  (`s2.1-pro-free`, `s2-pro`, `s1`) e o modo de resposta falada.

## Resposta longa = resumo falado

Em **Ajustes → Rafael → Resposta falada**:

| Modo | O que faz |
|---|---|
| Resumo | fala as primeiras frases (até ~210 caracteres) e avisa que o resto está na tela |
| Completo | fala a resposta inteira |
| Sem voz | não fala nada (útil no modo silencioso) |

O áudio é fatiado em frases curtas e a próxima frase é sintetizada **enquanto** a atual
toca — o primeiro som sai antes e não há pausas entre frases.

## Latitude do ditado

`maxAlternatives: 1`, `interimResults: true`, `continuous: true`, `addsPunctuation: true`.
Se o usuário negar microfone/ditado, o app mostra um aviso e volta ao teclado.

## Resumo dos recursos

| Recurso | Estado |
|---|---|
| Orbe reagindo ao texto | sim |
| Ditado sem teclado | sim (módulo nativo no build) |
| Rafael falando em voz alta | sim (Fish; fallback iOS) |
| Escolha da voz e do modelo de voz | sim (Ajustes) |
| Resumo automático de respostas longas | sim |
| Galeria de orbes | sim (aba Orbes, 20 estilos) |
