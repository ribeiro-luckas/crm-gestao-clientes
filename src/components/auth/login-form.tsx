"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const schema = z.object({ email: z.email("Informe um e-mail válido."), password: z.string().min(1, "Informe sua senha.") });

type LoginValues = z.infer<typeof schema>;

export function LoginForm() {

  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginValues) {

    setServerError("");

    const result = await authClient.signIn.email({ email: values.email, password: values.password });
    
    if (result.error) {

      setServerError("Não foi possível entrar com esses dados. Confira o e-mail e a senha.");

      return;

    }

    router.replace("/dashboard");
    router.refresh();
  }

  return <>
          <form
           className="auth-form" 
           onSubmit={handleSubmit(onSubmit)} 
           noValidate
          >
            <Field
             label="E-mail" 
             type="email" 
             autoComplete="username" 
             placeholder="voce@empresa.com.br" 
             required 
             error={errors.email?.message} {...register("email")} 
            />

            <Field
             label="Senha" 
             type="password" 
             autoComplete="current-password" 
             placeholder="Sua senha" 
             required 
             error={errors.password?.message} {...register("password")} 
            />

            {serverError && 
              <p className="form-message form-message--error" role="alert">
                {serverError}
              </p>
            }

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
              ? "Entrando…" 
              : "Entrar no CRM"}
              <span aria-hidden="true">↗</span>
            </Button>
          </form>
        </>
}
