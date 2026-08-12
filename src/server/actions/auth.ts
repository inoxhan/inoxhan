"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";
import { db } from "@/server/db";
import { verifyPassword } from "@/server/password";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Kullanıcı adı ve şifre gerekli" };
  }

  const user = await db.adminUser.findUnique({ where: { username } });
  // Kullanıcı yoksa da şifre doğrulaması kadar bekle (timing farkını azalt)
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return { error: "Kullanıcı adı veya şifre hatalı" };
  }

  const session = await getSession();
  session.adminId = user.id;
  session.username = user.username;
  await session.save();
  redirect("/panel");
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/panel/giris");
}
