CREATE TABLE "websocket_connections" (
  "connection_id"      TEXT        NOT NULL,
  "user_id"            UUID        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "connected_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "last_heartbeat_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "websocket_connections_pkey" PRIMARY KEY ("connection_id")
);

CREATE INDEX "websocket_connections_user_id_idx" ON "websocket_connections"("user_id");
