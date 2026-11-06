"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createDeal, updateDeal } from "@/modules/deals/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";

const schema = z.object({ clientId: z.uuid("Selecione um cliente."), title: z.string().trim().min(2, "Informe o nome da oportunidade.").max(160), amount: z.string().regex(/^\d{1,12}(?:\.\d{1,2})?$/, "Use ponto para separar os centavos, por exemplo 2500.00."), expectedCloseAt: z.string().optional() });

type Values = z.infer<typeof schema>;

type DealValues = { id: string; clientId: string; title: string; amount: string; expectedCloseAt: string | null };

export function DealForm({ clients, initialClientId = "", deal }: { clients: { id: string; name: string }[]; initialClientId?: string; deal?: DealValues }) {

  const router = useRouter();
  const [message, setMessage] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { clientId: deal?.clientId ?? initialClientId, title: deal?.title ?? "", amount: deal?.amount ?? "0.00", expectedCloseAt: deal?.expectedCloseAt ?? "" } });

  async function onSubmit(values: Values) {

    setMessage("");

    const result = deal ? await updateDeal(deal.id, values) : await createDeal(values);

    if (!result.ok) { setMessage(result.message); return; }
    
    router.push(`/deals/${result.id}`);
    router.refresh();
  }

  return <>
          <form
           className="form-panel panel" 
           onSubmit={handleSubmit(onSubmit)} 
           noValidate
          >
            {clients.length 
            ? <div className="form-grid">
                <SelectField
                 className="field--wide" 
                 label="Cliente relacionado" 
                 required 
                 error={errors.clientId?.message} {...register("clientId")}
                >
                  <option value="">Selecione um cliente</option>

                  {clients.map((client) => 
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  )}
                </SelectField>

                <Field
                 className="field--wide" 
                 label="Nome da oportunidade" 
                 placeholder="Ex.: Projeto de modernização" 
                 required 
                 error={errors.title?.message} {...register("title")} 
                />
                
                <Field
                 label="Valor estimado (BRL)" 
                 type="number" 
                 min="0" 
                 step="0.01" 
                 required 
                 error={errors.amount?.message} {...register("amount")} 
                />

                <Field
                 label="Previsão de fechamento" 
                 type="date" 
                 error={errors.expectedCloseAt?.message} {...register("expectedCloseAt")} 
                />
              </div> 
            : <p className="form-message form-message--error">
                Cadastre um cliente antes de criar uma oportunidade.
              </p>
            }

            {message && 
              <p className="form-message form-message--error" role="alert">
                {message}
              </p>
            }

            <div className="form-actions">
              <Button
               variant="secondary" 
               type="button" 
               onClick={() => router.back()}
              >
                Cancelar
              </Button>

              <Button
               type="submit" 
               disabled={isSubmitting || clients.length === 0}
              >
                {isSubmitting 
                  ? "Salvando…" 
                  : deal 
                  ? "Salvar alterações" 
                  : "Criar oportunidade"
                }
              </Button>
            </div>
          </form>
        </>
}
