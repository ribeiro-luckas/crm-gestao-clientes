import { describe, it, expect } from "vitest";
import { clientSchema } from "@/modules/clients/schema";

describe("Client Schema - Validação Zod", () => {

  it("deve aceitar dados válidos de cliente corporativo", () => {

    const valid = {
      kind: "company",
      name: "Tecnologia e Consultoria Ltda",
      email: "contato@empresa.com.br",
      phone: "(81) 98765-4321",
      status: "active",
      source: "Indicação",
      notes: "Cliente prioritário.",
    };
    const parsed = clientSchema.safeParse(valid);

    expect(parsed.success).toBe(true);

  });

  it("deve rejeitar nome com menos de 2 caracteres", () => {

    const invalid = {
      kind: "person",
      name: "A",
      status: "prospect",
    };
    const parsed = clientSchema.safeParse(invalid);

    expect(parsed.success).toBe(false);

  });

  it("deve aceitar e-mail vazio ou string em branco como opcional", () => {

    const validWithEmptyEmail = {
      kind: "person",
      name: "João Silva",
      email: "",
      status: "prospect",
    };
    const parsed = clientSchema.safeParse(validWithEmptyEmail);

    expect(parsed.success).toBe(true);

  });

  it("deve rejeitar e-mail em formato inválido quando fornecido", () => {

    const invalidEmail = {
      kind: "person",
      name: "João Silva",
      email: "email-invalido",
      status: "prospect",
    };
    const parsed = clientSchema.safeParse(invalidEmail);

    expect(parsed.success).toBe(false);

  });

  it("deve rejeitar status fora do enum permitido", () => {

    const invalidStatus = {
      kind: "company",
      name: "Empresa Teste",
      status: "lead_invalido",
    };
    const parsed = clientSchema.safeParse(invalidStatus);

    expect(parsed.success).toBe(false);
    
  });
});
