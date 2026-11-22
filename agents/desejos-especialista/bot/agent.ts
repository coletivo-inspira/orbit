import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: "desejos-especialista",
  description: "Pesquisa em psicologia e sexologia sobre desejo, com fontes, para o conteúdo educativo do Orbit.",
  model: {
    id: "grok-4.7",
    params: [
      { id: "reasoning_effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  // Só leitura: sem shell e sem edição. "webSearch" é a busca geral nativa do harness;
  // as ferramentas de bot/tools/ (web_search, fetch_page) entram via MCP automaticamente.
  tools: ["webSearch", "read", "grep", "glob", "ls"],
});
