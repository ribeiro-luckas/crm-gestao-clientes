import { describe, it, expect } from "vitest";
import { csvCell, csvDocument } from "@/lib/csv";

describe("CSV Utilities - Sanitização contra Formula Injection", () => {

  it("deve neutralizar células que iniciam com '=' adicionando aspa simples", () => {

    const raw = "=cmd|' /C calc'!A0";
    const cell = csvCell(raw);

    expect(cell).toBe(`"'=cmd|' /C calc'!A0"`);

  });

  it("deve neutralizar células que iniciam com '+'", () => {

    const raw = "+123456";
    const cell = csvCell(raw);

    expect(cell).toBe(`"'+123456"`);

  });

  it("deve neutralizar células que iniciam com '-'", () => {

    const raw = "-5+5";
    const cell = csvCell(raw);

    expect(cell).toBe(`"'-5+5"`);

  });

  it("deve neutralizar células que iniciam com '@'", () => {

    const raw = "@SUM(1,2)";
    const cell = csvCell(raw);

    expect(cell).toBe(`"'@SUM(1,2)"`);

  });

  it("deve neutralizar células precedidas por espaços ou tabulações antes de caracteres perigosos", () => {

    const raw = "   \t=1+1";
    const cell = csvCell(raw);

    expect(cell).toBe(`"'   \t=1+1"`);

  });

  it("deve escapar aspas duplas internas duplicando-as", () => {

    const raw = 'Texto com "aspas"';
    const cell = csvCell(raw);

    expect(cell).toBe(`"Texto com ""aspas"""`);

  });

  it("deve converter Date para ISO string", () => {

    const d = new Date("2026-10-30T12:00:00.000Z");
    const cell = csvCell(d);

    expect(cell).toBe(`"2026-10-30T12:00:00.000Z"`);

  });

  it("deve formatar null ou undefined como string vazia entre aspas", () => {

    expect(csvCell(null)).toBe(`""`);
    expect(csvCell(undefined)).toBe(`""`);

  });

  it("deve gerar documento CSV com quebras de linha CRLF", () => {
    
    const headers = ["Nome", "Valor"];
    const rows = [
      ["Empresa A", "100.00"],
      ["Empresa B", "=200"],
    ];
    const doc = csvDocument(headers, rows);
    
    expect(doc).toBe(`"Nome","Valor"\r\n"Empresa A","100.00"\r\n"Empresa B","'=200"`);
  });
});
