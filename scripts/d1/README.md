# Migração PostgreSQL → Cloudflare D1

Procedimento para mover a base de dados do RecipeMechanic para o Cloudflare D1
sem perder dados. A app continua a correr em Node — fala com o D1 pela API REST
da Cloudflare, não por binding de Worker.

## Estado

A migração **já foi feita e verificada** a 12/09/2026: 493 linhas (1 perfil, 4
utilizadores, 8 tokens de verificação, 1 token de reposição, 49 clientes, 47
veículos, 49 recibos, 332 linhas de recibo, 2 convites), com `d1:verify` a
reportar zero diferenças.

| Base | `database_id` |
|---|---|
| `ribeirocar` (produção) | `9d9df713-1e3e-4e0a-9782-9937206fa533` |
| `ribeirocar-staging` (ensaio, descartável) | `daa3e8f4-4ff2-43dc-9554-bdf16f14ac92` |

O PostgreSQL de origem ficou intacto. O que resta é pôr as variáveis de ambiente
no alojamento e fazer o smoke manual do passo 5.

O resto deste ficheiro é o procedimento, para repetir ou auditar.

## Antes de começar

Preenche o `.env` a partir do `.env.example`:

- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_TOKEN` — o token precisa de `D1:Edit`.
- `CLOUDFLARE_DATABASE_ID` — a base de produção (passo 1).
- `CLOUDFLARE_STAGING_DATABASE_ID` — a base de ensaio (passo 1).
- `POSTGRES_URL` — a base de origem. Só é lida por estes scripts.

## 1. Criar as bases e aplicar o schema

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create ribeirocar
pnpm exec wrangler d1 create ribeirocar-staging
```

Copia cada `database_id` para o `.env` e o de produção também para o
`wrangler.toml`. Depois aplica o schema às duas:

```bash
pnpm exec wrangler d1 execute ribeirocar-staging --remote --file prisma/migrations/0001_init/migration.sql
pnpm exec wrangler d1 execute ribeirocar --remote --file prisma/migrations/0001_init/migration.sql
```

## 2. Exportar o Postgres

```bash
pnpm run d1:generate-pg-client   # só na primeira vez
pnpm run d1:export
```

Escreve um JSON por tabela em `.migration-data/` (ignorado pelo git — são dados
reais de clientes). Não altera nada no Postgres.

## 3. Ensaio contra a base de staging

Corre a migração inteira contra a base descartável primeiro. Se alguma coisa
correr mal, é aqui que se descobre.

```bash
pnpm run d1:import -- --target=CLOUDFLARE_STAGING_DATABASE_ID
pnpm run d1:verify -- --target=CLOUDFLARE_STAGING_DATABASE_ID
```

O `d1:verify` relê as duas bases e compara campo a campo, linha a linha. Sai com
código 1 e lista as diferenças se encontrar alguma. **É este passo que sustenta
o "sem perdas"** — a importação por si só não prova nada.

## 4. Migração a sério

```bash
pnpm run d1:import
pnpm run d1:verify
```

O `d1:import` recusa-se a correr se a base de destino já tiver linhas, para não
duplicar dados por engano.

## 5. Apontar a app ao D1

Põe `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID` e `CLOUDFLARE_D1_TOKEN` no
ambiente de produção. A `DATABASE_URL` deixa de ser usada em runtime.

Confirma à mão o que não tem testes automáticos: login, `/search`, sugestão de
peças ao escrever uma linha, criar recibo → guardar → finalizar, gerar o PDF,
enviar por email, e um ciclo offline → sincronizar.

O Postgres fica intacto durante tudo isto. Reverter é repor o `src/lib/db.ts`
anterior e a `DATABASE_URL` — nada é destruído.

## 6. Depois de validares

Já não são precisos e podem ser removidos:

- `prisma-postgres/` (schema e migrações antigas)
- `src/generated/prisma-postgres/`
- `scripts/d1/`
- `.migration-data/`
- `POSTGRES_URL` e `CLOUDFLARE_STAGING_DATABASE_ID` do `.env`
- a linha `d1:generate-pg-client` e os scripts `d1:export`/`d1:import`/`d1:verify`

## Alterações futuras ao schema

O `prisma migrate dev` não fala com o D1. O ciclo passa a ser:

```bash
pnpm run d1:diff > prisma/migrations/000N_a_tua_alteracao.sql
pnpm exec wrangler d1 execute ribeirocar --remote --file prisma/migrations/000N_a_tua_alteracao.sql
```

## Pesquisa com acentos

O `ILIKE` do Postgres faz case-folding Unicode; o SQLite do D1 não tem
equivalente (o `LIKE` e o `lower()` só tratam ASCII). Sem isso, procurar
"válv" deixava de encontrar "VÁLVULA" — na prática, quase toda a pesquisa em
português.

Por isso há três colunas normalizadas, preenchidas com `foldForSearch()`
(`src/lib/search.ts`) sempre que o campo de origem é escrito:

| Coluna | Origem |
|---|---|
| `Customer.nameFolded` | `Customer.name` |
| `Vehicle.labelFolded` | `Vehicle.label` |
| `ReceiptLine.descriptionFolded` | `ReceiptLine.description` |

**Ao acrescentar um campo pesquisável, é preciso acrescentar a coluna
normalizada e preenchê-la em todos os caminhos de escrita**, senão a pesquisa
fica silenciosamente incompleta. O `d1:verify` valida que estas colunas batem
certo com a origem.

## Limites do D1 a ter em mente

| Limite | Onde bate |
|---|---|
| Sem transações | As 7 `$transaction([...])` correm como queries soltas, sem garantia ACID. Uma falha a meio de "guardar recibo" pode deixar o recibo sem linhas. |
| 100 parâmetros por query | `createMany` é partido em blocos por `chunkForD1` (`src/lib/d1.ts`). Queries novas com `IN (...)` grandes precisam da mesma atenção. |
| 1200 pedidos / 5 min na API | Cada query Prisma é um pedido HTTP, e o limite é por utilizador, cumulativo com o dashboard. |
| 500 MB (grátis) / 10 GB (pago) | Por base de dados. |
