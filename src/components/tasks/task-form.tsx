"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createTask } from "@/modules/tasks/actions";
import { recifeDateTimeToIso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";

const schema = z.object({ title: z.string().trim().min(2, "Informe o título.").max(160), description: z.string().max(2000).optional(), priority: z.enum(["low", "normal", "high", "urgent"]), dueAt: z.string().min(1, "Informe o prazo."), clientId: z.string().optional(), dealId: z.string().optional() });
type Values = z.infer<typeof schema>;

export function TaskForm({ clients, deals }: { clients: { id: string; name: string }[]; deals: { id: string; title: string; clientId: string }[] }) {
  
  const router = useRouter();
  const [message, setMessage] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "", priority: "normal", dueAt: "", clientId: "", dealId: "" } });
  
  async function onSubmit(values: Values) {

    setMessage("");

    const dueAt = recifeDateTimeToIso(values.dueAt);

    if (!dueAt) { 
      setMessage("Informe uma data e hora válidas no fuso de Recife."); 
      return; 
    }

    const result = await createTask({ ...values, dueAt });

    if (!result.ok) { 

      setMessage(result.message); 
      
      return; 
    }

    router.push("/tasks");
    router.refresh();
  }
  
  return <>
          <form
           className="form-panel panel" 
           onSubmit={handleSubmit(onSubmit)} 
           noValidate
          >
            <div className="form-grid">
              <Field
               className="field--wide" 
               label="Título" 
               placeholder="Ex.: Enviar proposta revisada" 
               required 
               error={errors.title?.message} {...register("title")} 
              />

              <SelectField
               label="Prioridade" {...register("priority")}
              >
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </SelectField>

              <Field
               label="Vencimento · horário de Recife" 
               type="datetime-local" 
               required 
               error={errors.dueAt?.message} {...register("dueAt")} 
              />

              <SelectField
               className="field--wide" 
               label="Cliente relacionado" {...register("clientId")}
              >
                <option value="">Sem cliente associado</option>

                {clients.map((client) => 
                <option value={client.id} key={client.id}>
                  {client.name}
                </option>)}
               </SelectField>

              <SelectField
               className="field--wide" 
               label="Oportunidade relacionada" {...register("dealId")}
              >
                <option value="">Sem oportunidade associada</option>
                {deals.map((deal) => 
                <option value={deal.id} key={deal.id}>
                  {deal.title}
                </option>)}
              </SelectField>

              <TextareaField
               className="field--wide" 
               label="Descrição" 
               placeholder="Detalhes e contexto para realizar a tarefa" 
               error={errors.description?.message} {...register("description")} 
              />
            </div>

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
               disabled={isSubmitting}>
                {isSubmitting 
                ? "Salvando…" 
                : "Criar tarefa"}
              </Button>
            </div>
          </form>
        </>
}
