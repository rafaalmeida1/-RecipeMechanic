import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedUser = { email: string; role: Role; password?: string };

function parseSeedUsers(): SeedUser[] {
  const raw = process.env.SEED_USERS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((u) => {
        if (!u || typeof u !== "object") return null;
        const email = (u as { email?: string }).email;
        const roleRaw = (u as { role?: string }).role;
        const password = (u as { password?: string }).password;
        if (!email || !roleRaw) return null;
        const role = roleRaw === "ADMIN" ? Role.ADMIN : Role.MECHANIC;
        return { email: email.toLowerCase(), role, password } satisfies SeedUser;
      })
      .filter(Boolean) as SeedUser[];
  } catch {
    return [];
  }
}

async function main() {
  const count = await prisma.businessProfile.count();
  if (count === 0) {
    await prisma.businessProfile.create({
      data: {
        legalName:
          process.env.SEED_BUSINESS_LEGAL_NAME ??
          "CHRISTOPHER FERNANDES RIBEIRO 12526005698",
        cnpj: process.env.SEED_BUSINESS_CNPJ ?? "34.818.475/0001-01",
        phone: process.env.SEED_BUSINESS_PHONE ?? "(19) 98849-3878",
        email: process.env.SEED_BUSINESS_EMAIL ?? "cristophercrark@hotmail.com",
        pixDefault: process.env.SEED_BUSINESS_PIX ?? "(19) 988493878",
      },
    });
  }

  const users = parseSeedUsers();
  for (const u of users) {
    const passwordHash = u.password
      ? await bcrypt.hash(u.password, 10)
      : null;
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        role: u.role,
        passwordHash,
      },
      update: {
        role: u.role,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
