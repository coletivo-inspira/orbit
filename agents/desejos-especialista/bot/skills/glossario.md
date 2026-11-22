---
description: Use ao escrever ou revisar uma entrada do glossário de desejos ou uma categoria do quiz do Orbit.
---

# Entrada de glossário

Pesquise antes de escrever: pelo menos duas fontes lidas com `fetch_page`, de preferência uma revisada por pares.

Produza a entrada em Markdown, nesta ordem e com estes títulos:

```md
### <Nome em português> (<nome popular original, se houver>)

**Resumo:** uma frase, até 140 caracteres, sem jargão.

**O que é:** 2 a 4 frases. Defina o desejo pelo que atrai (sensação, papel, cenário, olhar), não por quem a pessoa "é".

**Mitos e fatos:**
- **Mito:** <crença comum>. **Fato:** <correção com dado e número da fonte [n]>.
- (2 a 4 pares)

**Como explorar com consentimento:**
- 3 a 5 passos práticos e não explícitos: conversa antes, limites, palavra de segurança quando couber, ir aos poucos, conversa depois.

**Referências:**
1. Autor(es) (ano). Título. Veículo. URL ou DOI
```

Regras:

- Linguagem de "desejo", nunca "fetiche". Sem rótulo clínico. Se o tema tiver um transtorno correspondente no DSM-5-TR ou na CID-11, explique em uma frase a diferença entre ter o desejo e ter o transtorno.
- Conteúdo educativo e não explícito: nada de descrição gráfica de atos, partes do corpo ou nudez.
- Nada que envolva pessoas sem consentimento, menores ou animais como "desejo a explorar". Voyeurismo e exibicionismo só aparecem na forma consentida.
- Se pedirem JSON, use as chaves `id`, `nome`, `nomeOriginal`, `resumo`, `oQueE`, `mitosEFatos` (lista de `{ mito, fato }`), `comoExplorarComConsentimento` (lista de textos) e `referencias` (lista de `{ autores, ano, titulo, url }`).
