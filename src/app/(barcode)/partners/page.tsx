import { prisma } from "@/lib/prisma";
import PartnersClient from "./PartnersClient";

export const revalidate = 0;

export default async function PartnersPage() {
  const [customers, suppliers] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <PartnersClient customers={customers} suppliers={suppliers} />;
}
