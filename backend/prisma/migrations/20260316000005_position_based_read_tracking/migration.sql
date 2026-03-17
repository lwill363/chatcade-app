ALTER TABLE "channel_members"
  ADD COLUMN "last_read_message_id" UUID REFERENCES "messages"("id");

ALTER TABLE "channel_members"
  DROP COLUMN "last_read_at";
