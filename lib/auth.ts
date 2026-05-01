import { SignJWT, jwtVerify } from "jose"

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-change-me")

export interface SessionPayload {
  id: string
  username: string
  full_name?: string
  role: string
}

export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      id: payload.id as string,
      username: payload.username as string,
      full_name: payload.full_name as string | undefined,
      role: payload.role as string,
    }
  } catch {
    return null
  }
}
