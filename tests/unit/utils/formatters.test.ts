import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, formatDateTime, initials, recifeDateTimeToIso } from "@/lib/utils";

describe("Utils - Formatadores Comerciais e Fuso Horário", () => {

  it("formatCurrency deve formatar valores numéricos em BRL (pt-BR)", () => {

    const formatted = formatCurrency(1250.5);

    // Deve conter R$ e o separador decimal vírgula
    expect(formatted).toContain("R$");
    expect(formatted).toContain("1.250,50");

  });

  it("formatCurrency deve aceitar valores monetários como string sem perda de precisão", () => {

    const formatted = formatCurrency("999999.99");

    expect(formatted).toContain("999.999,99");

  });

  it("initials deve extrair até 2 letras maiúsculas a partir do nome", () => {

    expect(initials("Lucas Ribeiro")).toBe("LR");
    expect(initials("Empresa")).toBe("E");
    expect(initials("Ana Paula Souza")).toBe("AP");
    expect(initials("   ")).toBe("");

  });

  it("formatDate e formatDateTime devem aplicar o fuso de America/Recife", () => {

    // 2026-11-01T03:00:00Z corresponde a 2026-11-01T00:00:00 em America/Recife (UTC-3)
    const utcDate = new Date("2026-11-01T03:00:00.000Z");
    const formatted = formatDate(utcDate, { dateStyle: "short" });

    expect(formatted).toBe("01/11/2026");

    const dateTimeFormatted = formatDateTime(utcDate);

    expect(dateTimeFormatted).toContain("01/11/2026");
    expect(dateTimeFormatted).toContain("00:00");

  });

  it("recifeDateTimeToIso deve converter datetime-local no fuso de Recife para UTC ISO", () => {

    // Meia-noite em Recife (UTC-3) deve virar 03:00 UTC
    const iso = recifeDateTimeToIso("2026-11-01T00:00");

    expect(iso).toBe("2026-11-01T03:00:00.000Z");

  });

  it("recifeDateTimeToIso deve retornar string vazia para formatos inválidos", () => {

    expect(recifeDateTimeToIso("invalid-date")).toBe("");
    
  });
});
