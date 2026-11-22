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
npm test              # Vitest: reducer de estado e matemática dos motores
npm run format:check  # Prettier
npm run build         # export estático em out/
```

O workflow `.github/workflows/ci.yml` roda todas essas etapas em cada pull request e em pushes na `main`.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**, exportado como site estático (todas as rotas, inclusive os artigos da Comunidade, são pré-renderizadas).
- **Tailwind CSS 4** + classes do design system Liquid Glass em `src/app/globals.css` (`lg-bar`, `lg-panel`, `lg-sheet`, `lg-pill`, `lg-active-lens`, `lg-sheen`).
- **Órbita**: motor próprio em TypeScript (`src/lib/engines/orbitHoneycomb.ts`) que posiciona as bolhas em anéis hexagonais, com efeito fisheye, inércia e limite elástico. O React renderiza o markup e o motor só atualiza `transform`/`opacity`.
- **Parque 2D**: motor Canvas 2D em TypeScript (`src/lib/engines/park2d.ts`) com colisão deslizante, câmera suave, clique/arraste, WASD/setas, D-Pad, 7 bots com falas e o easter egg do gato Paçoca. Card do bot, chat e D-Pad são componentes React.
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
    engines/            motores da Órbita e do Parque 2D
    state/              reducer, provider e contexto de dispositivo
```

## Próximos passos (dependem de decisões de produto)

As conversas de produto indicam **Supabase** (Auth, Postgres e Realtime Presence) para login, perfis, artigos/comentários e presença em tempo real no Parque, e **Phaser + Tiled** para salas 2D mais ricas. Nada disso foi ligado ainda: precisa de credenciais e de decisões sobre autenticação, LGPD/dados sensíveis, moderação e verificação de idade.
