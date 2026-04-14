/**
 * TEMPORARY debug endpoint — delete after fixing admin redirect.
 * Returns what the server sees: cookies, parsed email, admin list.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map((c) => ({
    name: c.name,
    valueLength: c.value.length,
    valuePreview: c.value.slice(0, 50) + "...",
  }));

  const authCookie = cookieStore
    .getAll()
    .find(
      (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
    );

  let parsedEmail: string | null = null;
  let parseError: string | null = null;
  let rawPreview: string | null = null;

  if (authCookie?.value) {
    try {
      let raw = authCookie.value;
      rawPreview = raw.slice(0, 80) + "...";
      try { raw = decodeURIComponent(raw); } catch {}
      if (raw.startsWith("base64-")) {
        raw = Buffer.from(raw.slice(7), "base64").toString("utf8");
      }
      const session = JSON.parse(raw);
      const token = session?.access_token;
      if (token) {
        const payload = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString("utf8")
        );
        parsedEmail = payload?.email ?? "NO EMAIL IN JWT";
      } else {
        parseError = "No access_token in session object. Keys: " + Object.keys(session).join(", ");
      }
    } catch (e) {
      parseError = String(e);
    }
  }

  const adminEmailsRaw = process.env.PLATFORM_ADMIN_EMAILS ?? "NOT SET";
  const adminEmails = adminEmailsRaw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const isMatch = parsedEmail
    ? adminEmails.includes(parsedEmail.trim().toLowerCase())
    : false;

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookies: allCookies,
    authCookieFound: !!authCookie,
    authCookieName: authCookie?.name ?? null,
    rawPreview,
    parsedEmail,
    parseError,
    adminEmailsEnv: adminEmailsRaw,
    adminEmailsList: adminEmails,
    isMatch,
  });
}
