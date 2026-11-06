"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createContact } from "@/modules/clients/contact-actions";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const schema = z.object({ name: z.string().trim().min(2, "Informe o nome do contato.").max(160), title: z.string().max(100).optional(), email: z.union([z.email("Informe um e-mail válido."), z.literal("")]).optional(), phone: z.string().max(40).optional() });

type Values = z.infer<typeof schema>;

export function ContactForm({ companyClientId }: { companyClientId: string }) {

  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", title: "", email: "", phone: "" } });

  async function onSubmit(values: Values) {

    setMessage("");

    const result = await createContact({ ...values, companyClientId });

    if (!result.ok) { 
      
      setMessage(result.message); 
      
      return; 
    
    }

    reset();
    setMessage("Contato cadastrado.");
  }

  return <>
          <form
           className="form-stack contact-form" 
           onSubmit={handleSubmit(onSubmit)} 
           noValidate
          >
            <Field
             label="Nome" 
             placeholder="Nome do contato" 
             required 
             error={errors.name?.message} {...register("name")} 
            />
            
            <div className="form-grid">
              <Field
               label="Cargo" 
               placeholder="Ex.: Compras" {...register("title")} 
              />

              <Field
               label="Telefone" 
               type="tel" 
               placeholder="(00) 00000-0000" {...register("phone")} 
              />
            </div>

            <Field
             label="E-mail" 
             type="email" 
             placeholder="contato@empresa.com.br" 
             error={errors.email?.message} {...register("email")} 
            />

            {message && 
              <p className={`form-message ${message === "Contato cadastrado." 
                ? "form-message--success" 
                : "form-message--error"}`} 
               role={message === "Contato cadastrado." 
                ? "status" 
                : "alert"}
              >
               {message}
              </p>
            }

            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : "Salvar contato"}
            </Button>
          </form>
        </>
}
