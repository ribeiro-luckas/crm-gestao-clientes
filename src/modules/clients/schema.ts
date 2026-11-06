import { z } from "zod";

const optionalEmail = z.union([z.email("Informe um e-mail válido.").max(254), z.literal("")]).optional();

export const clientSchema = z.object({
  kind: z.enum(["person", "company"]),
  name: z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(160),
  email: optionalEmail,
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["active", "prospect", "inactive"]),
  source: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
