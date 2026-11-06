"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDealStage } from "@/modules/deals/actions";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";

const stages = [{ value: "new_lead", label: "Novo lead" }, { value: "qualification", label: "Qualificação" }, { value: "proposal", label: "Proposta" }, { value: "negotiation", label: "Negociação" }, { value: "won", label: "Ganho" }, { value: "lost", label: "Perdido" }] as const;

export function StageControl({ dealId, currentStage }: { dealId: string; currentStage: string }) {

  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [lossReason, setLossReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMessage("");
    const result = await updateDealStage({ dealId, stage, lossReason });
    setBusy(false);
    if (!result.ok) { setMessage(result.message); return; }
    setMessage("Etapa atualizada.");
    router.refresh();
  }

  return <>
          <div className="stage-control">
            <SelectField
             id={`deal-stage-${dealId}`} 
             label="Etapa da oportunidade" 
             value={stage} 
             onChange={(event) => setStage(event.target.value)}
            >
              {stages.map((item) => 
                <option value={item.value} key={item.value}>
                  {item.label}
                </option>)
              }
            </SelectField>

            {stage === "lost" && 
              <Field
              id={`deal-loss-reason-${dealId}`} 
              label="Motivo da perda" 
              value={lossReason} 
              onChange={(event) => setLossReason(event.target.value)} 
              required 
              placeholder="Informe por que a negociação foi perdida" 
              maxLength={500} 
              />
            }

            {message && 
              <p
               className={`form-message ${message === "Etapa atualizada." 
                ? "form-message--success" 
                : "form-message--error"}`} 
               role={message === "Etapa atualizada." 
                ? "status" 
                : "alert"}
              >
                {message}
              </p>
            }

            <Button
             size="sm" 
             type="button" 
             disabled={busy} 
             onClick={save}
            >
              {busy ? "Atualizando…" : "Atualizar etapa"}
            </Button>
          </div>
        </>
}
