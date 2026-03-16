INSERT INTO "roles" ("id", "name", "description")
VALUES
  ('019550a0-0000-7000-8000-000000000001', 'user',  'Default user role'),
  ('019550a0-0000-7000-8000-000000000002', 'admin', 'Administrator role')
ON CONFLICT ("name") DO NOTHING;
