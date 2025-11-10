-- Add lastActiveAt column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP NULL;

-- Create index for better performance when querying online users
CREATE INDEX IF NOT EXISTS idx_users_last_active_at ON users(last_active_at);

-- Optional: Set current timestamp for existing users
UPDATE users 
SET last_active_at = last_login 
WHERE last_login IS NOT NULL AND last_active_at IS NULL;
