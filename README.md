# Orbit

Hub social LGBTQIA+ em estética **Liquid Glass**: um cartão de perfil que centraliza seus selos de outros apps, uma **Órbita** radial (estilo Apple Watch) com quem está por perto, um **Parque 2D** em pixel art para conversar por proximidade (estilo WorkAdventure) e uma área pública de **Comunidade & Saúde** (vacinas, PrEP/PEP, saúde mental, debates).

Esta é a primeira versão real do app, portada do protótipo HTML interativo. Roda como **web app responsivo / PWA** no celular e no computador. Todos os dados ainda são **simulados** ("Modo Explorar"); não há backend, login nem dados pessoais reais.

## Rotas

| Rota                    | O que é                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                     | O app. Layout de celular em telas estreitas (< 900px), layout de computador em telas largas.                                                                                 |
| `/studio`               | Estúdio de apresentação: o mesmo app dentro de molduras de **Computador**, **Celular 9:16** e **Relógio (Apple Watch 45mm)**, com estado sincronizado entre os dispositivos. |
| `/comunidade`           | Lista pública de artigos (pré-renderizada, indexável, sem login).                                                                                                            |
| `/comunidade/[id]`      | Artigo público com comentários.                                                                                                                                              |
| `/manifest.webmanifest` | Manifesto PWA (instalável na tela inicial).                                                                                                                                  |

## Rodando localmente

Requisitos: Node.js 22 (veja `.nvmrc`) e npm.

```bash
npm install
npm run dev        # http://localhost:3000/orbit/
```

Produção local (o build é um export estático em `out/`, servido sob `/orbit/` como no GitHub Pages):

```bash
npm run build
mkdir -p /tmp/orbit-site && ln -sfn "$PWD/out" /tmp/orbit-site/orbit
python3 -m http.server 8080 --directory /tmp/orbit-site   # http://localhost:8080/orbit/
```

## Deploy (GitHub Pages)

O app é publicado em <https://coletivo-inspira.github.io/orbit/> pelo workflow `.github/workflows/pages.yml` a cada push na `main` (ou manualmente em _Actions → Deploy GitHub Pages → Run workflow_). O `next.config.ts` usa `output: "export"`, `basePath: "/orbit"`, `trailingSlash: true` e imagens sem otimização; o manifesto PWA usa o mesmo prefixo. Para publicar na raiz de um domínio, faça o build com `PAGES_BASE_PATH=""`.

## Verificações

```bash
npm run lint          # ESLint (next/core-web-vitals + TypeScript), sem warnings
npm run typecheck     # gera os tipos de rota do Next e roda tsc
npm test              # Vitest: reducer, motores, geração das salas do OSM e colisão das salas
npm run format:check  # Prettier
npm run build         # export estático em out/
```

O workflow `.github/workflows/ci.yml` roda todas essas etapas em cada pull request e em pushes na `main`.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, exportado como site estático (todas as rotas, inclusive os artigos da Comunidade, são pré-renderizadas).
- **Tailwind CSS 4** + tokens do brandbook (`docs/design/brandbook.html`) em `src/app/globals.css`: tinta `#1C2631`, noite `#27323D`, marfim `#F5F0E7`, areia `#DEC9A8`, cobre `#A87356`, sálvia `#D9E4D6`, mais o token de foco `--foco`. O vidro (`lg-bar`, `lg-header`: 88% de opacidade + `blur(12px)`, fallback sólido `#27323D`) fica só em barras de navegação e ações flutuantes; leitura e edição usam superfícies opacas (`lg-panel`, `lg-sheet`). Com `prefers-reduced-transparency` o vidro vira sólido; com `prefers-reduced-motion` animações, inércia da Órbita e reflexo do ponteiro (`lg-sheen`) são desligados.
- **Tipografia**: Bricolage Grotesque (SIL OFL, `src/app/fonts/`) em títulos e na assinatura; fonte do sistema no texto corrido. Ícones (`src/app/icon.svg`, `apple-icon.png`, `public/icons/`) usam o símbolo oficial `docs/design/orbit-marca.svg`.
- **Acessibilidade compartilhada** (`src/lib/a11y/`): `useDialogFocus` (foco entra no diálogo, circula, fundo inerte, Esc devolve ao acionador ou ao `data-focus-fallback` da tela), `rovingIndex` (abas por setas) e `useReducedMotion`. Links públicos saem de `src/lib/publicUrl.ts`, que respeita o `basePath`.
- **Órbita**: motor próprio em TypeScript (`src/lib/engines/orbitHoneycomb.ts`) que posiciona as bolhas em anéis hexagonais, com efeito fisheye, inércia e limite elástico. O React renderiza o markup e o motor só atualiza `transform`/`opacity`. Por baixo, um mapa de ruas estilizado (`engines/radarMap.ts`) acompanha o arraste em paralaxe; ele é decorativo e não indica posição real.
- **Conexões**: aba da Órbita no estilo do grafo do Obsidian. `src/lib/engines/interestGraph.ts` monta o grafo (você, as pessoas filtradas e os interesses que pelo menos duas pessoas têm) e roda um layout de forças determinístico; `engines/graphView.ts` cuida de arrastar, zoom (roda, pinça e botões) e arrastar nós. As linhas têm três origens, que podem ser ligadas e desligadas: assuntos do perfil (linha contínua), Discussões da Comunidade (tracejada) e gêneros musicais do Spotify (verde). Veja [Conversas e conexões](#conversas-e-conexões).
- **Parque 2D**: motor Canvas 2D em TypeScript (`src/lib/engines/park2d.ts`) com colisão deslizante, câmera suave, clique/arraste, WASD/setas (só com o mapa em foco), D-Pad (ponteiro, Espaço ou Enter), 7 bots com falas e o easter egg do gato Paçoca. A lista "Pessoas" expõe quem está por perto com ações de conversar e ver perfil, sem depender do canvas.
- **Parque pelo mundo**: o Parque abre num mapa-múndi pontilhado (`src/components/parque/WorldMapPicker.tsx`) com o Parque Central e salas em cidades reais. Cada sala de cidade é uma miniatura "de massinha" das ruas de verdade, desenhada pela cena `src/lib/engines/scenes/clayCity.ts` sobre o mesmo motor do Parque Central (que virou a cena `scenes/centralPark.ts`). Veja [Parque pelo mundo](#parque-pelo-mundo).
- **Estado**: um único reducer (`src/lib/state/reducer.ts`) compartilhado por todos os layouts; o Perfil Hub fica salvo no `localStorage` até existir backend.

## Estrutura

```
src/
  app/                  rotas (/, /studio, /comunidade, manifest, ícone)
  components/
    app/                layouts Desktop / Mobile / Watch e navegação
    screens/            Órbita, Parque, Comunidade, Perfil Hub, Relógio
    modals/             folhas de perfil e leitor de artigo
    orbita/ perfil/     componentes de cada módulo
    studio/             estúdio multi-dispositivo e molduras
    public/             layout das páginas públicas
    ui/                 avatar, selos de apps, toasts, switch, logo
  lib/
    data/               intenções, apps, perfis simulados, artigos, mapa do parque
    data/park-rooms/    mapas gerados das salas do Parque (um JSON por cidade)
    engines/            motores da Órbita e do Parque 2D (cenas em engines/scenes/)
    world/              conversão OpenStreetMap → mapa de sala (osmRoom.ts)
    state/              reducer, provider e contexto de dispositivo
```

## Parque pelo mundo

O mapa-múndi (`src/lib/data/worldLand.json`) é a terra do Natural Earth 1:110m (domínio público) rasterizada em pontos por `node scripts/build-world-map.mts`. No celular, tocar num pino ou numa linha da lista mostra a sala; "Entrar na sala" carrega o mapa dela sob demanda. A lista de salas é a forma acessível de escolher (o SVG é só atalho de ponteiro), e a sala atual aparece também na página do Parque no Relógio.

**Como as salas são geradas.** `scripts/build-park-rooms.mts` consulta a API pública Overpass num quadrado de `radiusM` (100 m) em volta do `center` de cada sala e passa a resposta por `buildRoomMap` (`src/lib/world/osmRoom.ts`): projeta para metros (x leste, y sul), monta multipolígonos, recorta polígonos e linhas no quadrado, simplifica as formas e classifica áreas (água, parque, mata, rocha, praça...), ruas, prédios (altura por `height`/`building:levels`), árvores, teleféricos e até 24 pontos de interesse com nome. O elemento `landmark.osmId` sai dos prédios comuns e vira o marco desenhado à mão (Torre Eiffel em miniatura, vão do MASP, Pão de Açúcar, arco neon de Ni-chōme, bandeira do arco-íris). O resultado fica versionado em `src/lib/data/park-rooms/*.json`, então o app não chama o OSM em tempo de execução. Os marcos são estilizados e fora de escala (a torre real teria 330 m), e o mar em volta do Pão de Açúcar é desenhado pela cena, porque o recorte do OSM ali é só rocha e mata. Na tela, 1 m = 8 px; chão e prédios são pintados uma vez em sprites fora da tela e reaproveitados.

**Como adicionar uma sala.**

1. Acrescente a sala em `CITY_ROOMS` (`src/lib/data/parkRooms.ts`): `id`, nome, cidade, bandeira, `center`, `radiusM`, `landmark` (tipo, `osmId` opcional e a curiosidade mostrada ao tocar), falas dos bots e `botCount`. Se o ponto de chegada padrão (na frente do marco) não servir, defina `spawn` em metros.
2. Registre o JSON em `LOADERS` (`src/lib/data/park-rooms/index.ts`) para que ele vire um chunk carregado só ao entrar na sala.
3. Gere o mapa com `node scripts/build-park-rooms.mts <id>` (sem argumento, regenera todas). O Overpass é público e às vezes lento: o script tenta outros servidores se um falhar.
4. Opcional: uma paleta própria em `PALETTES` (`scenes/clayCity.ts`); sem ela a sala usa a paleta padrão. Rode `npm test`: os testes conferem que toda sala tem mapa, que o jogador nasce em chão livre e que os bots andam sem atravessar prédios.

**Atribuição e licença.** Os dados de ruas, prédios e pontos de interesse são do © [OpenStreetMap](https://www.openstreetmap.org/copyright) e seus colaboradores, sob a licença ODbL. Por isso cada sala mostra "Mapa © OpenStreetMap" com link para a página de copyright, e os JSONs gerados são uma base de dados derivada que continua sob ODbL.

**Por que não Google Maps.** Os termos do Google Maps Platform proíbem extrair ou guardar dados do mapa para usar fora dos mapas do Google, e é justamente isso que as salas fazem (redesenhar as ruas num jogo próprio). Além disso exigiriam chave de API e cobrança. O OSM permite esse uso desde que haja atribuição.

## Conversas e conexões

**Mini chat efêmero.** Quem já conversou com você ganha um balão de quadrinho ao lado da bolinha, no radar e no grafo. Tocar nele abre o mini chat (`src/components/orbita/MiniChat.tsx`): as duas fotos crescem lado a lado a partir da bolinha, cada uma com só a **última fala** daquele lado. Quando a pessoa ainda não respondeu, o balão dela fica vazio (tracejado). Responder troca o seu balão. Falar com alguém no Parque também alimenta esses balões.

**O que fica guardado.** O estado visível (`src/lib/conversas.ts`) guarda no máximo uma fala de cada lado e não vai para o `localStorage`. Toda fala também passa por um `ConversationArchive` (`src/lib/seguranca/conversationArchive.ts`), o registro completo usado em denúncias ou ordens judiciais. No Modo Explorar não há servidor: o registro é cifrado com AES-GCM (chave de 256 bits, não exportável, gerada por sessão) e fica só na memória da aba. O texto mostrado ao usuário fala em "registro criptografado com acesso restrito" e diz explicitamente que **não é ponta a ponta**, porque o Orbit precisa conseguir abrir o registro nesses casos.

**Backend previsto (ainda não implementado).**

- Tabela `messages` no Supabase com o texto numa coluna criptografada (Vault/pgsodium ou chave em KMS), nunca em texto puro.
- RLS: o usuário não lê a tabela; lê só uma view com a última fala de cada lado por conversa.
- Abertura do registro só pelo papel de moderação, ao apurar uma denúncia de alguém da conversa ou por ordem judicial, com log de auditoria de cada acesso.
- Prazo de retenção a decidir na política de privacidade (sugestão: 6 meses), com apagamento automático depois disso. O Marco Civil obriga a guardar registros de acesso por 6 meses, não o conteúdo, então guardar o conteúdo precisa de base legal própria na LGPD.

**De onde vêm as linhas do grafo.**

- **Perfil**: os assuntos que a pessoa marcou.
- **Comunidade**: assuntos das threads em que a pessoa postou ou comentou, **só na categoria Discussões** (`INTEREST_CATEGORIES` em `src/lib/community.ts`). Vacinas, Prevenção e Saúde Mental nunca viram ligação: comentar num post sobre PrEP não pode virar uma tag pública (dado sensível de saúde).
- **Spotify**: gêneros musicais de quem tem o selo do Spotify ativo (`src/lib/data/music.ts`, simulados). A integração real leria os artistas mais ouvidos (escopo `user-top-read`) no servidor e guardaria só os gêneros; antes disso, confira os limites atuais da API do Spotify para apps novos (o modo de desenvolvimento limita o número de usuários).

## Órbita com 1000+ perfis

- **Perfis.** Os 48 perfis curados (`SIMULATED_PROFILES`, com retratos de IA em `public/profiles/`) ficam perto do centro (até 4,2 km). Mais 1200 perfis (`g1`…`g1200`) são gerados de forma determinística em `src/lib/data/generatedProfiles.ts` (PRNG `mulberry32` com semente fixa), a partir de 4,5 km. Eles não têm foto: usam só o avatar ilustrado gerado, sem rosto real nem imagem de IA nova. Por isso os filtros **Tem fotos**, **Rosto** e **Álbum** retornam só os 48. `ORBIT_PROFILES` e `profileById` (`src/lib/data/profiles.ts`) juntam as duas listas; Interesse e Parque continuam com os 48 curados.
- **Radar.** Só as bolhas perto da área visível são montadas (`cullIndices`/`viewFor` em `engines/orbitHoneycomb.ts`, janela presa a uma grade de 160 px para não renderizar a cada quadro). Com 200+ perfis aparece uma **fronteira** circular tracejada: o arraste não passa dela (com efeito elástico), mas as pessoas além continuam visíveis, esmaecidas. O mapa de fundo é um ladrilho SVG contínuo de 1200 px (`engines/radarMap.ts`) aplicado como `background-image`, então nunca acaba.
- **Lista.** Os cartões entram em lotes de 48 conforme a rolagem (`useProgressiveCount`, com um botão "Mostrar mais" visível) e os itens fora da tela usam `content-visibility: auto`.
- **Conexões.** O grafo mostra as 150 pessoas mais próximas no filtro atual, até 450 com "Mostrar mais". As linhas são desenhadas num `<canvas>` e a repulsão usa uma grade uniforme. Acima de 120 nós o layout se organiza em lotes de ~8 ms por quadro sem mover os nós (aviso "Organizando conexões…"), e só então posiciona tudo e ajusta a visão. Nesses grafos grandes, arrastar uma pessoa move só ela. Arrastar o nó "Você", que é fixo, move a visão.

## Molduras da órbita

O anel do seu avatar (centro do radar, nó "Você" nas Conexões, mini chat e cartão) pode receber uma moldura colecionável, escolhida em **Meu Hub → Molduras**. Duas vêm liberadas; as outras são ganhas com atividade no app (dar toques, marcar assuntos, achar o Paçoca, trocar falas, comentar na Comunidade, entrar numa sala do Parque pelo mundo, concluir o quiz de Desejos). Um aviso aparece quando uma moldura é desbloqueada.

- Catálogo e visual de cada moldura: `src/lib/molduras/catalogo.ts`. Metas das conquistas: `src/lib/molduras/conquistas.ts`. O desenho fica isolado em `src/components/molduras/MolduraAvatar.tsx`.
- Molduras escolhida e desbloqueadas ficam no `localStorage` (`orbit:molduras:v1`), sanitizadas como as outras chaves: só ids conhecidos, sem repetição, as iniciais sempre presentes, e a moldura em uso precisa estar desbloqueada.
- **Monetização em aberto.** `ORBIT_PLUS.modo` em `src/lib/molduras/config.ts` decide o que acontece com as molduras marcadas como Orbit+:
  - `"simulado"` (padrão): aparecem com o selo Orbit+ e um botão "Desbloquear (simulação)", sem cobrança e sem servidor.
  - `"conquista"`: tudo é grátis, e cada Orbit+ é ganha por uma conquista alternativa (colecionar outras molduras).
  - `"desligado"`: as Orbit+ somem do app.

  Numa versão paga de verdade, o direito de usar uma Orbit+ precisa ser confirmado pelo backend; o `localStorage` só serve para a demonstração.

## PWA, Modo Explorar e matriz de dispositivos

O Modo Explorar **precisa de conexão**: ainda não há service worker, então a recarga offline não funciona. O manifesto declara ícones PNG 192/512, um ícone `maskable` e o SVG; o `apple-touch-icon` tem 180 px.

O Studio (`/studio`) reduz as molduras com `transform: scale()` e mostra a escala atual: alvos de toque e gestos ficam menores que no aparelho real. Valide em aparelho antes de tirar conclusões de usabilidade. Matriz pendente de teste manual:

| Verificação                                   | Safari iOS | Chrome Android |
| --------------------------------------------- | ---------- | -------------- |
| Instalar na tela inicial e abrir em `/orbit/` | pendente   | pendente       |
| Ícone (maskable no Android, 180 px no iOS)    | pendente   | pendente       |
| Teclado virtual sobre o chat do Parque        | pendente   | pendente       |
| Orientação e área segura (notch, barra)       | pendente   | pendente       |
| Links de artigo abrem no app instalado        | pendente   | pendente       |
| Gestos: arrastar radar, D-Pad, toque no chão  | pendente   | pendente       |

## Próximos passos (dependem de decisões de produto)

As conversas de produto indicam **Supabase** (Auth, Postgres e Realtime Presence) para login, perfis, artigos/comentários e presença em tempo real no Parque, e **Phaser + Tiled** para salas 2D mais ricas. Nada disso foi ligado ainda: precisa de credenciais e de decisões sobre autenticação, LGPD/dados sensíveis, moderação e verificação de idade.
