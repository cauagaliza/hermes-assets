# AGENTS.md — Projeto HERMES

Fonte de verdade para **qualquer agente de IA** (Claude, GPT, Gemini, Copilot etc.) e para humanos.
`CLAUDE.md` importa este arquivo. Ao mudar regras ou decisões, atualize **este** arquivo no mesmo PR.

---

## 1. O que é

Hermes é uma ferramenta interna de consulta de produtos da Intelbras: **Transferência de atendimento** e **Phase Out**.
Era um app local (HTML/CSS/JS + Node.js lendo `.csv` UTF-8). Hoje roda dentro da wiki corporativa
(MediaWiki 1.33.0, skin Vector, pt-BR), **sem backend**: o navegador lê páginas da própria wiki via
`?title=<Pagina>&action=raw`, que contêm CSV puro com separador `;`.

**Requisito:** o mesmo código deve rodar na wiki **e** num servidor local. Fora da origem da wiki,
`fetch` para `suporte.intelbras.com.br` pode ser bloqueado por CORS. A solução prevista é uma
abstração de fonte de dados (`wiki | local`), nunca código duplicado.

## 2. Mapa de arquivos e URLs

| Arquivo | Papel |
|---|---|
| `app.js` | Toda a lógica: carga de dados, associação URA/Fila, tabelas, busca, modais, tema, COPIAR, sugestões |
| `style.css` | Todo o visual. Inclui regras `body:has(.modal-container.active)` que escondem o chrome da wiki |
| `wiki-snippet.html` | HTML colado na página da wiki. Carrega `style.css` e `app.js` por URL e contém a estrutura (botões, modais) |

Pasta local: `E:\Cauã\hermes\hermes-assets` (tem "ã": **sempre use aspas** em comandos de shell).
Repositório: `https://github.com/cauagaliza/hermes-assets` (branch principal: `main`).

**Assets publicados (GitHub Pages):**
- `https://cauagaliza.github.io/hermes-assets/style.css`
- `https://cauagaliza.github.io/hermes-assets/app.js`

**Páginas da wiki:**
| Página | Uso |
|---|---|
| `Teste_hermes` | Hospeda o snippet (o app) |
| `Teste_hermes_tranferencia` | Dados de Transferência. A grafia **sem "s" é o nome real: não corrija** |
| `Teste_hermes_phaseout` | Dados de Phase Out |
| `Tabela_ura` | Referência histórica. Colunas: `Produtos;Time atendimento;Código Atual;Novo código unificado` |
| `Tabela_gtc` | Referência histórica. Colunas: `Segmento;Fila;Responsável` |

Base: `https://suporte.intelbras.com.br/index.php/<Pagina>`
Leitura crua: `https://suporte.intelbras.com.br/index.php?title=<Pagina>&action=raw`

**Externos:** formulário de erros `https://forms.office.com/r/qwpXn8inp3` · sugestões (Formspree) `https://formspree.io/f/xyzjjnpj`

## 3. Formato dos dados

A tabela de Transferência é atualizada pelo dono do projeto colando de uma planilha, com **apenas 5 colunas**:

```
Nome do produto;Diretoria de Produto;Segmento;Transferencia Chat;Transferencia Telefone
```

Colunas são lidas **por nome normalizado** (sem acento, minúsculas, espaços colapsados), nunca por posição.

---

## 4. Regras invioláveis

### 4.1 Fluxo de trabalho (Issues + PRs)
1. **Toda tarefa vira uma Issue** no GitHub, com tipo no título: `[Correção]`, `[Melhoria]`, `[Nova função]` ou `[Infra]`.
2. Trabalho em **branch própria** a partir de `main` (ex.: `fix/12-escapar-xss`, `feat/15-rodape-data`).
3. **Todo deploy é via PR.** A descrição do PR **cita a Issue** (`Closes #N`).
4. **Nada vai direto para `main`.** Sem push direto, sem force-push em `main`.
5. GitHub Pages publica só depois do merge em `main`.

### 4.2 Regra do `&` em `<script>` inline da wiki
O MediaWiki converte todo `&` literal em `&amp;`, **inclusive dentro de `<script>` inline**.
`&&` vira `&amp;&amp;` → `SyntaxError` → o script inteiro morre (foi a causa dos botões mortos).
- `app.js` é externo e não passa pelo serializador da wiki: lá pode usar `&` normalmente.
- **Em qualquer `<script>` inline no `wiki-snippet.html`: nunca escreva `&` literal.**
  Use `URLSearchParams`, `String.fromCharCode(38)`, ou mova a lógica para `app.js`.

### 4.3 Regra de cache
Mudou `app.js` ou `style.css` → **incremente a versão** (`?v=N`) nas URLs do snippet na wiki.
Sem isso, navegador/CDN serve a versão antiga e o teste local diverge da wiki.
(Meta: substituir por versionamento automático; ver backlog.)

### 4.4 Regra URA / Fila
- URA e Fila distribuidor são calculadas **somente pelo código**, a partir das 5 colunas.
- **Não** adicionar colunas ao CSV, **não** popular manualmente, **não** usar script externo para preencher.
- Produto sem categoria resolvida → `console.warn` com produto, segmento e telefone; a tela mostra `—`.
  **Nunca quebrar a página** por causa de um produto.
- Ordem de resolução pretendida (ver §6 sobre o estado real):
  1. valor cru de "Transferência Telefone" como chave do dicionário `INFO_POR_TIME_ATENDIMENTO`;
  2. fallback: `slugify(Segmento)` (remove acentos e `de/da/do/das/dos/e`);
  3. fallback explícito `INFO_POR_SEGMENTO` (mapeamento confirmado em §9, ainda não implementado);
  4. nada bateu → `console.warn` + `—`.

### 4.5 Modais sobre a wiki
`position: fixed` quebra quando um ancestral tem `transform`, `filter` ou `contain`.
O `style.css` usa `z-index: 2147483646` e regras `body:has(.modal-container.active)` que escondem o
chrome do Vector e neutralizam `transform/filter/contain` nos ancestrais. **Não remover sem necessidade.**

### 4.6 Segurança
- Todo valor vindo do CSV/wiki é **não confiável** (qualquer editor da wiki controla). Nunca interpolar
  em `innerHTML` sem escapar; prefira `textContent` / `createElement`.
- Segredos **nunca** no repositório, em logs, Issues ou PRs. Credenciais só em `.env` (que deve estar no `.gitignore`).
- Dependências com versão fixa; Dependabot ativo; `npm audit` no CI.

### 4.7 Acesso à wiki
- Credenciais: **Bot Password** (Especial:BotPasswords), permissões mínimas, lidas do `.env`.
  **Nunca pedir a senha pessoal do usuário.**
- Usar a API (`api.php`: `action=login` → token → `action=edit`) por script, lendo credenciais do ambiente.
- **Leitura é livre. Escrita só com confirmação explícita do usuário, a cada vez**, mostrando o diff antes/depois.
- Trabalhar primeiro nas páginas `Teste_*`.
- **NUNCA editar as páginas de dados** (`Teste_hermes_tranferencia`, `Teste_hermes_phaseout`): o conteúdo é do usuário.
- Para editar `Teste_hermes` (snippet), explicar **onde e por quê** antes. Só é necessário quando muda a
  estrutura HTML/ids ou para subir o `?v=N`.
- Se a API exigir SSO/VPN ou rejeitar o login: **pare e avise**. Não tente contornar.

### 4.8 Telemetria e privacidade
- A página roda numa wiki interna. **Antes de enviar qualquer telemetria para SaaS externo**, o usuário
  precisa validar com TI/segurança.
- Nunca enviar conteúdo de produto nem dados de usuário em telemetria.
- Datadog e New Relic são pagos e sobrepostos: **não adicionar sem aprovação explícita**.

---

## 5. Padrões de qualidade (alvo — ainda não implementados)

- **Lint/format:** Biome. **Commits:** Conventional Commits validados por commitlint.
- **Código morto:** Knip. **Mutation testing:** Stryker no módulo de associação URA/Fila.
- **Arquitetura:** dependency-cruiser.
- **Testes:** unitários (Vitest) para parser CSV, normalização e resolução URA/Fila;
  E2E com Playwright contra `wiki-snippet.html` servido localmente com dados de exemplo; cobertura no Codecov.
- **CI (GitHub Actions):** lint + testes + cobertura + `npm audit` em todo PR; deploy do Pages só após merge em `main`.
- **Observabilidade:** adiada por decisão do usuário. Quando voltar: OpenTelemetry + Sentry, após aprovação da TI.
- **Docs:** decisões de arquitetura em `docs/` (formato ADR). Manter este arquivo atualizado.

### Antes de abrir um PR
1. Existe Issue? A branch é própria? A descrição tem `Closes #N`?
2. Lint, testes unitários e E2E passando localmente (quando o tooling existir).
3. Mudou `app.js`/`style.css`? Anote no PR que o `?v=N` do snippet precisa subir.
4. Algum `<script>` inline novo no snippet? Confira que não há `&` literal.
5. Algum valor do CSV indo para o DOM? Confira que está escapado.
6. Mudou regra/decisão? Atualize este `AGENTS.md`.

---

## 6. Estado verificado do código (2026-10-06)

Divergências entre o que foi descrito e o que **está de fato** no repositório (`main` @ `ff3e3cd`):

1. **Duas versões de `app.js` coexistem:**
   - **Publicada no GitHub Pages / commit `ff3e3cd`:** faz `fetch` de `Tabela_ura` e `Tabela_gtc` e
     resolve por `slugify(Segmento)`. Usuário confirmou (2026-10-06) que na wiki URA e Fila aparecem.
   - **Cópia de trabalho (não commitada):** dicionário `INFO_POR_TIME_ATENDIMENTO` (27 categorias),
     sem `fetch` das tabelas auxiliares. **Ainda não testada na wiki.** Ela é a direção escolhida.
   - Ainda falta `INFO_POR_SEGMENTO` (fallback confirmado em §9) e trocar `Seguranca` → `Segurança Dedicado`.
2. **`style.css` NÃO está escopado em `#hermes-app`.** Usa `body.dark-mode` e regras globais em
   `html`, `*`, `body` (`width: 100vw`, `display: flex`), `h1`, `main` — que afetam a página da wiki inteira.
3. **Tema escuro quebrado:** `app.js` alterna `dark-mode` em `#hermes-app`, mas o snippet não tem
   elemento com esse id e o CSS espera a classe no `body`. Resultado: `console.error` e tema sem efeito.
4. O snippet local (agora versionado, Issue #1) não tinha `?v=N`, e contém `<html>/<head>/<body>` (o MediaWiki os descarta).
5. Não há blur no fundo do modal (só `rgba(0,0,0,0.7)`).
6. **XSS confirmado:** `renderTransferenciaTable`, `renderPhaseoutTable`, `row()` e `displayPhaseoutDetails`
   interpolam valores do CSV em `innerHTML`.
7. **Phase Out por posição confirmado:** `vals[0..5]`, `vals[7]`, `vals[9]` (6 e 8 ignorados).
8. Data do rodapé (`09/07/2026`) hardcoded no snippet.
9. Mensagem "Digite para pesquisar." ativa via `SEARCH_HINT`.
10. Não existe `.gitignore` (logo, `.env` **não** está ignorado).
11. Ambiente: Node.js v24.19.0 LTS instalado em 2026-10-06 (`C:\Program Files\nodejs`); `gh` autenticado como `cauagaliza`.
12. O modo local usa **outro código** (lê um `.csv` na mesma pasta); ainda não está neste repositório.

## 7. Backlog (Issues no GitHub)

Lista viva: `gh issue list`. Labels: `tipo: correção|melhoria|nova função|infra`, `prioridade: alta`, `bloqueada`.

| # | Tarefa |
|---|---|
| 1 | [Infra] Documentação para agentes, `.gitignore`, modelos de Issue/PR, versionar snippet |
| 2 | [Correção] Escapar HTML de valores do CSV (XSS) — **alta** |
| 3 | [Correção] URA/Fila por dicionário + `INFO_POR_SEGMENTO` + "Segurança Dedicado" — **alta** |
| 4 | [Correção] Escopar `style.css` em `#hermes-app` e consertar tema escuro |
| 5 | [Melhoria] Phase Out por nome de coluna |
| 6 | [Melhoria] Versionamento automático dos assets |
| 7 | [Nova função] Data do rodapé de fonte única |
| 8 | [Infra] Separar repositório (Opção A) |
| 9 | [Infra] Modularizar `app.js` + Biome, commitlint, Knip, dependency-cruiser |
| 10 | [Infra] Vitest, Playwright, Codecov, Stryker |
| 11 | [Melhoria] Teste do dicionário contra CSV de exemplo |
| 12 | [Infra] CI, Dependabot, `npm audit`, proteção da `main` |
| 13 | [Melhoria] Fonte de dados `wiki \| local` — bloqueada |
| 14 | [Infra] Observabilidade OTel + Sentry — bloqueada |
| 15 | [Infra] CSP e exposição de dados com TI — bloqueada |

## 8. Decisões em aberto

Consulte antes de mexer nestes pontos. Ao serem respondidas, mova para §9.

1. Data do rodapé: de onde vem a fonte única? (Issue #7)
2. Cabeçalho exato da página `Teste_hermes_phaseout` (Issue #5).
3. Valor atual de `?v=N` no snippet publicado na wiki (a wiki exige login; não dá para ler sem credencial).

## 9. Decisões tomadas

Confirmadas pelo usuário em 2026-10-06:

- **Associação URA/Fila por dicionário em código** (`INFO_POR_TIME_ATENDIMENTO`), sem `fetch` de `Tabela_ura`/`Tabela_gtc`.
- **Fallback `INFO_POR_SEGMENTO`** (Segmento normalizado → categoria do dicionário), todas confirmadas:
  | Segmento | Categoria | URA / Fila |
  |---|---|---|
  | Comunicacao HO | `redes_home_office` | 475 / Varejo Dedicado |
  | Redes Opticas | `redes_fibra_optica` | 478 / Redes Dedicado |
  | Redes Empresariais | `redes_empresariais` | 476 / Redes Dedicado |
  | Cameras Plug and Play | `varejo_mibo` | 357 / Varejo Dedicado |
  | Fechaduras Digitais | `varejo_controle_acesso` | 453 / Varejo Dedicado |
  | Energia HO | `varejo_casa_inteligente` | 493 / Varejo Dedicado |
  | CFTV IP (sem telefone) | `seguranca_cftv` | 458 / Segurança Dedicado |
- **RENOVIGI fica sem categoria** (mostra `—`). Comportamento esperado, não é bug.
- Grafia oficial: **"Segurança Dedicado"** (com cedilha).
- `redes_linha_future` existe: URA 479 / Redes Dedicado.
- Regras de arquitetura ("Arch-contract") = **dependency-cruiser**.
- **Datadog/New Relic: fora do escopo por enquanto.** Nenhuma telemetria externa até nova decisão.
- Modo local hoje lê um `.csv` da mesma pasta (com internet disponível). Meta: **um único código**
  para wiki e local, com fonte de dados `wiki | local`. CSVs reais **não** vão para o repositório.
- Exemplos aprovados no dicionário: `solar_offgrid` → 494; `solar_ongrid` → 492.
- Tabela vazia mostra "Digite para pesquisar." (`SEARCH_HINT`). Manter.
- **Visibilidade: Opção A** (Issue #8): repo-fonte privado; `hermes-assets` público só com os arquivos
  publicados. Qualquer JS/CSS carregado pelo navegador continua legível por quem abre a página.
- **Prioridade: fazer funcionar na wiki primeiro.** Unificação com o código local fica para depois (Issue #13).
- GitHub Pages: branch `main`, pasta `/` (raiz), build `legacy`. Merge na `main` = deploy.
- A wiki exige login: `action=raw` sem sessão redireciona para `Especial:Autenticar-se`.
  Acesso por agentes só via Bot Password no `.env` (§4.7).
- Interpretação dos pedidos: "datalog" = Datadog; "Comilint" = commitlint; "Stryke" = Stryker.
