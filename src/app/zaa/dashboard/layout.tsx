import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ZaaSidebar } from "@/components/ZaaSidebar";
import { ZAA_COOKIE, ZAA_COOKIE_VALUE } from "@/lib/zaa";

export default async function ZaaDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  if (jar.get(ZAA_COOKIE)?.value !== ZAA_COOKIE_VALUE) {
    redirect("/zaa/login");
  }

  return (
    <div className="flex">
      <ZaaSidebar />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
