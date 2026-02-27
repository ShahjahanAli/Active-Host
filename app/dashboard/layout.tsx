import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardProvider } from "./dashboard-context";
import { DashboardShell } from "./shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
