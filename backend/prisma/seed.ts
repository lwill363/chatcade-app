import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;
const PASSWORD = "password123";

async function main() {
  // Roles are seeded via migration — just look them up
  const userRole = await prisma.role.findUniqueOrThrow({ where: { name: "user" } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "admin" } });

  // ─── Users ────────────────────────────────────────────────────────────────

  const hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { emailAddress: "admin@chatcade.dev" },
    update: {},
    create: {
      username: "admin",
      emailAddress: "admin@chatcade.dev",
      passwordHash: hash,
      roleId: adminRole.id,
    },
  });

  const alice = await prisma.user.upsert({
    where: { emailAddress: "alice@chatcade.dev" },
    update: {},
    create: {
      username: "alice",
      emailAddress: "alice@chatcade.dev",
      passwordHash: hash,
      roleId: userRole.id,
    },
  });

  const bob = await prisma.user.upsert({
    where: { emailAddress: "bob@chatcade.dev" },
    update: {},
    create: {
      username: "bob",
      emailAddress: "bob@chatcade.dev",
      passwordHash: hash,
      roleId: userRole.id,
    },
  });

  console.log("Seeded users: admin, alice, bob (password: password123)");

  // ─── Rooms ────────────────────────────────────────────────────────────────

  let hqRoom = await prisma.channel.findFirst({
    where: { type: "ROOM", name: "Chatcade HQ", ownerId: admin.id },
  });

  if (!hqRoom) {
    hqRoom = await prisma.channel.create({
      data: {
        type: "ROOM",
        name: "Chatcade HQ",
        description: "The main community room",
        ownerId: admin.id,
        members: {
          create: [
            { userId: admin.id },
            { userId: alice.id },
            { userId: bob.id },
          ],
        },
      },
    });
  }

  let aliceRoom = await prisma.channel.findFirst({
    where: { type: "ROOM", name: "Alice's Corner", ownerId: alice.id },
  });

  if (!aliceRoom) {
    aliceRoom = await prisma.channel.create({
      data: {
        type: "ROOM",
        name: "Alice's Corner",
        description: "Alice's personal room",
        ownerId: alice.id,
        members: {
          create: [
            { userId: alice.id },
            { userId: bob.id },
          ],
        },
      },
    });
  }

  console.log("Seeded rooms: Chatcade HQ, Alice's Corner");

  // ─── Room messages ────────────────────────────────────────────────────────

  const hqCount = await prisma.message.count({ where: { channelId: hqRoom.id } });
  if (hqCount === 0) {
    await prisma.message.createMany({
      data: [
        { content: "Welcome to Chatcade HQ!",           channelId: hqRoom.id, authorId: admin.id },
        { content: "Hey everyone, excited to be here!", channelId: hqRoom.id, authorId: alice.id },
        { content: "Same! What are we building first?", channelId: hqRoom.id, authorId: bob.id },
        { content: "Let's start with the frontend.",    channelId: hqRoom.id, authorId: admin.id },
      ],
    });
    const hqLast = await prisma.message.findFirst({
      where: { channelId: hqRoom.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    await prisma.channel.update({ where: { id: hqRoom.id }, data: { lastMessageId: hqLast!.id } });
  }

  const aliceCount = await prisma.message.count({ where: { channelId: aliceRoom.id } });
  if (aliceCount === 0) {
    await prisma.message.createMany({
      data: [
        { content: "First PR is up — take a look when you get a chance.", channelId: aliceRoom.id, authorId: alice.id },
        { content: "On it, left a few comments.",                         channelId: aliceRoom.id, authorId: bob.id },
        { content: "Good catches, I'll address them now.",                channelId: aliceRoom.id, authorId: alice.id },
      ],
    });
    const aliceLast = await prisma.message.findFirst({
      where: { channelId: aliceRoom.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    await prisma.channel.update({ where: { id: aliceRoom.id }, data: { lastMessageId: aliceLast!.id } });
  }

  console.log("Seeded room messages");

  // ─── DM channel ───────────────────────────────────────────────────────────

  const existingDm = await prisma.channel.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId: alice.id } } },
        { members: { some: { userId: bob.id } } },
      ],
    },
    select: { id: true },
  });

  let dmChannel: { id: string };

  if (existingDm) {
    dmChannel = existingDm;
  } else {
    dmChannel = await prisma.channel.create({
      data: {
        type: "DM",
        members: {
          create: [{ userId: alice.id }, { userId: bob.id }],
        },
      },
    });
  }

  const dmCount = await prisma.message.count({ where: { channelId: dmChannel.id } });
  if (dmCount === 0) {
    await prisma.message.createMany({
      data: [
        { content: "Hey Bob, are you joining Chatcade HQ?", channelId: dmChannel.id, authorId: alice.id },
        { content: "Already there! See you around.",        channelId: dmChannel.id, authorId: bob.id },
      ],
    });
    const dmLast = await prisma.message.findFirst({
      where: { channelId: dmChannel.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    await prisma.channel.update({ where: { id: dmChannel.id }, data: { lastMessageId: dmLast!.id } });
  }

  console.log("Seeded DM: alice <-> bob");

  // ─── Friendships ──────────────────────────────────────────────────────────

  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: alice.id, addresseeId: bob.id } },
    update: {},
    create: { requesterId: alice.id, addresseeId: bob.id, status: "ACCEPTED" },
  });

  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: admin.id, addresseeId: alice.id } },
    update: {},
    create: { requesterId: admin.id, addresseeId: alice.id, status: "ACCEPTED" },
  });

  await prisma.friendship.upsert({
    where: { requesterId_addresseeId: { requesterId: bob.id, addresseeId: admin.id } },
    update: {},
    create: { requesterId: bob.id, addresseeId: admin.id, status: "PENDING" },
  });

  console.log("Seeded friendships: alice<->bob (accepted), admin<->alice (accepted), bob->admin (pending)");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
