import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "default" | "sm"; };

export function Button({ className, variant = "primary", size = "default", ...props }: ButtonProps) {
  
  return <>
          <button className={
            cn("button", `button--${variant}`, size === "sm" && 
              "button--sm", className)} {...props} 
          />
        </>
}
