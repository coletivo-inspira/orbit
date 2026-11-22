# Agente especialista em desejos

Assistente de pesquisa em psicologia e sexologia sobre desejo e excitação. Ele produz conteúdo educativo, não explícito e com fontes para a seção "Desejos" do Orbit.

## O que o agente faz

- Responde em português do Brasil, sem julgamento, e separa ter um desejo de ter um diagnóstico (DSM-5-TR e CID-11).
- Busca estudos na Europe PMC (inclui o PubMed) e na Crossref, verbetes na Wikipedia e sites gerais pela busca nativa. Nenhuma busca precisa de chave de API.
- Lê o resumo ou a página com `fetch_page` antes de citar.
- Termina toda resposta com `## Fontes`.
- Escreve entradas de glossário num formato fixo (skill `glossario`).

Canais: playground e HTTP. Sem Slack e sem deploy.

## Testar localmente

Os turnos do modelo precisam de uma credencial da Cursor (`CURSOR_API_KEY` ou `npx --yes "@grok/agent-sdk@0.7.2" login`).

```bash
cd agents/desejos-especialista
npm install
npx --yes "@grok/agent-sdk@0.7.2" validate --dir .
npm run check
npx --yes "@grok/agent-sdk@0.7.2" run --dir . --message "O que é voyeurismo?"
npx --yes "@grok/agent-sdk@0.7.2" dev .
# abra http://127.0.0.1:3000/playground
npx --yes "@grok/agent-sdk@0.7.2" eval --dir .
```

O eval `smoke` pergunta "O que é voyeurismo?" e exige uma resposta com a seção de fontes e pelo menos uma URL ou DOI.

Para testar as ferramentas sem credencial:

```bash
npx --yes "@grok/agent-sdk@0.7.2" tool call web_search --dir . --input '{"consulta":"BDSM practitioners psychological characteristics"}'
npx --yes "@grok/agent-sdk@0.7.2" tool call fetch_page --dir . --input '{"url":"https://doi.org/10.1111/jsm.12192"}'
```

## Publicar (opcional, fora deste PR)

1. Rode `npx --yes "@grok/agent-sdk@0.7.2" validate --dir .`.
2. Rode `npx --yes "@grok/agent-sdk@0.7.2" deploy --dir . --dry-run` e revise.
3. Rode `npx --yes "@grok/agent-sdk@0.7.2" deploy --dir .` no seu terminal. O primeiro deploy mostra um token uma vez só. Guarde-o num gerenciador de senhas.
