import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";
import { ALL_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  let users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isSuperAdmin: true,
      status: true,
      phone: true,
      department: true,
      permissions: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // If no users exist, auto-seed defaults
  if (users.length === 0) {
    try {
      const res = await fetch("http://localhost:3000/api/users/seed-defaults", { method: "POST" });
      if (res.ok) {
        users = await prisma.user.findMany({
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isSuperAdmin: true,
            status: true,
            phone: true,
            department: true,
            permissions: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }
    } catch {
      // Ignore in build
    }
  }

  return <UsersClient initialUsers={users} allPermissions={ALL_PERMISSIONS} />;
}
