"use client";

import { Loader2, LogIn } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { login, type LoginState } from "@/server/actions/auth";

const inputClass =
  "h-11 w-full rounded-md border border-steel-200 bg-white px-3.5 text-[15px] text-steel-900 focus:border-steel-500 focus:outline-none";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-steel-700">Kullanıcı Adı</span>
        <input name="username" autoComplete="username" required className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-steel-700">Şifre</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </label>
      {state.error && <p className="text-sm text-status-overdue">{state.error}</p>}
      <Button type="submit" variant="dark" size="md" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
        Giriş Yap
      </Button>
    </form>
  );
}
