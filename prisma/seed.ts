import { prisma } from "@/lib/db/prisma";

async function main() {
  console.log("AgroLynk seed placeholder. Add initial data by phase when needed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
