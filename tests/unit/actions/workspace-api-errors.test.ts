import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveWorkspaceSelection,
  WorkspaceAuthenticationError,
  WorkspaceAuthorizationError,
  WorkspaceSelectionRequiredError,
  workspaceApiErrorResponse,
} from "@/lib/workspace";

const membershipA = {
  organizationId: "org-a",
  organizationName: "Workspace A",
  role: "owner"
};
const membershipB = {
  organizationId: "org-b",
  organizationName: "Workspace B",
  role: "member"
};

describe("respostas HTTP seguras para erros do workspace", () => {
  
  afterEach(() => vi.restoreAllMocks());

  it("mapeia autenticação ausente para 401 e impede cache", async () => {

    const response = workspaceApiErrorResponse(new WorkspaceAuthenticationError());

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ message: "Autenticação necessária." });

  });

  it("mapeia papel insuficiente para 403 e impede cache", async () => {

    const response = workspaceApiErrorResponse(new WorkspaceAuthorizationError());

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ message: "Você não tem permissão para realizar esta ação." });

  });

  it("distingue seleção ausente e ID ativo explicitamente inválido", () => {

    expect(resolveWorkspaceSelection(null, [membershipA])).toEqual({ kind: "unambiguous", membership: membershipA });
    expect(resolveWorkspaceSelection(undefined, [membershipA, membershipB])).toEqual({ kind: "choose", reason: "required" });
    expect(resolveWorkspaceSelection("org-a", [membershipA, membershipB])).toEqual({ kind: "selected", membership: membershipA });
    expect(resolveWorkspaceSelection("org-c", [membershipA, membershipB])).toEqual({ kind: "choose", reason: "invalid" });
    expect(resolveWorkspaceSelection("org-b", [membershipA])).toEqual({ kind: "choose", reason: "invalid" });
    expect(resolveWorkspaceSelection(null, [])).toEqual({ kind: "empty" });
    expect(resolveWorkspaceSelection("stale-org", [])).toEqual({ kind: "empty" });
    
  });

  it("mapeia contexto ausente ou inválido para seleção explícita sem cache", async () => {

    const response = workspaceApiErrorResponse(new WorkspaceSelectionRequiredError("invalid"));

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      code: "WORKSPACE_SELECTION_REQUIRED",
      message: "Selecione novamente o workspace antes de continuar.",
      selectionUrl: "/workspace/select",
    });

  });

  it("mantém erros inesperados como 500 sem incluir detalhes sensíveis", async () => {

    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = workspaceApiErrorResponse(new Error("postgres://secret@internal/db"));

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("private, no-store");

    const body = await response.text();

    expect(body).toBe(JSON.stringify({
      message: "Erro interno."
    }));
    expect(body).not.toContain("secret");
    expect(log).toHaveBeenCalledOnce();

  });
});
