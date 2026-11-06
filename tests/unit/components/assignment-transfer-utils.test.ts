import { describe, expect, it } from "vitest";
import type { MemberAssignmentSummary } from "@/modules/team/actions";
import { findAssignmentSource, getTransferPreview, isValidAssignmentTransfer } from "@/components/team/assignment-transfer-utils";

const members: MemberAssignmentSummary[] = [
  {
    memberId: "member-a",
    userId: "user-a",
    name: "Ana",
    email: "ana@example.test",
    role: "member",
    clients: { active: 2, archived: 1 },
    deals: { active: 1, archived: 0 },
    tasks: { active: 3, archived: 2 },
    total: { active: 6, archived: 3, all: 9 },
  },
  {
    memberId: "member-b",
    userId: "user-b",
    name: "Bia",
    email: "bia@example.test",
    role: "admin",
    clients: { active: 0, archived: 0 },
    deals: { active: 0, archived: 0 },
    tasks: { active: 0, archived: 0 },
    total: { active: 0, archived: 0, all: 0 },
  },
];

describe("prévia e seleção de transferência de responsabilidades", () => {
  
  it("calcula contagens de ativos, arquivados e total para as três entidades", () => {
    
    expect(getTransferPreview(members[0])).toEqual({ clients: 3, deals: 1, tasks: 5, active: 6, archived: 3, total: 9 });
    
  });

  it("encontra a origem apenas entre os membros recebidos do workspace", () => {

    expect(findAssignmentSource(members, "user-a")?.name).toBe("Ana");
    expect(findAssignmentSource(members, "outside-user")).toBeUndefined();

  });

  it("permite membro do workspace ou desatribuição como destino", () => {

    expect(isValidAssignmentTransfer("user-a", "user-b", members)).toBe(true);
    expect(isValidAssignmentTransfer("user-a", "__unassigned__", members)).toBe(true);

  });

  it("rejeita origem igual ao destino, seleção incompleta e usuários fora da lista", () => {

    expect(isValidAssignmentTransfer("user-a", "user-a", members)).toBe(false);
    expect(isValidAssignmentTransfer("", "user-b", members)).toBe(false);
    expect(isValidAssignmentTransfer("user-a", "outside-user", members)).toBe(false);

  });
});
