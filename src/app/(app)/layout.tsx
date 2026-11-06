import { AppShell } from "@/components/shell/app-shell";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getWorkspaceContext();
  return <AppShell user={context.user} organization={context.organization} role={context.role}>{children}</AppShell>;
}
