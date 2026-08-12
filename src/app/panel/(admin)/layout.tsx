import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Package,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/panel/LogoutButton";
import { requireAdmin } from "@/server/auth";
import { db } from "@/server/db";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/panel", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/panel/teklifler", label: "Teklifler", icon: Inbox },
  { href: "/panel/musteriler", label: "Müşteriler", icon: Users },
  { href: "/panel/urunler", label: "Ürünler", icon: Package },
  { href: "/panel/kategoriler", label: "Kategoriler", icon: FolderTree },
  { href: "/panel/katalog", label: "Katalog", icon: BookOpen },
  { href: "/panel/istatistikler", label: "İstatistikler", icon: BarChart3 },
] as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const newCount = await db.quoteRequest.count({ where: { status: "YENI" } });

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-[1440px]">
      <aside className="hidden w-60 shrink-0 border-r border-steel-200 bg-white md:block">
        <div className="sticky top-16 p-4">
          <p className="px-3 pt-2 pb-4 text-xs tracking-wider text-steel-400 uppercase">
            Yönetim · {session.username}
          </p>
          <nav className="space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-steel-600 transition-colors hover:bg-steel-100 hover:text-steel-900"
              >
                <item.icon className="size-4.5 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.href === "/panel/teklifler" && newCount > 0 && (
                  <span className="rounded-full bg-status-new px-2 py-0.5 text-xs font-semibold text-white">
                    {newCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-steel-100 pt-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 bg-steel-50 px-4 py-8 md:px-8">
        {/* Mobil panel nav */}
        <nav className="mb-6 flex gap-2 overflow-x-auto md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full border border-steel-200 bg-white px-4 py-1.5 text-sm text-steel-600"
            >
              {item.label}
              {item.href === "/panel/teklifler" && newCount > 0 ? ` (${newCount})` : ""}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
