import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getDefaultPermissionsForRole } from "@/lib/permissions";

export async function POST() {
  try {
    const superAdminPerms = getDefaultPermissionsForRole("SUPER_ADMIN");
    const adminPerms = getDefaultPermissionsForRole("ADMIN");
    const staffPerms = getDefaultPermissionsForRole("STAFF");
    const accountantPerms = getDefaultPermissionsForRole("ACCOUNTANT");

    // 1. Primary Super Admin
    await prisma.user.upsert({
      where: { email: "admin@gmail.com" },
      update: {
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
        status: "ACTIVE",
        permissions: superAdminPerms,
      },
      create: {
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

    // 2. Secondary Super Admin
    await prisma.user.upsert({
      where: { email: "superadmin2@stealthsight.com" },
      update: {
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
        status: "ACTIVE",
        permissions: superAdminPerms,
      },
      create: {
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

    // 3. Operations Manager
    await prisma.user.upsert({
      where: { email: "manager@stealthsight.com" },
      update: {
        role: "ADMIN",
        isSuperAdmin: false,
        status: "ACTIVE",
        permissions: adminPerms,
      },
      create: {
        name: "Operations Manager",
        email: "manager@stealthsight.com",
        password: hashPassword("Manager@123"),
        role: "ADMIN",
        isSuperAdmin: false,
        status: "ACTIVE",
        department: "Inventory Operations",
        phone: "+91 98333 44556",
        permissions: adminPerms,
      },
    });

    // 4. Warehouse Dispatch Staff
    await prisma.user.upsert({
      where: { email: "operator@stealthsight.com" },
      update: {
        role: "STAFF",
        isSuperAdmin: false,
        status: "ACTIVE",
        permissions: staffPerms,
      },
      create: {
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

    return NextResponse.json({
      success: true,
      message: "Default Super Admin accounts and role templates synchronized successfully!",
    });
  } catch (error: any) {
    console.error("Error seeding default users:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
