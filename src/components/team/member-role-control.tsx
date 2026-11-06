"use client";

import { useState, useTransition } from "react";
import { updateMemberRole } from "@/modules/team/actions";

export function MemberRoleControl({ memberId, memberName, memberEmail, role }: { memberId: string; memberName: string; memberEmail: string; role: string }) {

  const [selected, setSelected] = useState(role);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error" | null>(null);
  const [pending, startTransition] = useTransition();

  return <>
          <div className="member-role-control">
            <select
             aria-label={`Papel de ${memberName} (${memberEmail})`} 
             className="input select" 
             value={selected} 
             onChange={(event) => setSelected(event.target.value)}
            >
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>

            <button
             className="button button--secondary button--sm" 
             type="button" 
             disabled={pending || selected === role} 
             onClick={() => startTransition(async () => {

              setMessage("");
              setMessageKind(null);

              try {

                await updateMemberRole(memberId, selected);

                setMessage("Papel atualizado.");
                setMessageKind("success");

              } catch (error) {

                setMessage(error instanceof Error 
                  ? error.message 
                  : "Não foi possível atualizar o papel."
                );
                setMessageKind("error");
                setSelected(role);

              }
             })}
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>

            {message && 
            <span
             className={`member-role-feedback member-role-feedback--${messageKind}`} 
             role={messageKind === "error" ? "alert" : "status"}>
              {message}
            </span>}
          </div>
        </>
}
