import { describe, it, expect } from "vitest";
import { z } from "zod";

const dealSchema = z.object({
  clientId: z.uuid("Selecione um cliente válido."),
  title: z.string().trim().min(2, "Informe o nome da oportunidade.").max(160),
  amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Informe um valor válido com até duas casas decimais."),
  expectedCloseAt: z.union([z.iso.date(), z.literal("")]).optional(),
});

const stageSchema = z.object({
  dealId: z.uuid(),
  stage: z.enum(["new_lead", "qualification", "proposal", "negotiation", "won", "lost"]),
  lossReason: z.string().trim().max(500).optional(),
}).refine((data) => {

  if (data.stage === "lost") {

    return Boolean(data.lossReason && data.lossReason.trim().length > 0);

  }

  return true;

}, {
  message: "Informe o motivo da perda.",
  path: ["lossReason"],
});

describe("Deal Schemas - Validação de Oportunidades e Etapas", () => {

  it("deve validar dados corretos de criação de oportunidade", () => {

    const valid = {
      clientId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Contrato Anual de Suporte",
      amount: "45000.00",
      expectedCloseAt: "2026-12-15",
    };
    const parsed = dealSchema.safeParse(valid);

    expect(parsed.success).toBe(true);

  });

  it("deve rejeitar montantes com caracteres inválidos ou mais de duas casas decimais", () => {

    expect(dealSchema.safeParse({
      clientId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Projeto",
      amount: "100.999",
    }).success).toBe(false);

    expect(dealSchema.safeParse({
      clientId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Projeto",
      amount: "-50.00",
    }).success).toBe(false);

    expect(dealSchema.safeParse({
      clientId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Projeto",
      amount: "100,50", // vírgula em vez de ponto
    }).success).toBe(false);

  });

  it("deve exigir motivo da perda quando a etapa for 'lost'", () => {

    const withoutReason = {
      dealId: "123e4567-e89b-12d3-a456-426614174000",
      stage: "lost",
      lossReason: "",
    };
    const result = stageSchema.safeParse(withoutReason);

    expect(result.success).toBe(false);

  });

  it("deve aceitar etapa 'lost' quando o motivo for devidamente preenchido", () => {

    const withReason = {
      dealId: "123e4567-e89b-12d3-a456-426614174000",
      stage: "lost",
      lossReason: "Optou por concorrente com preço inferior.",
    };
    const result = stageSchema.safeParse(withReason);

    expect(result.success).toBe(true);

  });

  it("deve permitir etapas abertas ou 'won' sem motivo de perda", () => {

    const wonDeal = {
      dealId: "123e4567-e89b-12d3-a456-426614174000",
      stage: "won",
    };

    expect(stageSchema.safeParse(wonDeal).success).toBe(true);

    const openDeal = {
      dealId: "123e4567-e89b-12d3-a456-426614174000",
      stage: "proposal",
    };

    expect(stageSchema.safeParse(openDeal).success).toBe(true);
    
  });
});
