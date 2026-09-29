import { newPublicToken } from "../lib/members";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/security";
import { memberSchema } from "../lib/validation";

// Development sample data. Only ever inserted by `npx prisma db seed`, never outside production.
const SAMPLE_MEMBERS = [
  {
    memberName: "Ayesha Khan",
    companyName: "BNI Trendz",
    businessCategory: "Interior Design",
    phone: "+91 9876543210",
    address: "12 Clifton Block 5, Karachi",
    birthday: "1990-04-12",
    anniversary: "2016-11-20",
    website: "https://example.com",
    instagram: "@trendz.interiors",
    email: "ayesha@example.com",
    facebook: "trendz.interiors",
    youtube: "@trendzinteriors",
  },
  {
    memberName: "Bilal Ahmed",
    companyName: "Ahmed & Co. Chartered Accountants",
    businessCategory: "Chartered Accountant",
    phone: "+92 321 7654321",
    address: "45 Gulberg III, Lahore",
    birthday: "1985-09-03",
    website: "https://example.org",
    email: "bilal@example.org",
    facebook: "https://www.facebook.com/ahmedandco",
  },
  {
    memberName: "Sara Malik",
    companyName: "Malik Events",
    businessCategory: "Event Management",
    phone: "+92 333 5550199",
    birthday: "1994-01-27",
    instagram: "@malikevents",
    email: "sara@example.net",
    youtube: "https://www.youtube.com/@malikevents",
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example) before seeding.");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");

  // Upsert: re-running the seed with a new ADMIN_PASSWORD resets that admin's password.
  const passwordHash = await hashPassword(password);
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: process.env.ADMIN_NAME?.trim() || "Administrator" },
  });
  console.log(`Admin ready: ${email}`);

  if (process.env.NODE_ENV === "production") return console.log("Production: sample members skipped.");
  if (await prisma.member.count()) return console.log("Members already exist: sample members skipped.");
  await prisma.member.createMany({
    data: SAMPLE_MEMBERS.map((member) => ({ ...memberSchema.omit({ photo: true }).parse(member), publicToken: newPublicToken() })),
  });
  console.log(`Created ${SAMPLE_MEMBERS.length} sample members.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
