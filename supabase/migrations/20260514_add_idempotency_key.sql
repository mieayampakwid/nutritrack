-- Add idempotency key to food_logs to prevent double-entry on network retry
ALTER TABLE food_logs
ADD COLUMN IF NOT EXISTS idempotency_key uuid;

-- Unique per user so retry hits the same row
CREATE UNIQUE INDEX IF NOT EXISTS food_logs_user_idempotency_idx
ON food_logs (user_id, idempotency_key);
