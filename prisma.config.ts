// O Prisma deixa de carregar o `.env` sozinho quando existe um ficheiro de
// config, por isso carregamo-lo aqui — os scripts de migração para o D1
// dependem de `DATABASE_URL`, `POSTGRES_URL` e das credenciais Cloudflare.
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
