import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/panel/LoginForm";
import { getSession } from "@/server/auth";

export const metadata: Metadata = {
  title: "Panel Girişi",
  robots: { index: false, follow: false },
};

export default async function GirisPage() {
  const session = await getSession();
  if (session.adminId) redirect("/panel");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-steel-200 bg-white p-8 shadow-elevated">
        <p className="font-display text-center text-xl font-bold tracking-wide text-steel-900">
          İNOX<span className="text-steel-400">HAN</span>
        </p>
        <p className="mt-1 text-center text-sm text-steel-500">Yönetim Paneli</p>
        <LoginForm />
      </div>
    </div>
  );
}
