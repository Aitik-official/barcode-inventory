import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getDefaultPermissionsForRole, RoleType } from "@/lib/permissions";

/**
 * GET /api/users
 * Lists all portal users with masked passwords
 */
export async function GET() {
  try {
    // Check if any users exist; if not, seed default super admins
    const count = await prisma.user.count();
    if (count === 0) {
      await seedInitialSuperAdmins();
    }

    const users = await prisma.user.findMany({
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

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Create a new user (Super Admin, Admin, Staff, Accountant, or Custom)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role, isSuperAdmin, department, phone, permissions } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A user with email '${cleanEmail}' already exists` },
        { status: 400 }
      );
    }

    const assignedRole: RoleType = isSuperAdmin ? "SUPER_ADMIN" : (role || "STAFF");
    const isSuper = assignedRole === "SUPER_ADMIN" || !!isSuperAdmin;

    const assignedPermissions =
      permissions && Array.isArray(permissions) && permissions.length > 0
        ? permissions
        : getDefaultPermissionsForRole(assignedRole);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashPassword(password),
        role: assignedRole,
        isSuperAdmin: isSuper,
        status: "ACTIVE",
        department: department || (isSuper ? "Executive" : "Operations"),
        phone: phone || null,
        permissions: assignedPermissions,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        status: true,
        department: true,
        phone: true,
        permissions: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `User '${newUser.name}' created successfully with ${assignedRole} access.`,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/users
 * Update user details, role, permissions, status, or password
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, email, password, role, isSuperAdmin, status, department, phone, permissions } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (department !== undefined) updateData.department = department;
    if (phone !== undefined) updateData.phone = phone;
    if (status) updateData.status = status;

    if (role) {
      updateData.role = role;
      updateData.isSuperAdmin = role === "SUPER_ADMIN" || !!isSuperAdmin;
    } else if (isSuperAdmin !== undefined) {
      updateData.isSuperAdmin = isSuperAdmin;
      if (isSuperAdmin) updateData.role = "SUPER_ADMIN";
    }

    if (permissions && Array.isArray(permissions)) {
      updateData.permissions = permissions;
    }

    if (password && password.trim().length > 0) {
      updateData.password = hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        status: true,
        department: true,
        phone: true,
        permissions: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updated,
      message: `User '${updated.name}' updated successfully.`,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/users
 * Delete user (prevents deleting last super admin)
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Safety check: Don't allow deleting if it is the only super admin
    if (user.isSuperAdmin) {
      const superAdminCount = await prisma.user.count({
        where: { isSuperAdmin: true },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, error: "Cannot delete the only remaining Super Admin account." },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `User '${user.name}' deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Auto-seeds 2 Super Admin accounts and default staff if DB is empty
 */
async function seedInitialSuperAdmins() {
  const superAdminPerms = getDefaultPermissionsForRole("SUPER_ADMIN");
  const staffPerms = getDefaultPermissionsForRole("STAFF");

  // 1. Primary Super Admin
  await prisma.user.create({
    data: {
      name: "Primary Super Admin",
      email: "admin@gmail.com",
      password: hashPassword("Admin@123"),
      role: "SUPER_ADMIN",
      isSuperAdmin: true,
      status: "ACTIVE",
      department: "Executive Management",
      phone: "+91 98200 11223",
      permissions: superAdminPerms,
    },
  });

  // 2. Secondary Full-Access Super Admin (as requested by user)
  await prisma.user.create({
    data: {
      name: "Secondary Super Admin",
      email: "superadmin2@stealthsight.com",
      password: hashPassword("SuperAdmin@2026"),
      role: "SUPER_ADMIN",
      isSuperAdmin: true,
      status: "ACTIVE",
      department: "Executive Partner",
      phone: "+91 98111 22334",
      permissions: superAdminPerms,
    },
  });

  // 3. Warehouse Staff Member
  await prisma.user.create({
    data: {
      name: "Warehouse Dispatch Scanner",
      email: "operator@stealthsight.com",
      password: hashPassword("Operator@123"),
      role: "STAFF",
      isSuperAdmin: false,
      status: "ACTIVE",
      department: "Warehouse Operations",
      phone: "+91 98777 66554",
      permissions: staffPerms,
    },
  });
}
