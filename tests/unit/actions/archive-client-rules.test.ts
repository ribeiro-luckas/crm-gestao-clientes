import { describe, it, expect } from "vitest";
import { evaluateClientArchivalEligibility } from "@/modules/clients/archive-rules";

describe("Business Rules - Elegibilidade para Arquivamento de Cliente", () => {
  
  it("deve bloquear arquivamento se houver contatos ativos", () => {

    const result = evaluateClientArchivalEligibility({
      activeContacts: 2,
      openDeals: 0,
      pendingTasks: 0,
    });

    expect(result.canArchive).toBe(false);
    expect(result.reason).toContain("contatos ativos");

  });

  it("deve bloquear arquivamento se houver oportunidades em aberto", () => {

    const result = evaluateClientArchivalEligibility({
      activeContacts: 0,
      openDeals: 1,
      pendingTasks: 0,
    });

    expect(result.canArchive).toBe(false);
    expect(result.reason).toContain("oportunidades comerciais em aberto");

  });

  it("deve bloquear arquivamento se houver tarefas pendentes", () => {

    const result = evaluateClientArchivalEligibility({
      activeContacts: 0,
      openDeals: 0,
      pendingTasks: 3,
    });

    expect(result.canArchive).toBe(false);
    expect(result.reason).toContain("tarefas pendentes");

  });

  it("deve permitir arquivamento quando contatos, deals abertos e tarefas pendentes forem zero", () => {

    const result = evaluateClientArchivalEligibility({
      activeContacts: 0,
      openDeals: 0, // deals fechados (won/lost) não contam como abertos
      pendingTasks: 0, // tarefas done/canceled não contam como pendentes
    });

    expect(result.canArchive).toBe(true);
    expect(result.reason).toBeUndefined();

  });
});
