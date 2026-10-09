import { prisma } from "@/lib/prisma";
import PartnersClient from "./PartnersClient";

export const revalidate = 0;

export default async function PartnersPage() {
  let customers: any[] = [];
  let suppliers: any[] = [];

  try {
    const results = await Promise.allSettled([
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    ]);

    if (results[0].status === "fulfilled") customers = results[0].value || [];
    if (results[1].status === "fulfilled") suppliers = results[1].value || [];
  } catch (err) {
    console.error("Error loading partners page data:", err);
  }

  return <PartnersClient customers={customers} suppliers={suppliers} />;
}
