import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  actorRole: "admin",
  rows: [] as Array<Record<string, unknown> | undefined>,
  delegated: vi.fn(),
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({
    GET: vi.fn(),
    POST: state.delegated
  }),
}));

vi.mock("@/lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: async () => ({
        user: {
          id: "actor" },
          session: {
            activeOrganizationId: "org"
          }
        })
      }
    }),
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => state.rows.splice(0, 1)
        })
      })
    }),
  }),
}));

import { POST } from "@/app/api/auth/[...all]/route";

const makeRequest = () => new Request("http://localhost:3000/api/auth/organization/update-member-role", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ organizationId: "org", memberId: "target", role: "admin" }),
});

describe("endpoint direto de alteração de papel", () => {

  beforeEach(() => {
    state.actorRole = "admin";
    state.rows = [];
    state.delegated.mockReset().mockResolvedValue(Response.json({ ok: true }));
  });

  it("responde 403 ao ADMIN", async () => {

    state.rows.push({ role: "admin" });

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(state.delegated).not.toHaveBeenCalled();

  });

  it("encaminha a solicitação autorizada do OWNER ao endpoint Better Auth", async () => {

    state.rows.push({ role: "owner" }, { role: "member", userId: "another-user" });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(state.delegated).toHaveBeenCalledOnce();

  });

});
