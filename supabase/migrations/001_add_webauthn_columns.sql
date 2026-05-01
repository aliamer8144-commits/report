-- WebAuthn (Fingerprint/Biometric) Authentication Support
-- Add columns to store WebAuthn credentials in the users table
-- Run this in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS webauthn_credential_id TEXT,
ADD COLUMN IF NOT EXISTS webauthn_public_key TEXT,
ADD COLUMN IF NOT EXISTS webauthn_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS webauthn_transports TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.webauthn_credential_id IS 'Base64URL-encoded WebAuthn credential ID for biometric login';
COMMENT ON COLUMN users.webauthn_public_key IS 'Base64URL-encoded COSE public key from WebAuthn registration';
COMMENT ON COLUMN users.webauthn_counter IS 'WebAuthn signature counter for replay attack protection';
COMMENT ON COLUMN users.webauthn_transports IS 'JSON array of transports used (e.g. ["internal"])';
