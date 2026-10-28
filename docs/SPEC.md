# Especificação — MVoz

> App Android **pessoal** para treinar a voz todos os dias, com medidor de tom ao vivo, um **Guia** que monta o plano para o meu objetivo (no meu caso, feminilização da voz) e IA para explicar e "simular" os exercícios.
> Uso individual: sem login, sem servidor, dados e gravações no aparelho, IA configurada por mim.

## Índice

0. Como usar este documento
1. Visão e princípios
2. Stack e bibliotecas
3. Arquitetura e pastas
4. Design system
5. Navegação
6. Mapa de gestos
7. Motor de áudio (medidor)
8. Exercícios (catálogo, player e rotinas)
9. Guia e plano
10. Telas em detalhe
11. Central de Notificações
12. Camada de IA
13. Modelo de dados
14. Saúde vocal e segurança
15. Qualidade, acessibilidade e estados
16. Fases de construção e critérios de pronto
17. Fora do escopo

---

## 0. Como usar este documento

- **Antes de cada fase:** leia a seção da fase (16) e as seções que ela cita. Não implemente nada de fases futuras.
- Se algo aqui estiver ambíguo, conflitar com a realidade técnica ou tiver uma alternativa claramente melhor, **pergunte ou proponha antes de implementar**, explicando o porquê.
- **Nunca mostre botões que ainda não funcionam.** Funções de fases futuras simplesmente não aparecem até existirem. Única exceção: as 4 abas existem desde a Fase 1, com um estado vazio temporário.
- Todo texto da interface em **português do Brasil**. Os textos de leitura dos exercícios de fala também são em português (é a língua em que vou usar a voz no dia a dia).
- Código (variáveis, funções, arquivos, rotas) em **inglês**.
- Muita coisa vem pronta do app **Meu Inglês** (`c:\inetpub\wwwroot\MIngles`): tema, componentes base, banco, cliente de IA, Central de Notificações e backup. Copie e adapte em vez de reescrever (seção 3.1).
- O conteúdo completo dos 45 exercícios (passos, medição, cuidados, fontes) está em **`docs/EXERCICIOS.md`**. As evidências por trás das metas, prazos e regras de segurança, com as referências, estão em **`docs/PESQUISA.md`**.

---

## 1. Visão e princípios

### 1.1 O ciclo do app

```
Guia (objetivo + gravação inicial)  →  plano por etapas  →  treino do dia (exercícios com medidor)
          ↑                                                           ↓
   ajuste do plano  ←  check-in semanal (gravação + marcos)  ←  registro (minutos, como foi, desconforto)
```

- O Guia descobre meu objetivo e meu ponto de partida e monta um plano com etapas.
- O treino do dia sai do plano (ou de uma rotina que eu montei).
- Toda semana um check-in grava a mesma leitura, compara com o início e decide se avanço de etapa.

### 1.2 Princípios de produto

1. **Saúde primeiro.** Nunca forçar. Aquecimento antes do trabalho pesado, tempo máximo por dia, botão "Senti dor" sempre à vista (seção 14).
2. **Ver a voz.** Todo exercício que dá para medir mostra retorno ao vivo: tom (Hz), faixa-alvo e ressonância estimada.
3. **Calmo, sem culpa.** Sem streak punitivo, sem sons de jogo, sem confete. Linguagem gentil e direta.
4. **Honesto com os números.** Tom é medido com boa precisão; ressonância é **estimativa** e aparece sempre comparada comigo mesma. O app não dá nota de "quão feminina/masculina" a voz soa.
5. **Privado e discreto.** Gravações **nunca saem do aparelho**. A IA recebe só texto e números. Notificações podem usar texto discreto.
6. **Offline primeiro.** Medidor, exercícios, plano, gravações e progresso funcionam sem internet. Só a IA precisa de conexão.
7. **Gestos aceleram, nunca escondem.** Toda ação por gesto tem um botão visível equivalente.
8. **Uma mão.** Ação principal na metade de baixo da tela.

---

## 2. Stack e bibliotecas

Instale sempre com `npx expo install` para manter versões compatíveis com o SDK.
**Não adicione bibliotecas fora desta lista sem justificar e pedir meu OK.**

| Função | Biblioteca | Fase |
|---|---|---|
| Base | Expo **SDK 58** (estável mais recente), TypeScript `strict`, Expo Router | 1 |
| Development build | `expo-dev-client` | 1 |
| Gestos e animação | `react-native-gesture-handler`, `react-native-reanimated` | 1 |
| Estado de UI | `zustand` | 1 |
| Banco local | `expo-sqlite` | 1 |
| Validação | `zod` | 1 |
| Chave segura | `expo-secure-store` | 1 |
| Ids | `expo-crypto` | 1 |
| Ícones | `@expo/vector-icons` (conjunto Feather) | 1 |
| Testes | `jest-expo`, `@testing-library/react-native` | 1 |
| Microfone ao vivo, gravação e reprodução | `expo-audio` (`useAudioStream`) | 2 |
| Detecção de tom (F0) | `pitchy` (método McLeod, JS puro) | 2 |
| Arquivos (gravações WAV, tons de referência) | `expo-file-system` | 2 |
| Gráfico do tom ao vivo e gráficos do Progresso | `react-native-svg` | 2 |
| Bottom sheets | `@gorhom/bottom-sheet` | 3 |
| Vibração | `expo-haptics` | 3 |
| Tela acesa durante o exercício | `expo-keep-awake` | 3 |
| Listas longas | `@shopify/flash-list` | 3 |
| Notificações locais | `expo-notifications`, `expo-task-manager` | 6 |
| Backup e compartilhar gravação | `expo-sharing`, `expo-document-picker` | 6 |

Bibliotecas avaliadas e **descartadas** (pesquisa de out/2026):
- `react-native-audio-api`: ótima, mas ainda antes da 1.0 e sem garantia no SDK 58. Só reconsiderar se a latência de ~100 ms do `expo-audio` atrapalhar ou se precisarmos de tom de referência deslizando ao vivo.
- `@siteed/audio-studio`: análises marcadas como "experimentais" pelo próprio autor, detector de tom simples, um único mantenedor.
- `pitchfinder` (licença GPL, pior nos testes), `meyda` (parada desde 2024, sem formantes), pacotes de tom abandonados (`react-native-pitch-detector`, `react-native-live-audio-stream`).
- Nenhuma biblioteca mantida estima **formantes** em JS: escrevemos nós (seção 7.3).

### Development build desde a Fase 1

- O Expo Go do meu celular não roda o SDK 58 e o app depende de módulos nativos de áudio. Por isso usamos **development build desde o início** (sem Expo Go):
  1. `eas build --profile development --platform android`
  2. Instalar o APK no celular e usar `npx expo start`.
- Para economizar builds, o primeiro build já inclui **todos os módulos nativos da tabela acima**. Instalar a biblioteca não é implementar a função: o código de cada fase continua só na sua fase.
- Se algum módulo não funcionar, **avise e explique o passo a passo**. Não contorne em silêncio.

---

## 3. Arquitetura e pastas

```
app/                              # rotas (Expo Router), telas finas
  _layout.tsx                     # providers: tema, gesture root, bottom sheet, db
  (tabs)/_layout.tsx              # tab bar customizada com o botão central do Medidor
  (tabs)/index.tsx                # Hoje
  (tabs)/exercises.tsx            # Exercícios (catálogo)
  (tabs)/plan.tsx                 # Plano
  (tabs)/progress.tsx             # Progresso
  meter.tsx                       # Medidor livre (tela cheia)
  session.tsx                     # Treino do dia (sequência de exercícios)
  exercise/[id]/index.tsx         # Detalhe do exercício
  exercise/[id]/play.tsx          # Fazer o exercício (player)
  exercise/[id]/simulate.tsx      # Simulação com IA
  routines/index.tsx              # Minhas rotinas
  routines/[id].tsx               # Montar/editar rotina
  guide/index.tsx                 # Guia: perguntas
  guide/baseline.tsx              # Gravação inicial
  guide/result.tsx                # Plano proposto
  checkin.tsx                     # Check-in semanal
  recordings/index.tsx            # Gravações
  recordings/[id].tsx             # Detalhe da gravação
  recordings/compare.tsx          # Antes × depois
  coach.tsx                       # Perguntar à IA
  settings/index.tsx
  settings/notifications/index.tsx
  settings/notifications/[type].tsx
  settings/ai.tsx
  settings/profile.tsx            # Sobre mim
  settings/training.tsx           # Treino (faixa-alvo, limites, notação)
  settings/appearance.tsx
  settings/data.tsx
src/
  theme/            # tokens, ThemeProvider, useTheme
  components/ui/    # Button, IconButton, Chip, Card, Sheet, ListRow, SwipeRow, Toggle,
                    # Stepper, TimeField, WeekdayPicker, Segmented, EmptyState,
                    # ErrorState, Skeleton, Snackbar, ProgressBar, CoachMark
  components/       # componentes de domínio: PitchTrace, TargetBand, PitchReadout,
                    # ResonanceGauge, RecordButton, ExerciseTimer, StepList...
  audio/            # captura (stream), quadros, tom, formantes, métricas, WAV, tons de referência
  exercises/        # catálogo (dados), tipos, schema zod, critérios de acerto
  guide/            # perguntas, regras do plano, etapas, marcos, progressão
  features/         # lógica por funcionalidade: today, session, player, routines,
                    # checkin, recordings, progress, coach
  db/               # conexão, migrations, repositórios
  ai/               # client.ts, providers.ts, prompts/, schemas/, cache.ts, usage.ts
  notifications/    # channels.ts, scheduler.ts, content.ts, handlers.ts
  gestures/         # hooks reutilizáveis
  stores/           # zustand
  lib/              # datas, ids, formatação, notas musicais
  i18n/strings.ts   # todos os textos da interface
```

Regras:
- Telas em `app/` só montam layout e chamam hooks de `features/`.
- Acesso ao banco **somente** por repositórios em `src/db/`.
- Chamadas de IA **somente** por `src/ai/client.ts`.
- Processamento de áudio **somente** em `src/audio/`, em funções puras e testáveis (entrada: `Float32Array` e taxa de amostragem).
- Cores, espaçamentos, fontes e durações **somente** via tokens do tema.

### 3.1 O que vem do Meu Inglês

Copiar e adaptar (trocar textos, nomes e o que for específico de inglês):

| De `MIngles/` | Para | Observação |
|---|---|---|
| `src/theme/` | `src/theme/` | Trocar as cores (4.1) |
| `src/components/ui/` | `src/components/ui/` | Inclui `useModalSheet`, `Screen` com teclado, `SortableList` |
| `src/db/client.ts`, `migrate.ts`, `settingsRepo.ts`, `aiUsageRepo.ts`, `aiCacheRepo.ts` | `src/db/` | Migrations começam do zero (001) |
| `src/ai/` (cliente, provedores, erros, JSON, chave, cache, uso) | `src/ai/` | Sem as funções/prompts de inglês |
| `src/notifications/` | `src/notifications/` | Fase 6, com os tipos da seção 11 |
| `src/features/data/` (backup) | `src/features/data/` | Fase 6 |
| `app/settings/ai.tsx` e componentes de IA | idem | |
| Configs: `eslint.config.js`, `tsconfig.json`, `babel.config.js`, `jest.setup.ts`, `eas.json` | raiz | Revisar para o SDK 58 |

---

## 4. Design system

### 4.1 Cores

Mesmos neutros do Meu Inglês; cor principal violeta, para os dois apps não se confundirem no celular.

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F7F6F3` | `#111113` | Fundo das telas |
| `surface` | `#FFFFFF` | `#1A1A1D` | Cartões, sheets |
| `surfaceAlt` | `#EFEDE8` | `#232326` | Campos, áreas secundárias, trilho dos medidores |
| `border` | `#E3E0DA` | `#2E2E33` | Divisores, grade do gráfico |
| `text` | `#1C1B19` | `#EDEDEF` | Texto principal |
| `textMuted` | `#6B6862` | `#A1A1A8` | Texto secundário, marca "Seu início" |
| `primary` | `#6E56CF` | `#9E8CFC` | Ação principal, item ativo, linha do tom |
| `onPrimary` | `#FFFFFF` | `#0B0B0C` | Texto sobre `primary` |
| `target` | `#0D8B7D` | `#2EC8B5` | Bordas da faixa-alvo, curva-alvo (só gráfico, nunca texto) |
| `targetSoft` | `#D5F2EC` | `#10302B` | Preenchimento da faixa-alvo |
| `success` | `#218358` | `#3DD68C` | "Na faixa", marco cumprido (com ícone) |
| `warning` | `#B45309` | `#F5A524` | Cansaço, "abaixo da faixa" (com ícone) |
| `danger` | `#E5484D` | `#F2555A` | Gravando, "Senti dor", excluir |

- Tema segue o sistema por padrão; pode ser fixado em claro/escuro.
- Contraste mínimo AA para texto. `target`, `success`, `warning` e `danger` são para gráficos, ícones e fundos; texto sempre em `text`/`textMuted` (ou `onPrimary` sobre `primary`).
- Nunca use cor como único indicador: sempre com rótulo ou ícone (ex.: "Na faixa ✓").

### 4.2 Tipografia

Fonte do sistema (Roboto). Números com `fontVariant: ['tabular-nums']` para não "pular" ao mudar.

| Token | Tamanho/altura | Peso | Uso |
|---|---|---|---|
| `meter` | 56/64 | 700 | Hz grande do medidor |
| `display` | 32/40 | 700 | Números grandes do Progresso |
| `title` | 24/32 | 700 | Título de tela |
| `heading` | 19/26 | 600 | Título de seção/cartão |
| `body` | 17/24 | 400 | Texto padrão |
| `reading` | 20/30 | 400 | Textos de leitura dos exercícios (ajustável 16–26) |
| `label` | 15/20 | 500 | Botões, chips |
| `caption` | 13/18 | 400 | Metadados, eixos dos gráficos |

Escala de fonte do sistema até 130% sem quebrar layout. Nenhum texto menor que 13.

### 4.3 Espaçamento, formas e sombra

- Espaçamento: 4, 8, 12, 16, 20, 24, 32, 40. Margem lateral das telas: 16.
- Raios: 8 (chips, campos), 14 (botões, linhas), 24 (cartões grandes, sheets).
- Sombra: só no botão central e no cartão do medidor; suave (elevation 2–4).
- Alvo de toque mínimo: 48×48 dp.

### 4.4 Movimento e vibração

- Durações: 150 ms (micro), 220 ms (transições).
- A linha do tom anda de forma contínua (sem animação extra). Com "reduzir movimento": a linha continua (é dado, não enfeite), mas transições viram fade de 150 ms.
- Vibração (`expo-haptics`), sutil e desligável:
  - leve ao **entrar na faixa-alvo** depois de 1 s fora (no máximo 1 vez a cada 3 s);
  - leve a cada repetição concluída;
  - "sucesso" ao concluir o treino do dia ou um marco.

### 4.5 Componentes base

Os mesmos do Meu Inglês (Button, Chip, Sheet, Snackbar, SwipeRow, EmptyState, CoachMark...), mais os de domínio:
- **PitchReadout:** Hz grande (`meter`) + nota musical ("196 Hz · Sol 3") + estado ("Na faixa ✓", "Abaixo", "Acima", "Silêncio").
- **PitchTrace:** gráfico rolando dos últimos 8 s; eixo vertical em escala de semitons (logarítmica), faixa-alvo em `targetSoft` com bordas `target`, linha do tom em `primary`; trechos sem voz ficam vazios.
- **ResonanceGauge:** barra horizontal "mais escura ↔ mais clara" com marcador atual, marca "Seu início" e rótulo "estimativa".
- **RecordButton:** círculo `danger` com tempo gravado; segurar não é necessário (toque inicia/para).
- **ExerciseTimer:** anel de progresso do passo/repetição, com contagem de repetições.
- **StepList:** passos do exercício, com o atual em destaque.

### 4.6 Tom dos textos

Curto, gentil, em "você". **Evitar marcar gênero** nos textos ("Treino feito por hoje", "Sentiu desconforto?"). Quando não der, usar a forma escolhida em Sobre mim (feminino, masculino ou neutro), por uma função de `strings.ts` (ex.: `g({ f: 'pronta', m: 'pronto', n: 'com tudo pronto' })`).

Exemplos:
- "Treino feito por hoje. Sua voz agradece o descanso."
- "Pegue leve hoje: você relatou desconforto ontem. Separei um treino curto, só de aquecimento."
- Erro de IA: "Não consegui falar com a IA agora. O exercício funciona sem ela. Tentar de novo?"

---

## 5. Navegação

### 5.1 Tab bar

```
[ Hoje ]  [ Exercícios ]  [  🎤  ]  [ Plano ]  [ Progresso ]
```

- Altura 64 + área segura. Ícones Feather: `sun`, `list`, `mic`, `compass`, `bar-chart-2`.
- O botão central é um círculo de 56 dp em `primary`, levemente elevado. Abre o **Medidor** livre (10.2).
- Item ativo: ícone e rótulo em `primary`; inativos em `textMuted`.
- A tab bar some em telas cheias (Medidor, Treino do dia, Player, Gravação inicial, Check-in).

### 5.2 Cabeçalhos

- Abas: título grande à esquerda; em Hoje e Progresso, engrenagem à direita abre Configurações.
- Telas internas: voltar, título central, menu ⋯ quando houver ações.

### 5.3 Links internos (deep links)

Esquema `mvoz://`, usado pelas notificações:

| Link | Destino |
|---|---|
| `mvoz://session` | Treino do dia |
| `mvoz://session?minimal=1` | Treino curto ("Só tenho 5 minutos") |
| `mvoz://checkin` | Check-in semanal |
| `mvoz://meter` | Medidor |
| `mvoz://exercise/{id}` | Detalhe de um exercício |

---

## 6. Mapa de gestos

Regras gerais (iguais ao Meu Inglês): toda ação por gesto tem equivalente visível; gestos horizontais em áreas com rolagem usam `activeOffsetX` + `failOffsetY`; CoachMark na primeira visita, revisitável em Configurações.

| Tela | Gesto | Ação | Alternativa visível |
|---|---|---|---|
| Global | Toque no 🎤 | Abre o Medidor | — |
| Global | Deslizar ↓ num sheet | Fecha | Botão X |
| Medidor | Toque no gráfico | Pausa/continua a escuta | Botão Pausar |
| Medidor | Arrastar a faixa-alvo ↑↓ | Move a faixa inteira (passo de 1 semitom) | Sheet "Faixa-alvo" com Steppers |
| Treino do dia | Deslizar ← | Próximo exercício | Botão "Próximo" |
| Treino do dia | Deslizar → | Exercício anterior | Botão "Anterior" |
| Player | Toque duplo no timer | Pausa/continua | Botão Pausar |
| Listas (rotinas, gravações) | Deslizar ← | Excluir, com Snackbar "Desfazer" | Menu ⋯ do item |
| Listas | Deslizar → | Rotinas: Duplicar · Gravações: Favoritar | Menu ⋯ do item |
| Gravações | Segurar | Seleção (escolher 2 para comparar) | Botão "Comparar" |
| Montar rotina | Arrastar pela alça ≡ | Reordena | Menu do item › Mover para cima/baixo |

---

## 7. Motor de áudio (medidor)

Tudo em `src/audio/`, funções puras testadas com sinais sintéticos (senoides, vogais sintéticas com formantes conhecidos, ruído).

### 7.1 Captura

- `expo-audio` `useAudioStream` em **float32 mono, 16 kHz** (se o aparelho não aceitar, usar 44,1/48 kHz e reamostrar para 16 kHz).
- O Android entrega blocos de ~100 ms (fixo). Nós os cortamos em **quadros de 1024 amostras (64 ms) com passo de 320 (20 ms)** num buffer circular → 50 medidas por segundo, com ~100 ms de atraso na tela.
- Permissão de microfone pedida com uma tela de explicação antes do pedido do sistema. Negada → estado com "Abrir configurações".
- Ao sair da tela ou ir para segundo plano, a captura **para** (nada de microfone ligado escondido).
- **Fonte do microfone:** o `expo-audio` usa a fonte padrão do Android (`MIC`), que pode aplicar ganho automático e redução de ruído. Isso não atrapalha o tom, mas pode piorar a ressonância. Se na Fase 2 a ressonância ficar instável, avaliar uma fonte sem processamento (`VOICE_RECOGNITION`/`UNPROCESSED`), o que exigiria outra biblioteca ou um módulo nativo nosso: **perguntar antes**.
- Orientação na tela antes de medir: lugar silencioso, celular a ~20 cm da boca, sempre na mesma distância.
- O `expo-audio` ganhou o stream há pouco tempo e tem bugs abertos (out/2026, ex.: microfone não liberado se o `stop` falhar). Envolver em `src/audio/capture.ts` com tratamento de erro e reinício limpo.

### 7.2 Tom (F0)

- `pitchy` (`PitchDetector.forFloat32Array`) por quadro → `[hz, clarity]`.
- Filtros, nesta ordem:
  1. **Silêncio:** RMS abaixo do limiar → sem voz.
  2. **Clareza** < 0,9 → sem voz.
  3. Fora de **60–500 Hz** → sem voz.
  4. **Mediana de 5 quadros** contra saltos de oitava.
- Saída por quadro: `{ t, hz | null, clarity, rms }`.
- Exibição: Hz inteiro + nota (`lib/notes.ts`; notação configurável: "Sol 3" ou "G3") + estado em relação à faixa-alvo.
- A faixa-alvo é guardada em Hz, mas comparações e gráficos usam **semitons** (a percepção de tom é logarítmica).

### 7.3 Ressonância (estimativa)

- Feita por nós (não há biblioteca mantida): **LPC** só nos quadros com voz:
  1. janela de 25–30 ms, passo de 10 ms; reamostrar para ~11 kHz (teto de 5,5 kHz);
  2. pré-ênfase `y[n] = x[n] − 0,97·x[n−1]` + janela de Hamming;
  3. autocorrelação até ordem ~12 → Levinson-Durbin → coeficientes;
  4. raízes do polinômio (Durand-Kerner) → frequência e largura de banda de cada raiz; manter 90 Hz < F < 5 kHz com largura < 400 Hz; ordenar → F1, F2, F3;
  5. mediana de ~5 quadros.
- Também o **centroide espectral** (barato) como apoio.
- **Limitações (mostrar na interface):** com tom alto (≥ ~250 Hz) o LPC erra mais; o microfone do celular, o controle automático de volume e o ruído também atrapalham. Por isso:
  - a ressonância aparece **relativa ao meu início** (gravação inicial), não em valores absolutos;
  - a medida mais confiável é a das **vogais sustentadas** (/i/ e /a/) dos exercícios e do check-in;
  - na fala corrida aparece só uma tendência, com o rótulo "estimativa".

### 7.4 Métricas de um trecho

Calculadas ao vivo e guardadas com cada gravação/exercício:

| Métrica | Como |
|---|---|
| Tom médio | mediana do F0 nos quadros com voz |
| Faixa usada | percentis 10–90 do F0 (Hz e semitons) |
| Variação (entonação) | desvio-padrão em semitons |
| Tempo na faixa-alvo | % dos quadros com voz dentro da faixa |
| Estabilidade (sons sustentados) | desvio em cents em relação à média |
| Ressonância estimada | F1/F2 medianos (vogais) e centroide; diferença em relação ao início |
| Tempo de voz | segundos com voz / duração total |
| Piso | percentil 10 do F0 e % dos quadros abaixo do piso da etapa (as quedas para o grave, principalmente no fim das frases, pesam muito na percepção) |
| Final das frases | inclinação do tom nos últimos ~300 ms de cada trecho com voz: sobe, desce ou reto |
| Duração de som | segundos de som contínuo pelo volume (RMS), com ou sem voz: /s/, /z/, "a" sustentado e relação s/z |

### 7.5 Gravação e reprodução

- Gravo **WAV 16 kHz mono 16 bits** em `documentDirectory/recordings/`. Preferência: `startFileRecordingAsync({ format: 'wav' })` do stream (SDK 58); se der problema, montamos o WAV com os buffers (`src/audio/wav.ts`, que também lê WAV).
- 1 minuto ≈ 1,9 MB. Limite por gravação: 3 min (para sozinha, com aviso).
- Junto com cada gravação salvo o **traçado do tom reduzido** (10 pontos/s) e as métricas, para desenhar o gráfico sem reanalisar o áudio.
- Reprodução com `expo-audio`, com o traçado andando junto com o áudio.

### 7.6 Tom de referência

- O app **gera** o som (sem IA): onda com envelope suave e harmônicos leves (soa menos como apito), gravada em WAV no cache e tocada pelo `expo-audio`.
- Tipos: nota fixa (1–3 s), deslize entre duas notas (sirene) e **curva** (sequência de pontos `{t, hz}`, usada nos exercícios de entonação e na simulação da IA).
- Enquanto o tom toca, a análise do microfone pausa (para o medidor não medir o próprio alto-falante). Fones de ouvido são recomendados, não obrigatórios.

### 7.7 Faixa-alvo

- Padrão vem do objetivo e da gravação inicial (seção 9). Ajustável em Configurações › Treino e no Medidor.
- A meta sobe **aos poucos por etapa** (seção 9.3), nunca direto para o alvo final.

### 7.8 Desempenho

- Análise no thread JS: tom a 50 quadros/s; formantes a ~10 quadros/s. Se o celular não aguentar, reduzir as taxas (medir na Fase 2 e registrar nas notas do projeto).
- O gráfico redesenha no máximo a 30 fps; dados novos entram por um buffer, não por estado React a cada quadro.

---

## 8. Exercícios (catálogo, player e rotinas)

### 8.1 Modelo de um exercício

O catálogo fica em código (`src/exercises/catalog.ts`), validado por schema zod nos testes.

| Campo | Descrição |
|---|---|
| `id` | texto estável (ex.: `straw-phonation`) |
| `name` | nome em PT |
| `category` | ver 8.2 |
| `goals` | relevância por objetivo, 0–3: `{ feminize, masculinize, neutral, health }` |
| `level` | `beginner` \| `intermediate` \| `advanced` |
| `durationSec` / `reps` | duração ou repetições sugeridas |
| `measure` | tipo de medição (8.3) |
| `target` | relativo à faixa-alvo (ex.: "topo da faixa", "+2 st") ou nenhum |
| `success` | critério automático (ex.: `{ inTargetSec: 3, reps: 5 }`) |
| `selfRating` | autoavaliação no fim (opcional), ex.: "Quão leve ficou? 1–5" |
| `skill` | habilidade treinada (ex.: `resonance-brightness`), usada no rodízio semanal (9.3) |
| `maxSec` | limite de tempo por segurança (ex.: sussurro até 2 min) |
| `steps` | 3–6 passos curtos |
| `mistakes` | erros comuns |
| `cautions` | cuidados de saúde |
| `easier` / `harder` | ids de variações |
| `prerequisites` | ids que devem vir antes no plano |
| `readingTexts` | (exercícios de fala) textos curtos em PT |

### 8.2 Categorias

Ícone Feather + rótulo (sem cor própria):

| Código | Rótulo |
|---|---|
| `warmup` | Aquecimento |
| `breathing` | Respiração |
| `pitch` | Tom |
| `resonance` | Ressonância |
| `weight` | Peso vocal |
| `intonation` | Entonação |
| `articulation` | Articulação |
| `speech` | Fala no dia a dia |
| `cooldown` | Desaquecimento |

### 8.3 Tipos de medição no player

| `measure` | O que a tela mostra | Critério de acerto (exemplo) |
|---|---|---|
| `none` | Passos + timer (respiração, relaxamento) | Tempo completo |
| `sustain` | Hz + faixa + estabilidade | Segurar 3 s na faixa |
| `glide` | Traçado + menor/maior tom alcançado | Subir e descer sem quebras grandes |
| `match` | Tom de referência + diferença em cents | Ficar a ±50 cents por 1 s |
| `resonance` | Medidor de ressonância relativo ao início | Ficar acima do início por 3 s |
| `speech` | Texto de leitura + traçado + % na faixa + variação | ≥ 70% do tempo de voz na faixa |
| `contour` | Curva-alvo + meu traçado por cima | Seguir a curva com erro médio < 2 st |
| `duration` | Cronômetro de som contínuo (/s/, /z/, "a") | Guardar o melhor tempo |
| `mission` | Tarefa do dia a dia + notas de 0 a 10 (conforto, esforço, quanto a voz combina comigo) | Registrar a tarefa |

Exercícios cujo resultado é uma sensação (ex.: voz leve × pesada, ressonância no peito) pedem a autoavaliação `selfRating` no fim, porque o app não consegue medir isso.

### 8.4 Catálogo

45 exercícios. Objetivos: **F** feminilizar · **M** masculinizar · **N** neutra · **S** saúde/projeção (0–3). Nível: **B** iniciante · **I** intermediário · **A** avançado. Conteúdo completo de cada um em `docs/EXERCICIOS.md`.

| Cód. | `id` | Nome | Categoria | F M N S | Nível | Medição |
|---|---|---|---|---|---|---|
| W1 | `straw-phonation` | Canudo (e canudo na água) | warmup | 2 2 2 3 | B | glide |
| W2 | `lip-trill` | Vibração de lábios/língua | warmup | 2 2 2 3 | B | glide |
| W3 | `release-yawn-sigh` | Soltura e bocejo-suspiro | warmup | 1 2 1 3 | B | none |
| W4 | `silent-laugh` | Riso silencioso | warmup | 2 2 2 2 | I | none |
| B1 | `diaphragmatic-breathing` | Respiração diafragmática | breathing | 1 1 1 3 | B | duration |
| B2 | `sz-mpt` | Tempo de /s/, /z/ e "a" | breathing | 1 1 1 3 | B | duration |
| B3 | `breath-groups` | Frases por fôlego e pausas | breathing | 1 1 1 2 | B | speech |
| B4 | `projection` | Projeção com apoio | breathing | 2 3 2 3 | I | speech |
| P1 | `pitch-glides` | Glissandos e sirene | pitch | 3 2 2 3 | B | glide |
| P2 | `vocal-function` | Exercícios de Função Vocal | pitch | 2 2 2 3 | B→I | sustain |
| P3 | `target-hold` | Manter o tom-alvo / escadinha | pitch | 3 3 3 1 | B | match |
| P4 | `hum-chant-speak` | Cantarolar → entoar → falar | pitch | 3 3 3 1 | B | speech |
| P5 | `automatic-speech` | Fala automática no tom novo | pitch | 3 3 3 0 | B | speech |
| P6 | `pitch-floor` | Piso do tom | pitch | 3 0 2 0 | I | speech |
| R1 | `big-dog-small-dog` | Sentir a laringe → cachorrão/cachorrinho | resonance | 3 3 2 0 | B | resonance |
| R2 | `whisper-siren` | "iii" sussurrado / sirene sussurrada | resonance | 3 1 2 0 | B | resonance |
| R3 | `resonance-scale` | Escala Mickey ↔ Caco | resonance | 2 2 3 0 | I | resonance |
| R4 | `smile-vowels` | Vogais com sorriso | resonance | 3 0 2 0 | B | resonance |
| R5 | `forward-tongue` | Língua para a frente | resonance | 3 0 2 0 | B | resonance |
| R6 | `f2-vowels` | Vogais no alvo (F2) | resonance | 3 3 2 0 | I | resonance |
| R7 | `light-twang` | Twang leve ("nhé-nhé") | resonance | 2 0 1 1 | I | resonance |
| R8 | `chewing-hum` | Mastigação sonorizada → foco na máscara | resonance | 2 1 2 3 | B | sustain |
| Q1 | `light-heavy` | Voz leve × voz pesada | weight | 3 3 2 0 | I | sustain |
| Q2 | `easy-onset` | Início suave e fluxo | weight | 2 1 2 3 | B | speech |
| Q3 | `volume-no-weight` | Volume sem peso | weight | 2 0 2 2 | I | speech |
| I1 | `question-statement` | Pergunta × afirmação | intonation | 3 1 2 0 | B | contour |
| I2 | `stress-pairs` | Pares de tonicidade | intonation | 2 2 2 1 | B | contour |
| I3 | `contour-shadowing` | Imitar a melodia | intonation | 2 2 2 0 | I | contour |
| I4 | `expressive-reading` | Leitura expressiva | intonation | 2 1 2 1 | I | speech |
| A1 | `cork` | Rolha | articulation | 2 1 1 2 | I | none |
| A2 | `light-consonants` | Articulação leve e precisa | articulation | 2 1 1 0 | B | speech |
| S1 | `speech-ladder` | Escada da fala | speech | 3 3 3 0 | B | speech |
| S2 | `standard-passage` | Texto padrão | speech | 3 3 3 2 | B | speech |
| S3 | `monologue` | Monólogo de 1 minuto | speech | 3 3 3 0 | I | speech |
| S4 | `conversation` | Conversa treinada | speech | 3 3 3 0 | I | speech |
| S5 | `phone-messages` | Ligações e áudios | speech | 3 3 3 0 | A | speech |
| S6 | `missions` | Missões do dia a dia | speech | 3 3 3 0 | A | mission |
| C1 | `cooldown` | Desaquecimento | cooldown | 3 3 3 3 | B | glide |
| M1 | `low-larynx` | Laringe baixa ("voz de bocejo") | resonance | 0 3 1 0 | B | resonance |
| M2 | `lip-rounding` | Lábios em bico | resonance | 0 3 1 0 | B | resonance |
| M3 | `chest-resonance` | Ressonância no peito | resonance | 0 3 1 1 | B | sustain |
| M4 | `new-low` | Achar o novo grave | pitch | 0 3 2 0 | B | glide |
| M5 | `falling-endings` | Finais descendentes | intonation | 0 3 1 0 | B | contour |
| M6 | `laryngeal-massage` | Automassagem laríngea | warmup | 1 2 1 2 | I | none |
| M7 | `smooth-breaks` | Suavizar quebras (testosterona) | pitch | 0 3 0 2 | I | glide |

- O texto padrão (S2) é **nossa versão curta da fábula "O Vento Norte e o Sol"** (história de domínio público, texto escrito por nós).
- Textos de leitura, listas de palavras e frases ficam em `src/exercises/texts.ts`, em PT. A IA pode gerar mais (12.5, `readingText`).
- A Conversa treinada (S4) funciona sem IA, com uma lista fixa de perguntas; com IA, as perguntas variam (`speakingPrompts`). Eu respondo **em voz alta** e o app mede; o resumo vem no fim, não alertas no meio.

### 8.5 Player

```
 ✕   Canudo (SOVT)          passo 2/4    ⋯

       ┌──────────────────────────────┐
       │   196 Hz · Sol 3   Na faixa ✓│   ← PitchReadout
       │  ~~~~~~~~~~~~~~~~~~~~~~~~~~  │   ← PitchTrace + faixa-alvo
       └──────────────────────────────┘
       Sopre "uuu" pelo canudo deslizando     ← passo atual
       do grave ao agudo, sem forçar.

       ( 0:42 )   repetição 3 de 5            ← ExerciseTimer

 [ Ouvir o tom ]  [ ● Gravar ]  [ Explicar com IA ]
 [              Pausar              ]
           Senti dor · parar
```

- Topo: ✕ (sair; pergunta se quer salvar o que fez), nome, passo, menu ⋯ (Ver passos, Erros comuns, Cuidados, Variação mais fácil/mais difícil).
- O meio muda conforme o `measure` (8.3). O critério de acerto marca a repetição sozinho; também dá para marcar à mão ("Fiz").
- **"Senti dor · parar"** sempre visível: para tudo e mostra a orientação da seção 14.
- Tela fica acesa durante o exercício (`expo-keep-awake`).
- Ao terminar: "Como foi?" (Fácil · Ok · Difícil) e "Desconforto?" (Nenhum · Leve · Forte). Isso alimenta o plano e a segurança.
- Gravar é opcional em todo exercício; a gravação fica ligada ao resultado.
- **Retorno visual:** completo (gráfico ao vivo), parcial (1 em cada 3 tentativas sem gráfico, resumo no fim) ou só resumo. O plano diminui o retorno aos poucos (9.3), porque praticar sem olhar a tela ajuda a voz nova a ficar automática. Dá para mudar no menu ⋯.
- Exercícios com `maxSec` (ex.: sussurro) param sozinhos no limite, com a explicação do porquê.

### 8.6 Minhas rotinas

- Montar uma rotina: nome + exercícios do catálogo (busca e filtros), duração/repetições de cada, reordenar (≡ ou Mover para cima/baixo).
- Avisos (não bloqueiam): "Comece com um aquecimento", "Termine com um desaquecimento", "Tempo total acima do recomendado para o seu nível", "Este exercício costuma vir depois de X".
- Uma rotina pode substituir o treino do plano em Hoje ("Usar esta rotina hoje" ou "sempre").
- O treino do plano pode virar rotina ("Salvar como rotina") para eu editar.

---

## 9. Guia e plano

### 9.1 Perguntas do Guia

Uma pergunta por tela, com "Pular" nas opcionais. Pode refazer quando quiser (Plano › "Refazer o Guia").

Antes da primeira pergunta, uma tela curta: "Nas pesquisas, o treino com fonoaudiólogo(a) dá os melhores resultados. O MVoz ajuda você a praticar com segurança, por conta própria ou entre as sessões."

1. **Objetivo:** Voz mais feminina · Voz mais masculina · Voz neutra/andrógina · Cuidar da voz e projetar melhor.
2. **Como o app fala com você** (gênero gramatical dos textos): feminino · masculino · neutro.
3. **Contexto** (opcional): sou mulher trans · sou homem trans · pessoa não binária · outro · prefiro não dizer. Serve para o Guia ajustar as explicações; só vai para a IA se eu permitir (12.3).
4. **Hormônios** (opcional): nenhum · estrogênio · testosterona · prefiro não dizer. (Estrogênio não muda a voz; testosterona muda — o plano explica e se adapta.)
5. **Cirurgia de voz** nos últimos 6 meses? Se sim, o plano só começa depois de eu confirmar que tenho liberação da equipe médica.
6. **Experiência:** começando agora · já treinei um pouco · treino há mais de 6 meses.
7. **Acompanhamento com fono:** faço · já fiz · não faço. Se faço: o app sugere seguir primeiro o que a fono passou e montar uma rotina com esses exercícios.
8. **Tempo por dia:** 10 · 15 · 20 · 30 min. Iniciantes ficam em até 15 min (seção 14). Acima de 10 min, o treino é dividido em **2 blocos** (ex.: manhã e noite), com algumas horas entre eles.
9. **Saúde vocal** (múltipla escolha): rouquidão frequente · dor ou cansaço ao falar · refluxo · fumo · uso a voz no trabalho · nenhum.
10. **Gravação inicial** (tela própria, ~3 min, guiada passo a passo):
    - vogal /a/ sustentada (3 s) e vogal /i/ sustentada (3 s);
    - deslize do mais grave ao mais agudo confortável (extensão);
    - contar de 1 a 10;
    - ler um texto padrão curto em PT (~40 s);
    - falar livremente 30 s sobre o dia.

Resultado: tom médio na fala, faixa usada, extensão (menor/maior tom), ressonância de /a/ e /i/ (estimada) e o "Seu início" de todos os medidores.

### 9.2 Plano gerado

Gerado **por regras no aparelho** (`src/guide/`), sem IA, testável. Mostra:

- **Faixa-alvo** de tom da etapa atual e a **meta final** (seção 9.3).
- **Etapas** em ordem, cada uma com: foco, exercícios (aquecimento + principais + fala + desaquecimento), minutos por dia e **marcos** para avançar.
- **Prazo estimado** (faixa de meses, nunca uma data exata), recalculado conforme o progresso.
- Avisos de saúde que vieram das respostas.

**Estrutura de cada treino** (em cada bloco):
1. Aquecimento, 2–3 min (série W).
2. Habilidade da etapa, 5–10 min (2–3 exercícios).
3. Fala, 3–8 min (série S, usando a mesma habilidade).
4. Desaquecimento, 1–2 min (C1) + "Como foi?".

**Metas de tom por objetivo** (meta final; valores das pesquisas em `docs/PESQUISA.md`, ajustáveis):

| Objetivo | Faixa final (tom médio na fala) | Piso | Base |
|---|---|---|---|
| Voz mais feminina | 165–200 Hz | 150 Hz | Mulheres cis ~190–210 Hz; zona ambígua ~145–165 Hz; marca feminina mais citada: média ≥ 180 Hz; quedas abaixo de ~130 Hz puxam para "masculina" |
| Voz mais masculina | 100–130 Hz | — | Homens cis ~115–120 Hz. Nunca abaixo da nota grave mais limpa + 2 st |
| Voz neutra/andrógina | 145–175 Hz | 130 Hz | Zona ambígua (pouca evidência) |
| Cuidar da voz | tom habitual do início ± 2 st | — | Sem meta de mudar o tom |

Regras da faixa (proposta, testada em `src/guide/`):
- A faixa tem ~3 semitons de largura.
- Começa no **tom habitual** (mediana da fala na gravação inicial). Nas etapas de ressonância, o tom fica parado de propósito (treinar ressonância sem mudar o tom).
- Na etapa de tom, a faixa sobe (ou desce) **até 2 semitons por vez**, só quando o marco de tom é cumprido no check-in, até chegar à meta final.
- **Teto de conforto:** o topo da faixa fica pelo menos 4 semitons abaixo do tom mais agudo confortável medido no deslize. Se a meta final passar do teto, o plano para no teto e explica (a extensão costuma crescer com o treino; o teto é recalculado na regravação mensal).
- Posso mudar tudo à mão em Configurações › Treino (com aviso se sair dessas regras).

**Etapas — voz mais feminina** (durações típicas, não fixas; avanço por marcos, 9.3):

| # | Etapa | Duração típica | Exercícios | Marco para avançar |
|---|---|---|---|---|
| 1 | Fundamentos | 1–2 sem | W1–W4, B1–B3, P1 | 5 treinos sem desconforto; deslize sem quebras grandes; tempo de "a" registrado |
| 2 | Ressonância | 2–4 sem | R1, R2, R4, R5, R6, R8, Q2, S1 (até palavras) | F2 de "vi"/"vê" ≥ +5% sobre o início, no mesmo tom (±1 st), em 3 treinos, e mantido nas palavras |
| 3 | Tom | 3–6 sem | P3, P4, P5, P6 + 1 de ressonância | Tom-alvo sustentado (±50 cents por 3 s) em 80% das tentativas; leitura com mediana na faixa e percentil 10 ≥ piso |
| 4 | Peso vocal | 2–4 sem | Q1, Q3, R7 (opcional) + manutenção | Autoavaliação "leve e clara, sem soprosidade" ≥ 4/5 em 3 treinos, com a leitura ainda na faixa |
| 5 | Entonação e articulação | 2–4 sem | I1–I4, A1, A2 | Pergunta × afirmação com o final certo em 9 de 10 |
| 6 | Integração | 4+ sem | S1, S3, S4, S5, S6 | Monólogo de 1 min com ≥ 70% na faixa; esforço ≤ 3/10 e "combina comigo" ≥ 7/10 por 2 semanas |
| — | Manutenção | contínua | Aquecimento curto + 1 habilidade + fala | Regravação mensal; bloco de reforço se o tom médio cair ≥ 2 st do melhor em 2 check-ins |

- Desde a etapa 2, todo treino tem um exercício de fala com a habilidade da etapa; a partir da 3, o tempo de fala cresce.
- Ressonância antes de subir o tom: as pesquisas não acharam diferença de resultado na ordem, e começar pela ressonância reduz o risco de forçar a voz para subir.

**Etapas — voz mais masculina:**

| # | Etapa | Exercícios | Observação |
|---|---|---|---|
| 1 | Fundamentos | W1–W3, B1–B3, P1, M7 (com testosterona) | |
| 2 | Ressonância mais escura | M1, M2, R1 (cachorrão), R6 (para baixo), M3 | |
| 3 | Tom | M4, P3 (para baixo), P5 | Com testosterona: M4 todo mês para achar o novo grave; a faixa acompanha |
| 4 | Peso e projeção | Q1 (mais cheia, sem apertar), B4 | |
| 5 | Entonação | M5, I2, I4 | |
| 6 | Integração | S1–S6 | |
| — | Manutenção | | |

**Etapas — voz neutra/andrógina:** Fundamentos → Ressonância flexível (R3, R1, R6) → Tom na zona 145–175 Hz (P3, P4, P5) → Peso (Q1) → Entonação (I1–I4) → Integração e **trocar de voz** quando quiser (R3, Q1, série I) → Manutenção.

**Etapas — cuidar da voz:** Fundamentos e respiração (série W, B1–B4) → Função vocal (P2, 6 semanas, 2×/dia) → Ressonância saudável (R8, Q2) → Projeção (B4, Q3) → Manutenção.

Os marcos dos outros objetivos seguem o mesmo padrão da tabela feminina (na direção do objetivo) e ficam definidos em `src/guide/`, com testes.

**Prazo estimado** (texto do plano, sempre em faixa):
- **Voz mais feminina:** mudança perceptível nos exercícios em semanas a ~2 meses; voz usável na conversa em ~3–6 meses; automática em ~6–12 meses ou mais. Varia muito de pessoa para pessoa e, sem manutenção, parte do ganho pode voltar.
- **Voz mais masculina com testosterona:** a maior parte da mudança de tom vem nos primeiros 6–9 meses; o treino cuida da ressonância, das quebras e da entonação. Sem testosterona: mudança menor de tom, e ressonância e entonação pesam mais.
- **Neutra e saúde:** sem prazos nas pesquisas; o plano mostra só as etapas.

### 9.3 Progressão

As pesquisas não comparam rodízios de exercícios; esta é uma proposta baseada em princípios de aprendizagem motora (prática distribuída e variada, retorno que diminui aos poucos):

- **Avança por marcos, não pelo calendário.** Os marcos são conferidos no check-in semanal. Mínimo de 1 semana em Fundamentos e 2 semanas nas outras etapas.
- **Rodízio semanal dentro da etapa.** Cada habilidade tem 2–3 exercícios equivalentes (`skill`, 8.1); a cada semana o plano troca qual aparece (ex.: semana 1 "cachorrão/cachorrinho", semana 2 "vogais com sorriso"). O exercício de medição da etapa (ex.: R6) fica fixo, para dar para comparar.
- **Retorno visual diminui:** completo na 1ª semana de cada etapa → parcial → só resumo nos exercícios de fala.
- **Regravação completa todo mês** (igual à inicial) e "antes × depois".
- **Travou:** sem progresso nos marcos em 3–4 semanas → o plano sugere trocar as variações, pergunta sobre esforço e recomenda conversar com uma fono.
- **Semana mais leve** quando houver desconforto (seção 14).
- **Voltar uma etapa** é sempre possível (Plano › Editar).

### 9.4 Check-in semanal

- Uma vez por semana (dia configurável), ~4 min, tela cheia:
  1. mesma leitura padrão da gravação inicial + 30 s de fala livre + /i/ sustentado;
  2. perguntas (0–10): esforço para manter a voz, quanto a voz combina comigo, conforto; e sintomas da semana (rouquidão, dor, aperto, pigarro);
  3. resultado: métricas comparadas com o início e com a semana anterior, marcos da etapa cumpridos ou não;
  4. decisão sugerida: **Avançar de etapa** · **Continuar nesta etapa** · **Semana mais leve** (se houve desconforto). Eu confirmo.
- Uma vez por mês, o check-in vira uma **regravação completa** (igual à gravação inicial, ~3 min) e sugere ouvir o **antes × depois**.

### 9.5 Mudar o plano

- Trocar, adicionar ou remover exercícios de uma etapa; mudar minutos por dia; voltar uma etapa.
- Usar uma rotina minha no lugar do plano (8.6).
- "Ajustar com IA" (Fase 5): escrevo o que quero ("quero focar em falar ao telefone") e a IA sugere mudanças usando **só exercícios do catálogo**; vejo a lista de mudanças e aceito ou não.

---

## 10. Telas em detalhe

Toda tela tem estados de **carregando** (skeleton), **vazio**, **erro** (com "Tentar de novo") e, quando usar IA, **sem conexão**.

### 10.1 Hoje

```
Boa tarde                              ⚙
seg, 26 out

┌ Treino de hoje · Etapa 2: Ressonância ┐
│ ○ Aquecimento: canudo        ~3 min   │
│ ○ Cachorro grande, pequeno   ~4 min   │
│ ○ /i/ com ressonância clara  ~4 min   │
│ ○ Leitura curta              ~3 min   │
│ ○ Desaquecimento             ~1 min   │
│                                       │
│ [          Começar           ]        │
│        Só tenho 5 minutos             │
└───────────────────────────────────────┘

┌ Sua semana ───────────────────────────┐
│ S  T  Q  Q  S  S  D     52 min        │
│ ●  ●  ○  ●  ·  ·  ·                   │
└───────────────────────────────────────┘

┌ Check-in semanal · domingo ───────────┐
```

- "Começar" abre o Treino do dia (sequência de players) e volta para Hoje no fim, com resumo (minutos, exercícios, marcos).
- Antes do primeiro exercício: **"Como está sua voz hoje?"** Bem · Cansada · Rouca ou doente. "Cansada" → treino mais leve. "Rouca ou doente" → sem treino: só orientações de descanso e hidratação (seção 14).
- Treino em 2 blocos (9.1): o cartão mostra "Bloco 1" e "Bloco 2", com o horário sugerido de cada um.
- "Só tenho 5 minutos": aquecimento curto + 1 exercício principal + desaquecimento. Conta como dia ativo.
- Desconforto **forte** no último treino: o cartão vira "Pegue leve hoje" com treino só de aquecimento/relaxamento (seção 14).
- Primeiro uso: guia de 3 passos: "Responder o Guia", "Fazer a gravação inicial", "Primeiro treino".

### 10.2 Medidor (botão central)

- Tela cheia: PitchReadout no topo, PitchTrace grande no meio, e embaixo: **Gravar**, **Ouvir tom**, **Faixa-alvo**, **Pausar**.
- Um controle **Tom | Ressonância** escolhe o que aparece em destaque. Mostrar os dois ao mesmo tempo confunde (foi o que um estudo de um app parecido observou). No player, aparece só o que o exercício mede.
- Estados: "Ouvindo…", "Silêncio", "Muito baixo, chegue mais perto do celular", microfone negado.
- Gravação feita aqui vai para Gravações com o tipo "livre".

### 10.3 Exercícios (catálogo)

- Busca + filtros: categoria, objetivo, nível, "No meu plano".
- Item: ícone da categoria, nome, duração, nível, selo "No seu plano".
- Detalhe: o que é e para que serve, passos, o que o app mede, erros comuns, cuidados, variações, e os botões **Fazer agora**, **Explicar com IA** (10.5) e **Adicionar a uma rotina**.
- No topo da aba: "Minhas rotinas" (8.6).

### 10.4 Treino do dia e Player

- Treino do dia: sequência de players (8.5) com barra de progresso no topo; deslizar ou "Próximo"/"Anterior" (seção 6).
- Pular um exercício é permitido (fica registrado como pulado).

### 10.5 Simulação com IA ("Explicar com IA")

A IA "simula" o exercício em texto, como se uma fono me guiasse passo a passo (sem falar):
- **Visão geral** em 2 frases: o que é e por que ajuda no meu objetivo.
- **Passo a passo com tempo**: para cada passo, o que fazer, **o que eu devo sentir** (ex.: "vibração no nariz e nos lábios"), **como deve soar** (descrição) e **como saber que está certo**.
- **Analogia** simples (ex.: "como bocejar ao contrário").
- **Erros comuns e como corrigir**.
- **Curva do exercício** (quando for de tom): a IA devolve pontos `{t, hz}` dentro da minha faixa; o app desenha a curva e o botão **"Ouvir a curva"** toca o tom de referência que o app gera (7.6). Assim dá para *ver e ouvir* como seria, sem a IA falar.
- Campo "Ainda não entendi…" para mandar uma dúvida (ex.: "não sinto a vibração no rosto"): a IA responde ajustando a explicação.
- Botão principal: **Fazer agora** (abre o player já com a curva da simulação, se houver).
- Resultado guardado em cache (mesmo exercício + mesmo nível + mesma faixa + mesma dúvida = sem nova chamada).

### 10.6 Plano

- Etapa atual com marcos (checklist com os valores medidos, ex.: "Leitura com 70% na faixa: 58% → falta pouco").
- Linha do tempo das etapas e prazo estimado.
- Faixa-alvo atual e meta final.
- Botões: **Editar plano**, **Refazer o Guia**, **Ajustar com IA** (Fase 5).

### 10.7 Progresso

- Números: minutos na semana, dias ativos no mês, tom médio na fala (último check-in), % na faixa.
- Gráfico do **tom médio por check-in** com a faixa-alvo ao fundo.
- Tendência da **ressonância estimada** (relativa ao início).
- **Gravações:** lista com filtros (inicial, check-ins, exercícios, livres); seleção de 2 → **Comparar** (antes × depois lado a lado, com métricas e traçados).
- **Gasto de IA** do mês.

### 10.8 Gravação (detalhe)

- Player com o traçado do tom andando junto, métricas (7.4), anotação minha, "Compartilhar" (arquivo WAV, Fase 6), "Excluir".
- **"Perguntar à IA sobre esta gravação"** (Fase 5): manda **só as métricas**, nunca o áudio.

### 10.9 Perguntar à IA (Coach)

- Chat de texto sobre voz, com o contexto do meu plano e das métricas recentes (12.3).
- Quando sugerir exercícios, eles aparecem como cartões tocáveis do catálogo.

### 10.10 Configurações

1. **Notificações** → Central (seção 11)
2. **IA**: igual ao Meu Inglês (provedor, URL, chave, modelo, "Testar conexão", preços, limite mensal), mais o aviso "O áudio nunca é enviado para a IA".
3. **Sobre mim**: respostas do Guia (objetivo, forma de tratamento, contexto, saúde) e "Incluir meu contexto nas perguntas à IA".
4. **Treino**: faixa-alvo manual, limite diário de minutos, aquecimento obrigatório (ligado), notação das notas (Sol 3 / G3), vibração ao entrar na faixa, timbre do tom de referência.
5. **Gestos**: vibração, "Ver guias de novo".
6. **Aparência**: tema, tamanho do texto de leitura.
7. **Dados**: exportar/importar backup, apagar tudo (confirmação digitando "APAGAR").

---

## 11. Central de Notificações

A mesma Central do Meu Inglês (mestre, pausar, horário silencioso, máximo por dia, prioridade por arraste, detalhe com prévia e "Enviar teste agora", histórico, um canal por tipo), com estes tipos:

| Tipo | Padrão | Configurações | Texto de exemplo | Ações | Abre |
|---|---|---|---|---|---|
| Treino do dia | Ligado, 19:00, todos os dias | Horário, dias | "Seu treino de hoje: 15 min, etapa Ressonância." | Treinar agora · Mais tarde (+1 h) | `session` |
| Check-in semanal | Ligado, domingo 10:00 | Dia e horário | "Hora do check-in: 4 minutos para ver sua evolução." | Fazer agora | `checkin` |
| Use a voz hoje | **Desligado** | Janela, 1–3 por dia | "Na próxima conversa, experimente a voz que você treina." | Abrir medidor | `meter` |
| Pausa para a voz | **Desligado** | Janela | "Beba água e dê um descanso para a voz." | — | — |
| Retorno gentil | Ligado | Após N dias (3), máx. 1 por semana | "Sem pressa. Um treino de 5 minutos para voltar?" | Começar | `session?minimal=1` |

- **Texto discreto** (ligado por padrão): as notificações não citam "voz feminina/masculina" nem o objetivo; usam textos neutros como "Hora do treino".
- Tipos já concluídos no dia não são enviados (fiz o treino às 18h → o lembrete das 19h é cancelado).
- Regras do agendador iguais às do Meu Inglês (`rescheduleAll()` para 7 dias, pausa, silêncio, limite por prioridade, permissão com tela de explicação, deep links, histórico).

---

## 12. Camada de IA

### 12.1 Provedores e cliente

Iguais ao Meu Inglês (qualquer API compatível com OpenAI; Gemini, OpenRouter, Groq, OpenAI, Ollama, personalizado), com tudo o que já foi resolvido lá: chave só no SecureStore, JSON validado por zod, novas tentativas, `reasoning_effort` baixo para Google/OpenAI, troca de `max_tokens`/`temperature` quando o modelo recusar, tempo limite de 45 s, registro em `ai_usage`, cache, erros em PT.

### 12.2 O que a IA nunca recebe

- **Áudio.** Nunca. Só números (métricas) e texto.
- Contexto de identidade (item 3 do Guia) e hormônios, a menos que eu ligue "Incluir meu contexto nas perguntas à IA".

### 12.3 Contexto do usuário

Todo prompt de sistema inclui: objetivo, etapa atual, faixa-alvo, métricas do início e do último check-in, nível de experiência, alertas de saúde (só "relatou desconforto/rouquidão", sem detalhes), forma de tratamento, e o contexto opcional do item 12.2.

### 12.4 Regras gerais dos prompts

- Português do Brasil, simples, frases curtas, sem jargão (ou com o jargão explicado: "SOVT = exercícios com a boca semi-ocluída, como o canudo").
- **Segurança acima de tudo:** nunca sugerir forçar, gritar, apertar a garganta ou treinar com dor; sempre lembrar de parar se doer e procurar fono/otorrino quando houver sinal de alerta (seção 14). Não dar diagnóstico.
- Sugestões de exercício **só com ids do catálogo** (o app valida e descarta ids desconhecidos).
- Curvas de tom (`contour`) sempre dentro da faixa segura do usuário (o app valida: 60–600 Hz, tempos crescentes, até 60 pontos, dentro da extensão medida + 2 st).
- Saída **sempre** no schema JSON da função. Prompts em `src/ai/prompts/`, schemas em `src/ai/schemas/`.

### 12.5 Funções de IA (contratos)

| Função | Entrada | Saída (JSON) | Fase |
|---|---|---|---|
| `simulateExercise` | exercício do catálogo; nível; objetivo; faixa-alvo; dúvida (opcional) | `{ overviewPt, steps: [{ titlePt, instructionPt, durationSec, feelPt, soundPt, checkPt }], analogyPt, mistakes: [{ mistakePt, fixPt }], successSignsPt: string[], contour?: { points: [{ t, hz }] }, safetyPt }` | 3 |
| `explainRecording` | métricas da gravação; início; faixa-alvo; tipo | `{ summaryPt, strengthsPt: string[], focusPt: string[], suggestedExerciseIds: string[] }` | 5 |
| `adjustPlan` | plano atual; pedido em texto | `{ explanationPt, changes: [{ action, exerciseId, replaceWithId?, stageIndex, reasonPt }] }` | 5 |
| `coachTurn` | histórico; contexto | `{ replyPt, suggestedExerciseIds: string[], safetyFlag: boolean }` | 5 |
| `weeklySummary` | estatísticas do check-in (calculadas no aparelho) | `{ summaryPt, focusNextWeekPt }` | 5 |
| `readingText` | tema/interesses; tamanho; foco (ex.: frases com perguntas para entonação) | `{ title, paragraphs: string[] }` | 5 |
| `speakingPrompts` | etapa; situações que importam para mim | `{ prompts: [{ questionPt, tipPt }] }` | 5 |

- `safetyFlag: true` → o app mostra o cartão de alerta da seção 14 junto da resposta.
- A **decisão** de avançar de etapa é sempre das regras do app (9.3); a IA só explica.

### 12.6 Custo e privacidade

- Estimativa de gasto = tokens × preço configurado; aviso em 80% e pausa da IA em 100% do limite mensal (o resto do app continua).
- Aviso fixo: "No plano gratuito de alguns provedores, seus textos podem ser usados para treinar modelos."

---

## 13. Modelo de dados

SQLite. Datas em ISO 8601 (UTC), exibidas no fuso do aparelho. Ids em texto (uuid). **O dia vira às 04:00.**
Migrations por `PRAGMA user_version`; **nunca editar uma migration antiga**. Cada fase cria só as suas tabelas.

| Tabela | Colunas principais |
|---|---|
| `settings` | `key` (pk), `value` (JSON) |
| `profile` | linha única: `goal`, `grammaticalGender`, `identity`, `hormones`, `recentSurgery`, `surgeryCleared`, `experience`, `slp` (acompanhamento com fono), `dailyMinutes`, `healthFlags` (JSON), `aiIncludeContext`, `updatedAt` |
| `baselines` | `id`, `createdAt`, `recordingIds` (JSON), `metrics` (JSON: tom médio, faixa, extensão, F1/F2 de /a/ e /i/) |
| `plans` | `id`, `goal`, `createdAt`, `active`, `stageIndex`, `stages` (JSON), `finalTargetLowHz`, `finalTargetHighHz`, `stageTargetLowHz`, `stageTargetHighHz` |
| `plan_events` | `id`, `planId`, `kind` (`advance` \| `stay` \| `lighter` \| `back` \| `edit`), `fromStage`, `toStage`, `at`, `note` |
| `routines` | `id`, `name`, `items` (JSON: `[{ exerciseId, durationSec?, reps? }]`), `origin` (`user` \| `plan` \| `ai`), `useInToday` (`never` \| `today` \| `always`), `createdAt`, `updatedAt` |
| `sessions` | `id`, `date`, `block` (1 \| 2), `origin` (`plan` \| `routine` \| `minimal` \| `single`), `routineId`, `stageIndex`, `voiceToday` (`good` \| `tired` \| `hoarse`), `startedAt`, `endedAt`, `minutes`, `feeling`, `discomfort` (0 nenhum · 1 leve · 2 forte), `stoppedForPain` |
| `exercise_results` | `id`, `sessionId`, `exerciseId`, `startedAt`, `durationSec`, `repsDone`, `skipped`, `metrics` (JSON), `rating`, `recordingId` |
| `recordings` | `id`, `kind` (`baseline` \| `checkin` \| `exercise` \| `free`), `file` (caminho relativo), `durationSec`, `createdAt`, `metrics` (JSON), `pitchTrack` (JSON compacto), `note`, `favorite`, `exerciseId`, `checkinId` |
| `checkins` | `id`, `weekStart`, `recordingIds` (JSON), `answers` (JSON), `milestones` (JSON), `decision`, `summaryPt`, `createdAt` |
| `daily_activity` | `date` (pk), `minutes`, `sessions`, `minimal` |
| `coach_conversations` | `id`, `messages` (JSON), `createdAt`, `endedAt` |
| `notification_log` | `id`, `type`, `scheduledFor`, `openedAt` |
| `ai_usage` | `id`, `at`, `feature`, `model`, `inputTokens`, `outputTokens`, `estimatedCost` |
| `ai_cache` | `hash` (pk), `feature`, `response` (JSON), `createdAt` |

Índices: `sessions(date)`, `exercise_results(sessionId)`, `recordings(kind, createdAt)`, `checkins(weekStart)`.

**Backup (Fase 6):** JSON versionado com todas as tabelas menos `ai_cache`, **sem os áudios** (que são grandes e sensíveis). Cada gravação pode ser compartilhada como WAV pelo detalhe. "Apagar tudo" apaga também a pasta `recordings/` e a chave da IA.

---

## 14. Saúde vocal e segurança

Fontes e detalhes em `docs/PESQUISA.md`. As diretrizes internacionais (WPATH SOC-8) dizem que o treino por conta própria ainda não tem evidência suficiente e recomendam acompanhamento com fono. Por isso o MVoz se apresenta como **apoio à prática**, nunca como tratamento.

### 14.1 Limites

- **Iniciante:** 10–15 min por dia, em blocos de até 10 min.
- **Depois:** até 20–30 min por dia, divididos, só se não houver cansaço.
- **Algumas horas entre blocos:** depois de um uso intenso, a voz leva de 4 a 6 h para se recuperar quase toda.
- **Sussurro (R2):** séries curtas, até 2 min (o timer para sozinho).
- **Não treinar com a voz rouca ou doente** ("Como está sua voz hoje?", 10.1).

### 14.2 Sinais para parar o treino

Aparecem no "Senti dor · parar" e no detalhe dos exercícios:
- dor, ardência ou sensação de garganta "esfolada";
- aperto na garganta, no pescoço ou na mandíbula;
- rouquidão depois do treino;
- mais quebras de voz que o normal;
- perder notas agudas ou extensão;
- falar ficou cansativo;
- vontade de pigarrear toda hora;
- tontura (nos exercícios de respiração e de ofegar).

Se os sinais durarem 2–3 dias: descansar e reduzir o treino.

### 14.3 Quando procurar ajuda

- **Otorrino:** rouquidão que não melhora em 3–4 semanas (antes disso, para quem fuma).
- **Atendimento na hora:** tossir sangue, dificuldade para engolir ou respirar, caroço no pescoço, dor forte ao falar ou engolir, perder a voz por mais de alguns dias.
- **Fono:** esforço ou cansaço que não passa, progresso travado, se estiver pensando em cirurgia de voz (o treino é recomendado antes e depois), ao começar testosterona, qualquer dor.

### 14.4 Técnicas que pedem cuidado

Cada exercício envolvido tem o aviso no detalhe e no player:

| Técnica | Risco | O que o app faz |
|---|---|---|
| Voz apertada, ataque duro, "projetar" apertando | Machucar as pregas vocais | Q2 (início suave) no plano; aviso em B4 |
| Subir o tom apertando; falar sempre muito agudo ou em falsete | Tensão muscular (muito comum em quem treina feminilização) | Teto de conforto da faixa (9.2) |
| Sussurro forçado (R2) | Tensão acima das pregas vocais | Séries curtas, `maxSec` |
| Constrição (twang exagerado, voz de "Caco") | Aperto e cansaço | Uso breve e suave (R3, R7); W4 (riso silencioso) para soltar |
| Laringe em posições extremas; empurrar a raiz da língua (M1) | Tensão, voz abafada | Posições moderadas |
| Vocal fry habitual ou ir abaixo da nota grave mais limpa | Esforço | Piso na masculinização; aviso no fim das frases |
| Soprosidade demais | Voz ineficiente, cansaço | "Leve, mas clara" (Q1) |
| Respirar rápido demais | Tontura | Parar e respirar normal (B1, R1) |
| Automassagem forte (M6) | Lesão; pressão perto da pulsação do pescoço | Toque leve, longe das laterais do pescoço |
| Rolha (A1) | Engasgar, dor na mandíbula | Rolha grande, segurar a ponta, sem morder |
| Treinos longos de uma vez | Cansaço | Blocos curtos (14.1) |

### 14.5 Cuidados com a voz (dicas no app)

Beber água ao longo do dia; evitar ambiente muito seco; evitar fumo, excesso de álcool e de café, pigarrear, gritar e sussurrar.

### 14.6 Regras do app

- **Aviso no Guia e em Configurações:** o MVoz ajuda a praticar, mas não substitui fonoaudiólogo(a) ou otorrino e não faz diagnóstico.
- **Aquecimento obrigatório** antes de exercícios de tom e ressonância no treino do plano (nas rotinas, só aviso).
- **Limite diário** de minutos (14.1); ao passar, o app sugere parar (não bloqueia).
- **"Senti dor · parar"** em todo player: encerra o treino, registra `stoppedForPain` e mostra 14.2 e 14.3.
- **Desconforto forte** no fim do treino → no dia seguinte, treino leve.
- **Sinal de alerta** → cartão em Hoje (não bloqueia o app):
  - dor relatada em 3 treinos seguidos → recomendar fono;
  - rouquidão marcada em check-ins por 3 semanas seguidas → recomendar otorrino.
- **Cirurgia recente:** plano bloqueado até eu confirmar a liberação médica; antes disso, só leitura dos exercícios.
- **O que o app não mede** (e por isso pede autoavaliação): esforço e tensão, doenças, e se a voz "passa" como feminina/masculina.

---

## 15. Qualidade, acessibilidade e estados

- **Estados obrigatórios** em toda tela: carregando, vazio, erro com "Tentar de novo", sem conexão (quando usar IA), microfone negado (quando usar áudio).
- **Acessibilidade:** `accessibilityLabel` e `accessibilityRole` em tudo que é tocável; o PitchReadout anuncia o estado ("Na faixa", "Abaixo") para leitores de tela no máximo a cada 2 s; escala de fonte até 130%; contraste AA; "reduzir movimento"; alvos de 48 dp; gestos sempre com alternativa.
- **Desempenho:** seção 7.8; abrir o app → Hoje pronta em menos de 1 s.
- **Textos:** todos em `src/i18n/strings.ts`.
- **Segurança e privacidade:** chave só no SecureStore; áudio nunca sai do aparelho (exceto quando eu compartilho); nunca logar textos ou métricas minhas em produção.
- **Testes:**
  - áudio: tom em senoides e vogais sintéticas (erro < 1%), filtros (silêncio, clareza, mediana contra oitava), formantes em vogais sintéticas com F1/F2 conhecidos, métricas, WAV (escrever → ler), notas musicais, geração do tom de referência;
  - catálogo: schema zod, ids únicos, variações e pré-requisitos existentes;
  - guia: plano gerado para cada objetivo, faixa por etapa (incluindo o teto de conforto), marcos, rodízio semanal, retorno visual, decisões do check-in, regras de segurança;
  - IA: parsing/validação de todas as funções, validação da curva e dos ids sugeridos;
  - agendador de notificações (silêncio, pausa, limite, prioridade, texto discreto).
- Antes de considerar qualquer passo pronto: `npx tsc --noEmit`, `npx expo lint` e `npm test` passando.

---

## 16. Fases de construção e critérios de pronto

Cada fase termina com um **roteiro de teste no celular** e um commit.

### Fase 1 — Fundação
**Entregas**
- Projeto Expo SDK 58 limpo, com os módulos nativos da seção 2 instalados e o **development build** gerado.
- Copiar e adaptar do Meu Inglês (3.1): tema com as cores novas (4.1), componentes base, banco com migrations (`settings`, `ai_usage`, `ai_cache`; a `profile` entra na Fase 4, com o Guia), cliente de IA.
- Tab bar (5.1); abas com EmptyState. O botão central entra na Fase 2, junto com o Medidor (nunca mostrar botão de função que ainda não existe).
- Configurações: IA (com "Testar conexão"), Aparência.
- Jest configurado, primeiros testes.

**Pronto quando:** instalo o development build, navego pelas 4 abas, alterno tema, salvo minha chave, toco em "Testar conexão" e vejo "Conectado: modelo X"; fecho e reabro e tudo continua salvo.

### Fase 2 — Medidor de voz
**Entregas**
- Motor de áudio completo (seção 7): captura, tom, ressonância estimada, métricas, gravação WAV, reprodução com traçado, tom de referência.
- Medidor (10.2) com PitchReadout, PitchTrace, ResonanceGauge e faixa-alvo ajustável; botão central da tab bar.
- Gravações: lista simples e detalhe (10.8, sem IA).
- Testes do motor de áudio com sinais sintéticos.

**Pronto quando:** falo e vejo o Hz mudar ao vivo; canto uma nota junto com um afinador de outro celular e os valores batem (±2 Hz); toco o tom de 200 Hz pelo app e depois imito; gravo 30 s, ouço com o traçado andando e vejo as métricas; ao sair da tela o microfone desliga.

### Fase 3 — Exercícios e simulação com IA
**Entregas**
- Catálogo completo (8.4, conteúdo de `docs/EXERCICIOS.md`) com detalhe, busca e filtros.
- Player (8.5) com todos os tipos de medição (8.3), critérios de acerto, "Senti dor", tela acesa, "Como foi?".
- Minhas rotinas (8.6): montar, reordenar, avisos.
- "Explicar com IA" (10.5): `simulateExercise` com curva e "Ouvir a curva".
- Sessões e resultados salvos (`sessions`, `exercise_results`).

**Pronto quando:** monto uma rotina de 3 exercícios, faço do começo ao fim, o app marca as repetições sozinho, peço a simulação de um exercício de entonação, vejo e ouço a curva, e faço o exercício seguindo-a.

### Fase 4 — Guia, plano e Hoje
**Entregas**
- Guia (9.1) com gravação inicial; plano gerado por regras (9.2); tela Plano (10.6).
- Hoje (10.1) com o treino do dia, "Só tenho 5 minutos", "Pegue leve hoje" e o guia de primeiro uso.
- Check-in semanal (9.4) com marcos e decisão; progressão (9.3).
- Regras de segurança da seção 14.

**Pronto quando:** respondo o Guia, faço a gravação inicial, vejo um plano com etapas, faixa-alvo e prazo; faço o treino do dia por Hoje; marco desconforto forte e no dia seguinte o treino vem leve; faço um check-in e vejo a comparação com o início.

### Fase 5 — IA completa
**Entregas**
- `explainRecording`, `adjustPlan`, `coachTurn`, `weeklySummary`, `readingText`, `speakingPrompts`.
- "Perguntar à IA sobre esta gravação", "Ajustar com IA" no Plano, Perguntar à IA (Coach), resumo no check-in, textos novos de leitura nos exercícios de fala, perguntas variadas na Conversa treinada (S4).

**Pronto quando:** peço à IA para ajustar o plano para "falar ao telefone", vejo as mudanças sugeridas (só exercícios do catálogo) e aceito; pergunto sobre uma gravação e recebo explicação e exercícios tocáveis; nenhuma chamada envia áudio.

### Fase 6 — Progresso, notificações e dados
**Entregas**
- Progresso completo (10.7) com gráficos, comparar antes × depois e gasto de IA.
- Central de Notificações (seção 11) com texto discreto.
- Backup/restauração, compartilhar gravação, apagar tudo.

**Pronto quando:** vejo meu tom médio por check-in no gráfico, comparo a gravação inicial com a última, recebo o lembrete do treino e caio no Treino do dia, exporto um backup, apago tudo, importo e tudo volta (menos os áudios, como esperado).

---

## 17. Fora do escopo

Login, sincronização em nuvem, vários usuários, publicação na Play Store, anúncios, rankings, iOS (por enquanto), **IA ouvindo o áudio** (privacidade e custo; pode virar uma fase futura se eu pedir), **IA falando** (voz sintética), diagnóstico médico, nota de "passabilidade" ou de quão feminina/masculina a voz soa.
