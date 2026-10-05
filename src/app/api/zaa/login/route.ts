import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/permissions";
import {
  ZAA_ADMIN_PASS,
  ZAA_ADMIN_USER,
  ZAA_ADMIN_ALT_PASS,
  ZAA_ADMIN_ALT_USER,
} from "@/lib/zaa";
import {
  ZAA_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_MAX_AGE_MS,
  encodeSessionToken,
} from "@/lib/authSession";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { username?: string; password?: string }
      | null;

    const u = body?.username?.trim().toLowerCase();
    const p = body?.password;

    if (!u || !p) {
      return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
    }

    let authenticatedUser: any = null;

    // 1. Check in MongoDB User collection
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email: u },
      });

      if (dbUser) {
        if (dbUser.status === "SUSPENDED" || dbUser.status === "INACTIVE") {
          return NextResponse.json({ error: "This user account has been suspended or deactivated. Contact your Super Admin." }, { status: 403 });
        }

        const isPasswordValid = verifyPassword(p, dbUser.password);
        if (isPasswordValid) {
          authenticatedUser = dbUser;
          // Update last login
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { lastLoginAt: new Date() },
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB user check fallback to static config:", dbErr);
    }

    // 2. Fallback to static primary & secondary super admin credentials
    if (!authenticatedUser) {
      const isStaticPrimary = u === ZAA_ADMIN_USER.toLowerCase() && p === ZAA_ADMIN_PASS;
      const isStaticAlt = u === ZAA_ADMIN_ALT_USER.toLowerCase() && p === ZAA_ADMIN_ALT_PASS;
      const isSuperAdmin2 = u === "superadmin2@stealthsight.com" && p === "SuperAdmin@2026";

      if (isStaticPrimary || isStaticAlt || isSuperAdmin2) {
        authenticatedUser = {
          name: isSuperAdmin2 ? "Secondary Super Admin" : "Primary Super Admin",
          email: u,
          role: "SUPER_ADMIN",
          isSuperAdmin: true,
          permissions: ["ALL"],
        };
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json({ error: "Invalid email/username or password." }, { status: 401 });
    }

    const now = Date.now();
    const expiresAt = now + SESSION_MAX_AGE_MS;

    const sessionCookieValue = encodeSessionToken({
      userId: authenticatedUser.id || "admin",
      email: authenticatedUser.email,
      role: authenticatedUser.role,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: authenticatedUser.id || "admin",
        name: authenticatedUser.name,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        isSuperAdmin: authenticatedUser.isSuperAdmin,
        permissions: authenticatedUser.permissions,
        loginAt: now,
        expiresAt: expiresAt,
      },
    });

    res.cookies.set(ZAA_COOKIE, sessionCookieValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS, // Exactly 12 hours (43,200 seconds)
    });

    return res;
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: error.message || "Login authentication failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ZAA_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
