-- Ganti index biasa dengan unique constraint agar nomor percobaan
-- tidak bisa duplikat saat dua request start berjalan bersamaan.
DROP INDEX IF EXISTS "exam_sessions_user_id_tryout_id_attempt_number_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "exam_sessions_user_id_tryout_id_attempt_number_key"
  ON "exam_sessions"("user_id", "tryout_id", "attempt_number");
