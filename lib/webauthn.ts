import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server"
import type {
  Base64URLString,
  WebAuthnCredential,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server"

// ─── Configuration ────────────────────────────────────────────────

/**
 * RP (Relying Party) ID — the domain without protocol/port
 * Configurable via WEBAUTHN_RP_ID env var
 */
export function getRpID(): string {
  return process.env.WEBAUTHN_RP_ID || "localhost"
}

/**
 * Origin — the full URL origin (protocol + host)
 * Configurable via WEBAUTHN_ORIGIN env var
 */
export function getOrigin(): string {
  return process.env.WEBAUTHN_ORIGIN || "http://localhost:3000"
}

/** Human-readable RP name */
const RP_NAME = "تطبيق التقارير"

// ─── Challenge Storage (in-memory, auto-expiring) ─────────────────

interface ChallengeEntry {
  challenge: string
  expiresAt: number
}

/** Map of challenge ID → challenge data */
const challengeStore = new Map<string, ChallengeEntry>()

/** Challenge TTL: 5 minutes */
const CHALLENGE_TTL_MS = 5 * 60 * 1000

/** Cleanup interval: every 10 minutes */
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000

// Periodically clean expired challenges
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of challengeStore) {
      if (entry.expiresAt < now) {
        challengeStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)
}

/**
 * Store a challenge and return its ID
 */
export function storeChallenge(challenge: string): string {
  const id = crypto.randomUUID()
  challengeStore.set(id, {
    challenge,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  })
  return id
}

/**
 * Retrieve and delete a challenge by ID
 * Returns null if expired or not found
 */
export function consumeChallenge(id: string): string | null {
  const entry = challengeStore.get(id)
  if (!entry) return null
  challengeStore.delete(id)
  if (entry.expiresAt < Date.now()) return null
  return entry.challenge
}

// ─── Encoding Helpers ─────────────────────────────────────────────

/**
 * Convert a Uint8Array (or Buffer) to Base64URL string
 */
export function bufferToBase64URL(buffer: Uint8Array | ArrayBuffer): Base64URLString {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ""
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Convert a Base64URL string to Uint8Array
 */
export function base64URLToBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─── Registration ─────────────────────────────────────────────────

/**
 * Generate WebAuthn registration options for a user
 * Used when a logged-in user wants to register their fingerprint
 */
export async function generateRegOptions(userId: string, username: string) {
  // Check if user already has a credential
  const existingCredentialId = await getStoredCredentialId(userId)

  const excludeCredentials: { id: Base64URLString; transports?: AuthenticatorTransportFuture[] }[] = []
  if (existingCredentialId) {
    excludeCredentials.push({
      id: existingCredentialId,
      transports: ["internal"],
    })
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(),
    userName: username,
    userID: new TextEncoder().encode(userId),
    userDisplayName: username,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    excludeCredentials,
  })

  // Store the challenge
  const challengeId = storeChallenge(options.challenge)

  return { options, challengeId }
}

/**
 * Verify a WebAuthn registration response
 * Returns the credential data to store in the database
 */
export async function verifyReg(
  challengeId: string,
  response: RegistrationResponseJSON,
  transports?: string[]
) {
  const expectedChallenge = consumeChallenge(challengeId)
  if (!expectedChallenge) {
    throw new Error("Challenge expired or invalid")
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpID(),
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed")
  }

  const { credential } = verification.registrationInfo

  const storedTransports = transports || credential.transports || []

  return {
    credentialID: credential.id as Base64URLString,
    credentialPublicKey: bufferToBase64URL(credential.publicKey as unknown as Uint8Array),
    counter: credential.counter,
    transports: JSON.stringify(storedTransports),
  }
}

// ─── Authentication ───────────────────────────────────────────────

/**
 * Generate WebAuthn authentication options for a user
 * Used during login with fingerprint
 */
export async function generateAuthOptions(credentialId: Base64URLString, transports?: string[]) {
  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    allowCredentials: [
      {
        id: credentialId,
        transports: (transports || ["internal"]) as ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[],
      },
    ],
    userVerification: "required",
  })

  // Store the challenge
  const challengeId = storeChallenge(options.challenge)

  return { options, challengeId }
}

/**
 * Verify a WebAuthn authentication response
 * Returns the new counter value
 */
export async function verifyAuth(
  challengeId: string,
  response: AuthenticationResponseJSON,
  storedCredential: {
    id: Base64URLString
    publicKey: string
    counter: number
    transports?: string | null
  }
) {
  const expectedChallenge = consumeChallenge(challengeId)
  if (!expectedChallenge) {
    throw new Error("Challenge expired or invalid")
  }

  // Reconstruct the WebAuthnCredential
  const credential: WebAuthnCredential = {
    id: storedCredential.id,
    publicKey: base64URLToBuffer(storedCredential.publicKey) as unknown as WebAuthnCredential["publicKey"],
    counter: storedCredential.counter,
    transports: storedCredential.transports
      ? JSON.parse(storedCredential.transports) as AuthenticatorTransportFuture[]
      : undefined,
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpID(),
    credential,
    requireUserVerification: true,
  })

  if (!verification.verified) {
    throw new Error("Authentication verification failed")
  }

  return {
    newCounter: verification.authenticationInfo.newCounter,
  }
}

// ─── Database Helpers ─────────────────────────────────────────────

import { createServerSupabaseClient } from "@/lib/supabase"

/**
 * Get the stored credential ID for a user (if they have registered a fingerprint)
 */
export async function getStoredCredentialId(userId: string): Promise<Base64URLString | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("users")
    .select("webauthn_credential_id")
    .eq("id", userId)
    .single()

  if (error || !data?.webauthn_credential_id) return null
  return data.webauthn_credential_id as Base64URLString
}

/**
 * Get the full stored credential for a user
 */
export async function getStoredCredential(
  userId: string
): Promise<{
  id: Base64URLString
  publicKey: string
  counter: number
  transports: string | null
} | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("users")
    .select(
      "webauthn_credential_id, webauthn_public_key, webauthn_counter, webauthn_transports"
    )
    .eq("id", userId)
    .single()

  if (
    error ||
    !data?.webauthn_credential_id ||
    !data?.webauthn_public_key
  ) {
    return null
  }

  return {
    id: data.webauthn_credential_id as Base64URLString,
    publicKey: data.webauthn_public_key,
    counter: data.webauthn_counter || 0,
    transports: data.webauthn_transports,
  }
}

/**
 * Save WebAuthn credential to the users table
 */
export async function saveCredential(
  userId: string,
  credential: {
    credentialID: string
    credentialPublicKey: string
    counter: number
    transports: string
  }
) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("users")
    .update({
      webauthn_credential_id: credential.credentialID,
      webauthn_public_key: credential.credentialPublicKey,
      webauthn_counter: credential.counter,
      webauthn_transports: credential.transports,
    })
    .eq("id", userId)

  if (error) {
    throw new Error("Failed to save WebAuthn credential: " + error.message)
  }
}

/**
 * Remove WebAuthn credential from the users table
 */
export async function removeCredential(userId: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("users")
    .update({
      webauthn_credential_id: null,
      webauthn_public_key: null,
      webauthn_counter: 0,
      webauthn_transports: null,
    })
    .eq("id", userId)

  if (error) {
    throw new Error("Failed to remove WebAuthn credential: " + error.message)
  }
}

/**
 * Update the counter after successful authentication
 */
export async function updateCounter(userId: string, newCounter: number) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from("users")
    .update({ webauthn_counter: newCounter })
    .eq("id", userId)

  if (error) {
    throw new Error("Failed to update WebAuthn counter: " + error.message)
  }
}
