import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ZAA_COOKIE, decodeAndValidateSessionToken } from "@/lib/authSession";

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get(ZAA_COOKIE);
    const session = decodeAndValidateSessionToken(cookie?.value);

    if (!session) {
      return NextResponse.json({ authenticated: false, message: "Session expired or invalid" }, { status: 401 });
    }

    // Try finding specific user in DB
    if (session.email) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isSuperAdmin: true,
            department: true,
            permissions: true,
            status: true,
          },
        });

        if (dbUser) {
          if (dbUser.status === "SUSPENDED" || dbUser.status === "INACTIVE") {
            return NextResponse.json({ authenticated: false, message: "Account is suspended" }, { status: 403 });
          }

          return NextResponse.json({
            authenticated: true,
            user: {
              ...dbUser,
              loginAt: session.loginAt,
              expiresAt: session.expiresAt,
            },
          });
        }
      } catch {}
    }

    // Fallback for static admin
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId || "admin",
        name: session.email?.includes("superadmin2") ? "Secondary Super Admin" : "Primary Super Admin",
        email: session.email || "admin@gmail.com",
        role: session.role || "SUPER_ADMIN",
        isSuperAdmin: session.role === "SUPER_ADMIN",
        department: "Executive Management",
        permissions: ["ALL"],
        loginAt: session.loginAt,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
