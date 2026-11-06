import { describe, it, expect } from "vitest";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe um título.").max(160),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  dueAt: z.iso.datetime("Informe uma data e hora válidas."),
  clientId: z.union([z.uuid(), z.literal("")]).optional(),
  dealId: z.union([z.uuid(), z.literal("")]).optional(),
});

describe("Task Schema - Validação de Tarefas", () => {
  it("deve aceitar dados válidos com vínculos opcionais", () => {
    const valid = {
      title: "Enviar minuta contratual",
      description: "Verificar cláusulas de SLA",
      priority: "high",
      dueAt: "2026-11-05T14:30:00.000Z",
      clientId: "123e4567-e89b-12d3-a456-426614174000",
      dealId: "",
    };
    const parsed = taskSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("deve rejeitar prioridade fora dos valores permitidos", () => {
    const invalid = {
      title: "Reunião de alinhamento",
      priority: "critical_invalid",
      dueAt: "2026-11-05T14:30:00.000Z",
    };
    expect(taskSchema.safeParse(invalid).success).toBe(false);
  });

  it("deve rejeitar data de vencimento que não seja ISO datetime válida", () => {
    const invalidDate = {
      title: "Tarefa sem data correta",
      priority: "normal",
      dueAt: "2026-11-05", // falta horário/formato ISO datetime
    };
    expect(taskSchema.safeParse(invalidDate).success).toBe(false);
  });
});
