import { PrismaClient } from "generated/prisma/client";
import * as ChannelsRepository from "@features/channels/channels-repository";
import { createSystemMessage } from "@features/messages/messages-repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@common/errors";
import { CreateRoomDTO, UpdateRoomDTO } from "@features/channels/channels-types";

export async function listChannels(userId: string, prisma: PrismaClient) {
  return ChannelsRepository.listChannelsForUser(prisma, userId);
}

export async function createRoom(userId: string, data: CreateRoomDTO, prisma: PrismaClient) {
  return ChannelsRepository.createRoom(prisma, { ...data, ownerId: userId });
}

export async function getChannel(channelId: string, userId: string, prisma: PrismaClient) {
  const member = await ChannelsRepository.findMembership(prisma, channelId, userId);
  if (!member) throw new ForbiddenError("You are not a member of this channel");

  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  return channel;
}

export async function updateRoom(
  channelId: string,
  userId: string,
  data: UpdateRoomDTO,
  prisma: PrismaClient
) {
  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "ROOM") throw new ForbiddenError("Only rooms can be updated");
  if (channel.ownerId !== userId) throw new ForbiddenError("Only the room owner can update it");
  return ChannelsRepository.updateRoom(prisma, channelId, data);
}

export async function deleteRoom(channelId: string, userId: string, prisma: PrismaClient) {
  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "ROOM") throw new ForbiddenError("Only rooms can be deleted");
  if (channel.ownerId !== userId) throw new ForbiddenError("Only the room owner can delete it");
  await ChannelsRepository.deleteChannel(prisma, channelId);
}

export async function joinRoom(channelId: string, userId: string, prisma: PrismaClient) {
  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "ROOM") throw new ForbiddenError("You can only join rooms");

  const existing = await ChannelsRepository.findMembership(prisma, channelId, userId);
  if (existing) throw new ConflictError("You are already a member of this room");

  await ChannelsRepository.createMembership(prisma, channelId, userId);
  await createSystemMessage(prisma, { channelId, authorId: userId, content: "joined" });
  return ChannelsRepository.findChannelById(prisma, channelId);
}

export async function leaveRoom(channelId: string, userId: string, prisma: PrismaClient) {
  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "ROOM") throw new ForbiddenError("You can only leave rooms");
  if (channel.ownerId === userId)
    throw new ForbiddenError("The room owner cannot leave. Transfer ownership or delete the room.");

  const member = await ChannelsRepository.findMembership(prisma, channelId, userId);
  if (!member) throw new ForbiddenError("You are not a member of this room");
  await ChannelsRepository.deleteMembership(prisma, channelId, userId);
  await createSystemMessage(prisma, { channelId, authorId: userId, content: "left" });
}

export async function listMembers(channelId: string, userId: string, prisma: PrismaClient) {
  const member = await ChannelsRepository.findMembership(prisma, channelId, userId);
  if (!member) throw new ForbiddenError("You are not a member of this channel");
  return ChannelsRepository.listMembers(prisma, channelId);
}

export async function kickMember(
  channelId: string,
  requesterId: string,
  targetUserId: string,
  prisma: PrismaClient
) {
  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.ownerId !== requesterId) throw new ForbiddenError("Only the room owner can kick members");
  if (requesterId === targetUserId) throw new ForbiddenError("You cannot kick yourself");

  const member = await ChannelsRepository.findMembership(prisma, channelId, targetUserId);
  if (!member) throw new NotFoundError("Member");
  await ChannelsRepository.deleteMembership(prisma, channelId, targetUserId);
  await createSystemMessage(prisma, { channelId, authorId: targetUserId, content: "removed" });
}

export async function getOrCreateDirectChannel(
  userId: string,
  partnerId: string,
  prisma: PrismaClient
) {
  if (userId === partnerId) throw new ForbiddenError("Cannot DM yourself");
  return ChannelsRepository.findOrCreateDirectChannel(prisma, userId, partnerId);
}

export async function sendInvite(
  channelId: string,
  inviterId: string,
  inviteeId: string,
  prisma: PrismaClient
) {
  const channel = await ChannelsRepository.findChannelById(prisma, channelId);
  if (!channel) throw new NotFoundError("Channel");
  if (channel.type !== "ROOM") throw new ForbiddenError("Can only invite to rooms");
  if (channel.ownerId !== inviterId) throw new ForbiddenError("Only the room owner can invite members");
  if (inviterId === inviteeId) throw new ForbiddenError("Cannot invite yourself");

  const alreadyMember = await ChannelsRepository.findMembership(prisma, channelId, inviteeId);
  if (alreadyMember) throw new ConflictError("User is already a member of this room");

  const existingInvite = await ChannelsRepository.findPendingInvite(prisma, channelId, inviteeId);
  if (existingInvite) throw new ConflictError("User already has a pending invite to this room");

  await ChannelsRepository.createInvite(prisma, channelId, inviterId, inviteeId);
}

export async function listMyInvites(userId: string, prisma: PrismaClient) {
  return ChannelsRepository.listPendingInvitesForUser(prisma, userId);
}

export async function acceptInvite(inviteId: string, userId: string, prisma: PrismaClient) {
  const invite = await ChannelsRepository.findInviteById(prisma, inviteId);
  if (!invite) throw new NotFoundError("Invite");
  if (invite.inviteeId !== userId) throw new ForbiddenError("This invite is not for you");
  if (invite.status !== "PENDING") throw new ConflictError("Invite is no longer pending");
  if (invite.channel.type !== "ROOM") throw new ForbiddenError("Can only accept room invites");

  const alreadyMember = await ChannelsRepository.findMembership(prisma, invite.channelId, userId);
  if (alreadyMember) {
    await ChannelsRepository.updateInviteStatus(prisma, inviteId, "ACCEPTED");
    return;
  }

  await ChannelsRepository.createMembership(prisma, invite.channelId, userId);
  await createSystemMessage(prisma, { channelId: invite.channelId, authorId: userId, content: "joined" });
  await ChannelsRepository.updateInviteStatus(prisma, inviteId, "ACCEPTED");
}

export async function declineInvite(inviteId: string, userId: string, prisma: PrismaClient) {
  const invite = await ChannelsRepository.findInviteById(prisma, inviteId);
  if (!invite) throw new NotFoundError("Invite");
  if (invite.inviteeId !== userId) throw new ForbiddenError("This invite is not for you");
  if (invite.status !== "PENDING") throw new ConflictError("Invite is no longer pending");

  await ChannelsRepository.updateInviteStatus(prisma, inviteId, "DECLINED");
}

export async function markRead(channelId: string, userId: string, prisma: PrismaClient) {
  const member = await ChannelsRepository.findMembership(prisma, channelId, userId);
  if (!member) throw new ForbiddenError("You are not a member of this channel");
  await ChannelsRepository.markRead(prisma, channelId, userId);
}
