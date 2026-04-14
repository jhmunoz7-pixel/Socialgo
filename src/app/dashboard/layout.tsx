import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { checkPlatformAdmin } from "@/lib/platform-admin";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Platform admin auto-redirect: if admin lands on /dashboard without
  // impersonation cookie, send them to /platform server-side.
  const cookieStore = await cookies();
  const isImpersonating = cookieStore.get("x-impersonate-org")?.value;

  if (!isImpersonating) {
    const { isAdmin } = await checkPlatformAdmin();
    if (isAdmin) {
      redirect("/platform");
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
