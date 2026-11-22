# desejos-especialista

Projeto Agent SDK (`@grok/agent-sdk`). Este arquivo é para agentes de código que editam o projeto. O prompt do agente servido é `bot/instructions.md`.

Este projeto fica fora do app Next.js: tem `package.json` próprio e está excluído do `tsconfig.json`, do ESLint e do Prettier da raiz. O CI do app não o verifica.

## Ciclo

```bash
npx --yes "@grok/agent-sdk@0.7.2" validate --dir .
npx --yes "@grok/agent-sdk@0.7.2" info --dir . --json
npx --yes "@grok/agent-sdk@0.7.2" tool call web_search --dir . --input '{"consulta":"voyeurism prevalence"}'
npx --yes "@grok/agent-sdk@0.7.2" run --dir . --message "O que é voyeurismo?"
npx --yes "@grok/agent-sdk@0.7.2" eval --dir .
npm run check
```

Rode a CLI com Node 22.13 ou mais novo, nunca com Bun.

## Estrutura

- `bot/instructions.md`: prompt sempre ativo. Mantenha curto.
- `bot/tools/<nome>.ts`: uma ferramenta por arquivo; o nome do arquivo é o nome da ferramenta.
- `bot/skills/glossario.md`: formato fixo de cada entrada do glossário.
- `bot/lib/`: código compartilhado, nunca descoberto como ferramenta.
- `evals/`: evals do projeto (não use `bot/evals/`).

## Não faça

- Não ponha formatação, classificação ou redação de respostas em TypeScript. Isso fica nas instruções e skills.
- Não adicione dependências npm sem necessidade. Use o que o `@grok/agent-sdk` já traz.
- Não aponte `serve` para a raiz do repositório.
- Não ative memória compartilhada (`memoryHook`): as perguntas tratam de vida sexual, que é dado sensível (LGPD, art. 5º, II).
