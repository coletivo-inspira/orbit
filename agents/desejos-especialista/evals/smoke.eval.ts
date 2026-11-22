import { defineEval, includes, satisfies } from "@grok/agent-sdk/evals";

const FONTE = /(https?:\/\/\S+|doi\.org\/\S+|\b10\.\d{4,9}\/\S+)/;

export default defineEval({
  tags: ["smoke"],
  description: "Responde 'O que é voyeurismo?' em português, com pelo menos uma fonte citada.",
  async test(t) {
    await t.send("O que é voyeurismo?");
    t.succeeded();
    t.check(t.reply, includes(/fontes/i)).gate();
    t.check(
      t.reply,
      satisfies((reply) => FONTE.test(String(reply)), "cita pelo menos uma URL ou DOI"),
    ).gate();
    t.calledTool("web_search").soft();
  },
});
