import { describe, expect, it } from "vitest";
import { canManageMemberRoles } from "@/modules/team/permissions";
import { organizationRoles } from "@/lib/organization-access";

describe("política de alteração de papel", () => {
  
  it.each([["admin"], ["member"]])("oculta controles para %s", (role) => {

    expect(canManageMemberRoles(role)).toBe(false);

  });

  it("apresenta controles ao OWNER", () => {

    expect(canManageMemberRoles("owner")).toBe(true);

  });

  it("mantém as permissões comerciais e de equipe do ADMIN", () => {

    expect(organizationRoles.admin.authorize({ team: ["create", "update", "delete"] }).success).toBe(true);
    expect(organizationRoles.admin.authorize({ invitation: ["create", "cancel"] }).success).toBe(true);
    expect(organizationRoles.admin.authorize({ member: ["update"] }).success).toBe(true);

  });
});
