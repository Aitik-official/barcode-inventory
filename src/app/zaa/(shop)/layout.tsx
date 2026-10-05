import { ZaaShopHeader } from "@/components/ZaaShopHeader";

export default function ZaaShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ZaaShopHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
