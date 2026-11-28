# Voz do Rafael

Estado atual (v1.2.3): microfone, ditado, voz na nuvem e escolha do modelo já vão
compilados no `.ipa` pelo workflow de CI (`macos-26` + prebuild + archive).

## Como funciona

1. **Toque no orbe** → o Rafael começa a ouvir (`expo-speech-recognition`, ditado do iOS em pt-BR).
2. A transcrição aparece na legenda em tempo real. Quando você para de falar,
   o texto é enviado sozinho para a sessão do OpenCode no PC.
3. A resposta chega por streaming; ao terminar, o Rafael fala com a voz do Fish Audio.
4. **Toque de novo** encerra a escuta e envia o que já foi ouvido.
5. **Digitar** abre o teclado para quem preferir escrever.

## Fim de fala (endpointing)

O app não depende do "final" do reconhecedor: depois da última palavra ele espera
um silêncio curto e fecha a frase sozinho.

| Situação | Espera |
|---|---|
| frase em aberto (parcial) | 1,6 s |
| reconhecedor marcou final | 0,9 s |
| `speechend` do iOS | 0,8 s |

Pausas para respirar não cortam a frase; silêncio longo encerra sem tocar na tela.
Se o microfone for negado, mostra o aviso e volta para o teclado.

## Voz (Fish Audio)

- Endpoint: `POST https://api.fish.audio/v1/tts`, modelo `s2.1-pro-free` (grátis).
- A chave **não** fica no repositório: secret `FISH_API_KEY` do GitHub → `EXPO_PUBLIC_FISH_API_KEY`.
- Sem chave, cai na voz nativa do iOS (`expo-speech`, pt-BR).
- Ajustes → **Rafael**: 95 vozes em português do Fish (`src/rafael/voices.ts`,
  todas as que o catálogo público tem, ordenadas por popularidade), modelo de voz
  (`s2.1-pro-free`, `s2-pro`, `s1`) e o modo de resposta falada.

## Resposta longa = resumo falado

Em **Ajustes → Rafael → Resposta falada**:

| Modo | O que faz |
|---|---|
| Resumo | fala as primeiras frases (até ~210 caracteres) e avisa que o resto está na tela |
| Completo | fala a resposta inteira |
| Sem voz | não fala nada |

O áudio é fatiado em frases curtas e a próxima frase é sintetizada **enquanto** a atual
toca — o primeiro som sai antes e não há pausas entre frases.

## Orbe

Três formas, escolhidas em **Ajustes → Rafael → Orbe** (sem galeria, só a miniatura):

| Orbe | O que é |
|---|---|
| Partículas | o orbe original, restaurado |
| Siri Wave | ondas suaves que seguem a voz |
| Mercury | líquido metálico com brilho móvel |

**Cores do orbe**: paleta viva (o orbe troca de cor devagar, como sempre fez) ou duas
cores fixas — "de dentro" e "de fora" — com predefinições (Neon, Pôr do sol, Aurora,
Violeta, Gelo, Fogo, Menta, Rosa, Ouro, Prata).

## Modelo do OpenCode

Acima do campo de escrita existe a pílula do modelo. Ao tocar, o app lê o catálogo
real do PC:

- `GET /api/model` — modelos disponíveis (`{ data: Model.Info[] }`, com
  `providerID` + `id`); nomes de provedor vêm de `GET /api/provider`;
- `GET /api/model/default` — modelo padrão do servidor (usado em "Padrão do agente");
- servidores antigos: `/api/config/providers`, `/api/config` e `/api/provider`.

A troca é feita em `POST /api/session/:id/model` com
`{ model: { providerID, id } }` — o `/prompt` não aceita o campo `model`.
Se o app não conseguir listar, a folha mostra os status HTTP de `/api/model` e
`/api/provider` para diagnosticar.

A mesma folha lista os **agentes** do PC (`GET /api/agent`) e deixa trocar
(`POST /api/session/:id/agent`). O agente `build` tem ferramentas (roda comandos,
edita arquivos); `plan` só lê. O app **não força mais** o agente `rafael` — isso era o
que deixava o modelo "sem acesso ao PC".

## Comandos por voz

| Você diz | O que acontece |
|---|---|
| "troca para o modelo opus" | casa com a lista do PC e troca via `/session/:id/model` |
| "usa o modelo gpt-5" | idem |
| "qual é o seu modelo?" | o Rafael fala o modelo atual |
| "qual é o modelo do PC?" | idem |
| "sim" / "pode" / "permitir" | libera o pedido de permissão pendente (uma vez) |
| "não" / "nega" / "recusa" | recusa o pedido pendente |

## Permissões (controlar o PC)

Quando o agente precisa rodar um comando ou editar um arquivo, o OpenCode abre um
pedido de permissão e **fica parado esperando**. O app escuta os eventos
`permission.asked` / `permission.updated`, mostra um cartão acima da pílula
("o rafael precisa de permissão") com **permitir / sempre / negar** e aceita
"sim"/"não" por voz. A resposta vai em
`POST /api/session/:id/permission/:requestID/reply` (`{ decision }`;
servidores antigos: `/permissions/:id` com `{ response }`).
Sem isso, o agente não conclui a tarefa e o modelo responde que não tem acesso.

## Resumo dos recursos

| Recurso | Estado |
|---|---|
| Orbe reagindo ao texto | sim |
| Ditado sem teclado | sim (módulo nativo no build) |
| Fim de fala por silêncio | sim |
| Rafael falando em voz alta | sim (Fish; fallback iOS) |
| Escolha da voz e do modelo de voz | sim (Ajustes) |
| Escolha do orbe e das cores | sim (Ajustes) |
| Escolha do modelo do OpenCode | sim (pílula acima do campo; lista real do PC) |
| Troca de modelo por voz | sim |
| Aprovar permissões por voz | sim ("sim"/"não") |
| Resumo automático de respostas longas | sim |
