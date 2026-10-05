// Session Duration: 12 Hours (Auto ends after 12 hrs)
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 43,200 seconds
export const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000; // 43,200,000 ms

export const ZAA_COOKIE = "zaa_admin";
export const ZAA_COOKIE_VALUE = "ok";

export interface SessionTokenPayload {
  userId: string;
  email: string;
  role: string;
  loginAt: number;
  expiresAt: number;
}

export function encodeSessionToken(payload: {
  userId: string;
  email: string;
  role: string;
}): string {
  const now = Date.now();
  const fullPayload: SessionTokenPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    loginAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
  };
  const jsonStr = JSON.stringify(fullPayload);
  return Buffer.from(jsonStr, "utf8").toString("base64url");
}

export function decodeAndValidateSessionToken(
  token: string | undefined | null
): SessionTokenPayload | null {
  if (!token) return null;
  if (token === ZAA_COOKIE_VALUE) {
    return {
      userId: "admin",
      email: "admin@gmail.com",
      role: "SUPER_ADMIN",
      loginAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE_MS,
    };
  }

  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as SessionTokenPayload;
    if (!parsed || !parsed.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
