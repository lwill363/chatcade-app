-- Make author_id nullable so messages survive user deletion (show as "Deleted User")
ALTER TABLE "messages" ALTER COLUMN "author_id" DROP NOT NULL;

-- Update author_id FK to SET NULL on user delete
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_author_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;

-- Cascade delete channel invites when inviter or invitee is deleted
ALTER TABLE "channel_invites" DROP CONSTRAINT IF EXISTS "channel_invites_inviter_id_fkey";
ALTER TABLE "channel_invites" DROP CONSTRAINT IF EXISTS "channel_invites_invitee_id_fkey";
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_inviter_id_fkey"
  FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "channel_invites" ADD CONSTRAINT "channel_invites_invitee_id_fkey"
  FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Set winner_id to NULL when winner's account is deleted
ALTER TABLE "games" DROP CONSTRAINT IF EXISTS "games_winner_id_fkey";
ALTER TABLE "games" ADD CONSTRAINT "games_winner_id_fkey"
  FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL;
