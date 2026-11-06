import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  role: "owner",
  rows: [] as Array<Record<string, unknown> | undefined>,
  updateMemberRoleWithAudit: vi.fn(),
  insert: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: state.revalidatePath }));
vi.mock("@/lib/workspace", () => ({
  requireWorkspaceRole: async (roles: string[]) => {
    if (!roles.includes(state.role)) throw new Error("Você não tem permissão para realizar esta ação.");
    return { user: { id: "actor" }, organization: { id: "org" }, role: state.role };
  },
}));
vi.mock("@/modules/team/member-role-service", () => ({ updateMemberRoleWithAudit: state.updateMemberRoleWithAudit }));
vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: async () => state.rows.splice(0, 1) }) }) }),
    insert: state.insert,
  }),
}));

import { updateMemberRole } from "@/modules/team/actions";

describe("Server Action updateMemberRole", () => {

  beforeEach(() => {
    state.role = "owner";
    state.rows = [];
    state.updateMemberRoleWithAudit.mockReset().mockResolvedValue(undefined);
    state.insert.mockReset().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    state.revalidatePath.mockReset();
  });

  it.each(["admin", "member"])("nega %s sem alterar nem auditar", async (role) => {

    state.role = role;

    await expect(updateMemberRole("target", "admin")).rejects.toThrow(/permissão/);

    expect(state.updateMemberRoleWithAudit).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();

  });

  it("permite OWNER alterar outro membro", async () => {
    
    state.rows.push({ id: "target", role: "member", userId: "other" });

    await updateMemberRole("target", "admin");

    expect(state.updateMemberRoleWithAudit).toHaveBeenCalledWith({
      organizationId: "org",
      actorUserId: "actor",
      memberId: "target",
      role: "admin",
    });

    expect(state.insert).not.toHaveBeenCalled();

  });

  it("nega alteração da própria função e protege OWNER", async () => {

    state.rows.push({ id: "target", role: "member", userId: "actor" });

    await expect(updateMemberRole("target", "admin")).rejects.toThrow(/próprio papel/);

    expect(state.updateMemberRoleWithAudit).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();

    state.rows.push({ id: "target", role: "owner", userId: "other" });

    await expect(updateMemberRole("target", "member")).rejects.toThrow(/OWNER/);

    expect(state.updateMemberRoleWithAudit).not.toHaveBeenCalled();
    expect(state.insert).not.toHaveBeenCalled();

  });
});
