-- Migration: Add phone and address columns to users table
-- Date: 2025-11-11

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.address IS 'User address';
