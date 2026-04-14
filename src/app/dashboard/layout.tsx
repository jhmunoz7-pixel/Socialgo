import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export const dynamic = "force-dynamic";

/**
 * Get the logged-in user's email by decoding the JWT from the Supabase
 * auth cookie directly — no Supabase client needed.
 */
async function getEmailFromCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore
      .getAll()
      .find(
        (c) =>
          c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
      );
    if (!authCookie?.value) return null;

    let raw = authCookie.value;
    try {
      raw = decodeURIComponent(raw);
    } catch {}
    if (raw.startsWith("base64-")) {
      raw = Buffer.from(raw.slice(7), "base64").toString("utf8");
    }
    const session = JSON.parse(raw);
    const token: string | undefined = session?.access_token;
    if (!token) return null;

    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString("utf8")
    );
    return payload?.email ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isImpersonating = cookieStore.get("x-impersonate-org")?.value;

  if (!isImpersonating) {
    const email = await getEmailFromCookie();
    if (email) {
      const adminEmails = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (adminEmails.includes(email.trim().toLowerCase())) {
        redirect("/platform");
      }
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
