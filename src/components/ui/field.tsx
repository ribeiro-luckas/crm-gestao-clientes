import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, error, id, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  
  const inputId = id ?? props.name;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  
  return <>
          <div className={cn("field", className)}>
            <label htmlFor={inputId}>
              {label}{props.required && 
              <span className="required-mark" aria-hidden="true">*</span>}
            </label>
            <input
             id={inputId} 
             className={cn("input", error && "input--error")} 
             aria-invalid={Boolean(error)} 
             aria-describedby={
              [hint 
              ? hintId 
              : null, 
              error 
              ? errorId 
              : null].filter(Boolean).join(" ") || undefined} {...props} 
            />

            {hint && 
            <small id={hintId} className="field-hint">
              {hint}
            </small>}

            {error && 
            <small id={errorId} className="field-error">
              {error}
            </small>}
          </div>
        </>
}

export function TextareaField({ label, error, id, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  
  const textareaId = id ?? props.name;
  
  return <>
          <div className={cn("field", className)}>
            <label htmlFor={textareaId}>{label}</label>
            <textarea
             id={textareaId} 
             className={cn("input", "textarea", error && "input--error")} 
             aria-invalid={Boolean(error)} 
             aria-describedby={
              error 
              ? `${textareaId}-error` 
              : undefined} {...props} 
            />

            {error && 
            <small id={`${textareaId}-error`} className="field-error">
              {error}
            </small>}
          </div>
        </>
}

export function SelectField({ label, error, id, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
  
  const selectId = id ?? props.name;
  
  return <>
          <div className={cn("field", className)}>
            <label htmlFor={selectId}>{label}</label>
            <select
             id={selectId} 
             className="input select" 
             aria-invalid={Boolean(error)} 
             aria-describedby={
              error 
              ? `${selectId}-error` 
              : undefined} {...props}
            >
              {children}
            </select>

            {error && 
            <small id={`${selectId}-error`} className="field-error">
              {error}
            </small>}
          </div>
        </>
}
