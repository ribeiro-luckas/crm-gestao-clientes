"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createActivity } from "@/modules/activities/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";

const schema = z.object({ type: z.enum(["call", "meeting", "email", "note", "follow_up"]), subject: z.string().trim().min(2, "Informe um resumo.").max(160), body: z.string().max(2000).optional() });

type Values = z.infer<typeof schema>;

export function ActivityForm({ clientId, dealId }: { clientId?: string; dealId?: string }) {

  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: "note", subject: "", body: "" } });

  async function onSubmit(values: Values) {

    setMessage("");

    const result = await createActivity({ ...values, clientId: clientId ?? "", dealId: dealId ?? "" });

    if (!result.ok) {
      
      setMessage(result.message);
      
      return;
    
    }

    reset();
    setMessage("Atividade registrada.");

  }

  return <>
          <form
           className="form-stack" 
           onSubmit={handleSubmit(onSubmit)} 
           noValidate
          >
            <SelectField label="Tipo de atividade" {...register("type")}>
              <option value="note">Nota</option>
              <option value="call">Ligação</option>
              <option value="meeting">Reunião</option>
              <option value="email">E-mail</option>
              <option value="follow_up">Acompanhamento</option>
            </SelectField>

            <Field
             label="Resumo" 
             placeholder="Ex.: Alinhamento inicial" 
             required 
             error={errors.subject?.message} {...register("subject")} 
            />

            <TextareaField
             label="Detalhes" 
             placeholder="O que foi conversado ou combinado?" {...register("body")} 
            />

            {message && 
              <p
               className={`form-message ${message === "Atividade registrada." 
                ? "form-message--success" 
                : "form-message--error"}`} 
               role={message === "Atividade registrada." 
                ? "status" 
                : "alert"}
              >
                {message}
              </p>
            }

            <Button
             size="sm" 
             type="submit" 
             disabled={isSubmitting}
            >
              {isSubmitting 
              ? "Registrando…" 
              : "Registrar atividade"}
            </Button>
          </form>
        </> 
}
