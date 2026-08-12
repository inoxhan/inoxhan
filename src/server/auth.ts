import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface PanelSession {
  adminId?: string;
  username?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? "dev-secret-en-az-32-karakter-olmali!!",
  cookieName: "inoxhan_panel",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession(): Promise<IronSession<PanelSession>> {
  return getIronSession<PanelSession>(await cookies(), sessionOptions);
}

/** Panel sayfaları için koruma — oturum yoksa girişe yönlendirir. */
export async function requireAdmin(): Promise<PanelSession> {
  const session = await getSession();
  if (!session.adminId) redirect("/panel/giris");
  return { adminId: session.adminId, username: session.username };
}

/** Server action / route handler koruması — yönlendirme yerine hata fırlatır. */
export async function requireAdminOrThrow(): Promise<PanelSession> {
  const session = await getSession();
  if (!session.adminId) throw new Error("Yetkisiz erişim");
  return { adminId: session.adminId, username: session.username };
}
