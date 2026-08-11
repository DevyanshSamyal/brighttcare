import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.SEED_ADMIN_USERNAME || "admin").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "change-me-immediately";
  const name = process.env.SEED_ADMIN_NAME || "Administrator";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Admin account "${username}" already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      name,
      role: "ADMIN",
    },
  });

  console.log(`Created admin account "${username}". Log in and change the password from the admin panel.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
