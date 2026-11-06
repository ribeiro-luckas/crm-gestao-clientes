"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { clientSchema, type ClientInput } from "@/modules/clients/schema";
import { createClient, updateClient } from "@/modules/clients/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";

type ClientValues = { id: string; kind: "company" | "person"; name: string; email: string | null; phone: string | null; status: "active" | "prospect" | "inactive"; source: string | null; notes: string | null };

export function ClientForm({ client }: { client?: ClientValues }) {

  const router = useRouter();
  const [serverMessage, setServerMessage] = useState("");
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? { kind: client.kind, name: client.name, email: client.email ?? "", phone: client.phone ?? "", status: client.status, source: client.source ?? "", notes: client.notes ?? "" } : { kind: "company", status: "prospect", email: "", phone: "", source: "", notes: "" },
  });

  async function onSubmit(values: ClientInput) {

    setServerMessage("");

    const result = client ? await updateClient(client.id, values) : await createClient(values);

    if (!result.ok) {

      setServerMessage(result.message);

      for (const [field, message] of Object.entries(result.fields ?? {})) {

        if (field in values) setError(field as keyof ClientInput, { message });

      }
      
      return;
    }

    router.push(`/clients/${result.id}`);
    router.refresh();
  }

  return <>
          <form
           className="form-panel panel" 
           onSubmit={handleSubmit(onSubmit)} 
           noValidate
          >
            <div className="form-grid">
              <SelectField
               label="Tipo de cliente" 
               required 
               disabled={Boolean(client)} {...register("kind")}
              >
                <option value="company">Empresa</option>
                <option value="person">Pessoa</option>
              </SelectField>
              
              <SelectField label="Status" required {...register("status")}>
                <option value="prospect">Prospecto</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </SelectField>

              <Field
               className="field--wide" 
               label="Nome" 
               placeholder="Nome da empresa ou pessoa" 
               required 
               error={errors.name?.message} {...register("name")} 
              />

              <Field
               label="E-mail" 
               type="email" 
               placeholder="contato@empresa.com.br" 
               error={errors.email?.message} {...register("email")} 
              />

              <Field
               label="Telefone" 
               type="tel" 
               placeholder="(00) 00000-0000" 
               error={errors.phone?.message} {...register("phone")} 
              />
              
              <Field
               className="field--wide" 
               label="Origem" 
               placeholder="Ex.: indicação, site, evento" 
               error={errors.source?.message} {...register("source")} 
              />

              <TextareaField
               className="field--wide" 
               label="Observações" 
               placeholder="Informações comerciais úteis para a equipe" 
               error={errors.notes?.message} {...register("notes")} 
              />
            </div>

            {serverMessage && 
              <p className="form-message form-message--error" role="alert">
                {serverMessage}
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
                : client 
                ? "Salvar alterações" 
                : "Salvar cliente"}
              </Button>
            </div>
          </form>
        </>
}
