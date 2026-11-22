# Orbit · Auditoria de front-end

**21 de novembro de 2026** · Para design, desenvolvimento e QA

O link de artigo compartilhado pelo app abre uma página 404. Quem usa teclado perde a referência ao abrir um perfil, explorar o radar ou enviar uma mensagem no Parque. Corrija primeiro esses fluxos e ajuste a promessa de compartilhamento e privacidade do Perfil Hub no Modo Explorar. Em seguida, trabalhe a descoberta da Lista, o caminho para a comunidade pública e a redução de movimento. [Aplicativo auditado](https://coletivo-inspira.github.io/orbit/) · [Deploy da rodada inicial](https://github.com/coletivo-inspira/orbit/actions/runs/44971880656) · [Brandbook](brandbook.html)

## O que preservar

- **Órbita e Lista.** O radar expressa a proposta do hub. Os cartões da Lista tornam nomes, intenções, distâncias e selos mais fáceis de comparar.
- **Prévia ao vivo no Meu Hub.** A alteração da bio simulada aparece no cartão e persistiu após a recarga. Vale preservar esse retorno imediato ao editar as configurações.
- **Conversas por proximidade no Parque.** Em 390 px, consegui me aproximar de uma pessoa simulada, avançar uma fala e fazer a ficha sumir ao me afastar.
- **Rotas públicas e estado no Studio.** O artigo abre por URL direta, sobrevive à recarga e retorna à lista. O Studio manteve a seleção da Lista ao alternar computador, celular e relógio e voltar à moldura original.

## Fila de trabalho

P1 indica bloqueio de tarefa ou promessa relevante quebrada. P2 indica dificuldade com um caminho alternativo ou risco que exige validação. P3 indica melhoria de sistema visual. Cada linha é um registro para a fila da equipe ou para transpor ao Notion. Responsáveis e prazos ficam a cargo da equipe.

| ID | Jornada | Tipo | Prioridade | Evidência | Recomendação | Aceite |
|---|---|---|---|---|---|---|
| ORB-01 | Comunidade | Bug reproduzido | P1 | URL copiada retorna 404 | Usar a URL pública com base path | Abrir o mesmo artigo em aba limpa |
| ORB-02 | Órbita | Bug reproduzido | P1 | Foco fica atrás do diálogo de perfil | Gerenciar foco em um diálogo comum | Foco entra, circula e retorna ao acionador |
| ORB-03 | Órbita | Bug reproduzido | P1 | Botões de perfil sem indicador de foco | Mostrar foco e manter alvo visível | Tab identifica o alvo em 320 e 390 px |
| ORB-04 | Meu Perfil Hub | Bug reproduzido | P1 | Ação informa sucesso e copia endereço de demonstração | Ajustar rótulos e ação ao Modo Explorar | Pessoa entende onde as mudanças ficam visíveis |
| ORB-05 | Parque | Bug reproduzido | P2 | Enter limpa a mensagem e move foco ao corpo da página | Preservar foco no chat e anunciar envio | Segunda mensagem pode ser digitada diretamente |
| ORB-06 | Órbita e Studio | Bug reproduzido | P2 | Setas sem efeito nos seletores | Aplicar a interação de abas e rádios | Setas operam os dois seletores |
| ORB-07 | Órbita | Bug reproduzido | P2 | Radar desliza após soltar em redução de movimento | Remover inércia nessa preferência | Nós param após a ação |
| ORB-08 | Órbita | Recomendação | P2 | 18 perfis anunciados e seis rótulos no radar a 390 px | Destacar a Lista e explicar distâncias | Perfil periférico é encontrável sem arrastar |
| ORB-09 | Comunidade | Recomendação | P2 | Hub sem atalho de leitura pública | Ligar feed, artigo, fontes e contexto dos comentários | Leitor encontra URL, revisão e fonte |
| ORB-10 | Parque | Recomendação | P2 | Descoberta de pessoas depende do canvas | Expor lista de proximidade e saída explícita | Conversa acessível sem interpretar o mapa |
| ORB-11 | PWA e Studio | Risco identificado no código | P2 | SVG único no manifesto e molduras reduzidas no Studio | Validar instalação e uso em aparelho | Matriz comprova lançador, ícone e gestos |
| ORB-12 | Meu Perfil Hub | Recomendação | P2 | Prévia, privacidade e editor competem no fluxo | Agrupar cartão, edição e visibilidade | Pessoa encontra efeito de um selo na prévia |
| ORB-13 | Front-end | Risco identificado no código | P2 | Provider amplo e motores com ciclos próprios | Consolidar contratos de interação e medir atualizações | Persistência e navegação passam na matriz |
| ORB-14 | Sistema visual | Recomendação | P3 | Vidro em navegação, painéis e leitura | Reservar vidro às ações e consolidar tokens | Leitura e controles legíveis com e sem efeito |

## Bugs reproduzidos

### ORB-01 · O link público do artigo retorna 404

**Reprodução.** Edge 157, 390 × 844. No hub, abra Saúde, selecione “Calendário de Vacinação Adulto no SUS” e clique em Compartilhar. O link copiado foi https://coletivo-inspira.github.io/comunidade/c1, com HTTP 404. A rota publicada sob /orbit/comunidade/c1/ retornou HTTP 200. O modal monta o endereço a partir da origem e perde o prefixo. [Código do compartilhamento](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/modals/DeviceModals.tsx#L240)

**Aceite.** Copiar os quatro artigos e abrir cada URL em aba limpa. O link deve respeitar o prefixo do GitHub Pages e funcionar também com configuração de publicação na raiz. Compartilhar a mesma função de URL pública entre o link e o comando de copiar.

### ORB-02 · O foco permanece atrás do diálogo

**Reprodução.** Chrome 157, 390 × 844 com teclado. Na Órbita, troque para Lista, foque Matheus e pressione Enter. O perfil abriu com foco no cartão de Matheus, atrás do diálogo. Tab moveu o foco a Rafa e Esc fechou a camada, mantendo o foco em Rafa. [Captura do diálogo](evidencias/foco-perfil.png) · [Implementação de Escape e diálogos](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/modals/DeviceModals.tsx#L20)

**Aceite.** Ao abrir, mover o foco ao título ou primeiro controle útil. Tab e Shift+Tab circulam na camada, o fundo fica inerte e Esc ou Fechar devolvem o foco ao acionador. Cobrir perfil e artigo, inclusive quando acionados no Parque ou no Studio. [W3C APG · Diálogo modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### ORB-03 · Foco invisível nos avatares do radar

**Reprodução.** Edge 157, 390 × 844. Navegue até “Ver perfil de Matheus” por teclado e confirme o alvo ativo. O botão recebeu foco com contorno e sombra desativados. O botão central aplica a mesma remoção de contorno. Axe também sinalizou divergência entre rótulo visível e nome acessível no radar. Por exemplo, o centro mostra “Você” e expõe “Abrir meu perfil”. [Código do radar](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/orbita/OrbitRadial.tsx#L96) · [WCAG 2.2 · Foco visível](https://www.w3.org/TR/WCAG22/#focus-visible)

**Aceite.** A cada Tab, o alvo fica inteiramente visível na área útil com contorno distinguível do anel de intenção. Percorrer radar e Lista em 320 e 390 px, abrir por Enter e retornar ao acionador. Incluir o texto visível no nome acessível.

### ORB-04 · O Perfil Hub oferece um link sem cartão acessível

**Reprodução.** Chrome 157, 390 × 844. Em Meu Hub, clique em “Copiar Link”. A ação anunciou sucesso e copiou o texto fixo orbit.app/lucassilva. O caminho de perfil correspondente no GitHub Pages retornou HTTP 404. O texto promete visibilidade pública ou para conexões aprovadas, enquanto a configuração é local à demonstração. [Ação e texto do Perfil Hub](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/screens/PerfilScreen.tsx#L58) · [Persistência do perfil](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/lib/state/OrbitProvider.tsx#L27)

**Aceite.** No Modo Explorar, rotular a visibilidade como simulação local e trocar a ação por “Ver prévia do cartão”. Quando houver uma rota pública real, verificar em outra sessão se a URL abre o cartão e se a mudança de visibilidade altera o acesso.

### ORB-05 · O chat perde o foco após envio

**Reprodução.** Chrome 157, 320 × 720. Abra Parque, foque “Mensagem no Parque”, digite e pressione Enter. O foco passou ao corpo da página e o campo limpou. Ao focar o campo, o contorno computado também estava desativado. O manipulador chama blur() após o envio. [Captura do Parque](evidencias/parque-320.png) · [Código do envio e campo](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/screens/ParqueScreen.tsx#L59)

**Aceite.** Preservar o foco após Enter, evidenciar seu estado e anunciar o envio simulado. Enviar duas mensagens sem reposicionar o foco. As setas no campo continuam movendo o cursor de texto.

### ORB-06 · As setas não operam os seletores de vista e dispositivo

**Reprodução.** Chrome 157, 390 × 844. Foque a aba Órbita e pressione →. No Studio a 1440 × 900, foque o rádio Computador e pressione ↓. A seleção permaneceu no item de origem nos dois casos. [Abas da Órbita](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/screens/OrbitaScreen.tsx#L47) · [Rádios do Studio](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/studio/Studio.tsx#L151)

**Aceite.** Operar as vistas com setas esquerda e direita e associar a aba ao conteúdo exibido. No Studio, usar um grupo nativo de rádios. Validar Tab, setas, seleção e estado anunciado. [W3C APG · Abas](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) · [W3C APG · Rádio](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)

### ORB-07 · O radar desliza em redução de movimento

**Reprodução.** Chrome 157, 1440 × 900, preferência de movimento reduzido ativa. Arraste o radar e solte. O avatar de Matheus passou de aproximadamente (769, 473) a (793, 484) entre 50 e 300 ms após soltar. O CSS aplica a preferência a animações e transições. O motor mantém sua inércia via requestAnimationFrame. [Loop do radar](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/lib/engines/orbitHoneycomb.ts#L123) · [Redução de movimento no CSS](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/app/globals.css#L375)

**Aceite.** Em redução de movimento, o radar para ao soltar e Centralizar atualiza a posição imediatamente. A Lista e a seleção de perfil continuam operáveis. Aplicar a preferência também ao brilho que acompanha o ponteiro.

## Decisões de design e estrutura

### ORB-08 · Encontrar alguém na Órbita

Em 390 px, o cabeçalho anuncia 18 perfis e o radar centralizado exibe seis rótulos. Avatares periféricos ficam sem nome e alguns cortam nas bordas. A fila de filtros também sai da área visível. A posição é uma composição hexagonal e as distâncias vêm dos perfis simulados. Nomeie os modos “Radar” e “Lista”, dê aos dois destaque e indique a continuação dos filtros. Use Lista em uma coluna a 320 px se nome, intenção e distância competirem em duas. **Critério de aceite.** encontrar Nando e ler sua intenção sem arrastar ou depender de cor a 320 e 390 px. [Radar em 390 px](evidencias/orbita-390.png) · [Radar em 1440 px](evidencias/orbita-1440.png) · [Geometria e escala](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/lib/engines/orbitHoneycomb.ts#L1)

### ORB-09 · Ler e conferir um artigo

O feed abre um diálogo. No fluxo testado, havia compartilhamento e faltava um atalho visível para abrir a leitura pública. O artigo c1 mostra autoria e tempo de leitura, com data de revisão e referências ausentes. Um comentário fictício digitado no hub apareceu no diálogo e não apareceu na versão pública. Adicione “Ler artigo público”, reserve área para autoria, revisão e fontes, e rotule comentários simulados. Prefira listas semânticas a marcadores digitados. **Critério de aceite.** chegar à rota pública, verificar fonte e revisão, compreender a origem dos comentários e voltar à lista. A validação editorial do conteúdo de saúde cabe à equipe. [Artigo a 390 px](evidencias/artigo-390.png) · [Rota pública](https://coletivo-inspira.github.io/orbit/comunidade/c1/) · [Template de artigo](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/app/comunidade/%5Bid%5D/page.tsx#L30)

### ORB-10 · Começar e encerrar uma conversa no Parque

O desktop explica WASD, setas e gesto de ponteiro. No celular, o direcional visual ajuda, mas os botões dependem dos eventos de ponteiro e Espaço não aciona o movimento. A descoberta da conversa depende da posição no canvas, e as setas são capturadas no escopo da janela fora de campos de texto. Acrescente uma lista textual de pessoas próximas com ações de conversar e ver perfil. Restrinja os atalhos à área de jogo ativa e forneça saída explícita da ficha. **Critério de aceite.** encontrar alguém, avançar uma fala e sair pelo teclado. Se a ficha desaparecer durante a interação, devolver o foco a um controle estável. [Direcional e ficha](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/screens/ParqueScreen.tsx#L166) · [Captura de teclas](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/lib/engines/park2d.ts#L250)

### ORB-11 · Diferenciar o Studio do uso no aparelho

A moldura é reduzida com transform: scale(), o que muda o tamanho efetivo dos alvos em relação ao aparelho. No Pages, manifesto e SVG retornaram 200, e os campos id, scope e start_url usam /orbit/. O manifesto declara só um SVG com purpose any. Em sessão limpa, a recarga offline falhou e não havia registro de service worker. A inspeção de instalabilidade foi bloqueada no modo anônimo do Chrome. **Critério de aceite.** verificar instalação, ícone, teclado virtual, orientação, área segura e abertura de links em Safari iOS e Chrome Android. Documentar a necessidade de conexão no Modo Explorar. [Escala do Studio](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/studio/Studio.tsx#L87) · [Manifesto publicado](https://coletivo-inspira.github.io/orbit/manifest.webmanifest)

### ORB-12 · Entender o cartão e os selos

No celular, a pessoa passa pela prévia do cartão antes de chegar à edição. Intenção principal, selo de presença e perfil público expressam escolhas diferentes. Agrupe “Seu cartão”, “Intenções e selos” e “Visibilidade”. Identifique com texto os selos de presença e os que podem levar a outro app. Dê um caminho curto para voltar à prévia após editar. **Critério de aceite.** ativar um selo, identificar o efeito na prévia e distinguir o anel de intenção da visibilidade inclusive em 200% de zoom. [Editor do Perfil Hub](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/screens/PerfilScreen.tsx#L64)

### ORB-13 · Compartilhar contratos entre layouts

O OrbitProvider distribui todo o estado por contexto. O Studio remonta a apresentação por dispositivo e mantém as seleções nesse estado. O radar atualiza transformações de elementos a cada frame e o Parque desenha no canvas. Centralize regras de foco, semântica, compartilhamento e estados de interação. Preserve a divisão dos motores e use o profiler para decidir se o perfil durável, as preferências de sessão e o estado transitório precisam de assinaturas separadas. **Critério de aceite.** perfil persistido continua legível, seleções e modais se comportam de modo previsível ao trocar layout e não há trabalho recorrente de motor depois de desmontar a área. [Provider](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/lib/state/OrbitProvider.tsx#L30) · [Navegação responsiva](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/components/app/ResponsiveApp.tsx#L10)

### ORB-14 · Concentrar o vidro na navegação e nas ações

O CSS atual usa desfoque e saturação em barras, painéis, folhas e botões. O componente LiquidSheen atualiza o reflexo com o ponteiro. Aplique a orientação da Apple a barras e ações flutuantes, use superfícies opacas para leitura e defina tokens para fundo, vidro, foco, texto e presença. A linguagem visual no brandbook usa CSS web. A Apple documenta as APIs nativas em SwiftUI, UIKit e AppKit. **Critério de aceite.** contraste e foco permanecem legíveis com fundos claros e escuros, transparência reduzida e fallback sem desfoque. [CSS atual](https://github.com/coletivo-inspira/orbit/blob/e4a3acd89b42a8e7eb9f855119e7603132077af9/src/app/globals.css#L49) · [Material da Apple](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass) · [Exemplos no brandbook](brandbook.html#interface)

## Cobertura de verificação

**Base.** Commit e4a3acd89b42a8e7eb9f855119e7603132077af9. Leitura de composição e hierarquia, seguida de ensaios de comportamento e confronto com a fonte. Lint, typecheck, 16 testes Vitest e build estático passaram no clone. [Commit](https://github.com/coletivo-inspira/orbit/commit/e4a3acd89b42a8e7eb9f855119e7603132077af9)

| Ensaio | Resultado |
|---|---|
| Abertura no Chrome 157.0.8103.80, Windows | 320 × 844, 390 × 844, 899 × 900, 900 × 900 e 1440 × 900. Barra móvel até 899 px, lateral a partir de 900 px. Largura do documento igual à largura útil na abertura. |
| Edge 157.0.4341.60, Windows | Toque emulado em 390 × 844 abriu o perfil de Matheus. Testes adicionais cobriram link copiado, conversa, rótulos e zoom. |
| Zoom nativo de 200% no Edge | Janela de 1440 px externos, 708 px CSS úteis e DPR 2. A abertura entrou no layout móvel, com navegação na área útil e sem rolagem horizontal no documento. |
| Contraste renderizado em 390 px | Amostrei pixels do fundo do elemento e compus a cor CSS com sua opacidade. Os mínimos foram 14,89:1 no título, 7,24:1 na autoria e 5,96:1 na hora do comentário do artigo c1, e 6,39:1 no placeholder do Parque. |
| Axe WCAG no Chrome | No radar a 1440 px, a checagem de nome e rótulo sinalizou 17 elementos e 57 requereram revisão manual de contraste. No artigo c1 a 390 px, 18 elementos ficaram pendentes de checagem manual de contraste. Os valores da linha anterior cobrem as amostras selecionadas. |
| Rotas e recarga | Hub, Studio, lista de comunidade, artigo c1, ícone e manifesto acessíveis. Artigo volta à lista após recarga. As exceções do compartilhamento e da recarga offline estão descritas acima. |

**Fluidez.** Chrome headless a 1440 × 900, limitação de CPU de 4× por CDP e 1,7 s de amostra. Na Órbita, fiz um arraste em 24 passos. No Parque, mantive uma seta pressionada por 800 ms. Na segunda passagem, desativei o desfoque por CSS apenas na página de teste. Os números são intervalos entre callbacks de frame, sem equivalência direta a latência de entrada. O Parque apresentou picos nesta amostra. Atribuir custo ao vidro exige repetições com ordem alternada e perfil de renderização.

| Ensaio | p95 | Maior intervalo | Frames acima de 33,4 ms |
|---|---:|---:|---:|
| Órbita com efeito | 16,8 ms | 16,8 ms | 0 de 103 |
| Órbita sem desfoque | 16,8 ms | 17,1 ms | 0 de 103 |
| Parque com efeito | 17,0 ms | 66,8 ms | 2 de 97 |
| Parque sem desfoque | 16,8 ms | 33,5 ms | 1 de 102 |

**Limites.** A matriz cobriu os estados descritos em Chromium e com dados fictícios. A validação em Safari e Firefox, toque real, teclado virtual, VoiceOver ou NVDA, instalação pelo sistema, feedback de usuários e desempenho em aparelhos de entrada continuam pendentes. A conformidade WCAG integral e a revisão de saúde exigem verificação própria. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Revalidação após o novo deploy

Durante a auditoria, o Pages passou para o commit 0ca58af4668c4d48fba22231d3e0fb01393ddd8b. A atualização fixou alturas de linha e cores compatíveis com o protótipo e ajustou fundos e sombras. O relatório mantém as capturas e links de código da rodada inicial como referência histórica. A reconferência abaixo cobre a versão mais recente observada. [Deploy atualizado](https://github.com/coletivo-inspira/orbit/actions/runs/44973896414) · [Diff da atualização](https://github.com/coletivo-inspira/orbit/pull/3/files)

- **Os sete bugs da fila persistem.** Foram repetidos a cópia do artigo, a entrada e saída do diálogo por teclado, o foco invisível no radar, a cópia de link do Hub, a perda de foco no chat, os testes com setas e o arraste sob redução de movimento. Os cinco tamanhos, o zoom de 200%, a conversa por proximidade e o retorno do artigo à lista também foram reconferidos.
- **Contraste mínimo na versão atual.** Título do artigo 14,89:1, autoria 7,15:1, horário de comentário 6,11:1 e placeholder do Parque 6,38:1. A atualização removeu o contador da bio e manteve o limite de edição. No ORB-12, incluir a indicação desse limite perto do campo, com retorno acessível quando ele for atingido.
- **Fluidez na nova publicação.** No mesmo cenário de amostra curta, com vidro, o p95 foi de 32,5 ms no radar e 16,8 ms no Parque. Sem desfoque, ambos tiveram 16,8 ms. Os máximos com vidro foram de 33,7 ms e 66,6 ms respectivamente. São medições pontuais. O próximo teste deve repetir as condições em ordem alternada e capturar um perfil de renderização para localizar o custo.
