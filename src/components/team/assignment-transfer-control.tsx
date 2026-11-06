"use client";

import { Archive, ArrowRightLeft, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MemberAssignmentSummary } from "@/modules/team/actions";
import { transferMemberAssignments } from "@/modules/team/actions";
import { findAssignmentSource, getTransferPreview, isValidAssignmentTransfer } from "./assignment-transfer-utils";

const roleNames: Record<string, string> = { owner: "Proprietário", admin: "Administrador", member: "Membro" };
const unassignedValue = "__unassigned__";

function personLabel(person: MemberAssignmentSummary) {
  return `${person.name} · ${person.email} · ${roleNames[person.role] ?? person.role}`;
}

function countLabel(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function AssignmentTransferControl({ members }: { members: MemberAssignmentSummary[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const source = findAssignmentSource(members, fromUserId);
  const preview = source ? getTransferPreview(source) : null;
  const selectionValid = isValidAssignmentTransfer(fromUserId, toUserId, members);
  const destination = toUserId === unassignedValue
    ? "Sem responsável"
    : members.find((person) => person.userId === toUserId)?.name ?? "";

  function openConfirmation() {
    if (!selectionValid || pending) return;
    setFeedback(null);
    dialogRef.current?.showModal();
    setConfirmOpen(true);
  }

  function closeConfirmation() {
    if (!pending) dialogRef.current?.close();
  }

  async function confirmTransfer() {
    if (!selectionValid || !source || submittingRef.current) return;
    submittingRef.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await transferMemberAssignments({
        fromUserId,
        toUserId: toUserId === unassignedValue ? null : toUserId,
      });
      if (!result.ok) {
        setFeedback({ 
          kind: "error", 
          text: "Não foi possível concluir. Confirme se a origem e o destino ainda pertencem a esta equipe e tente novamente." 
        });

        return;
      }

      const { counts, archivedReferencesPending } = result;
      const archivedPendingText = `Referências arquivadas pendentes: ${archivedReferencesPending.total} (${archivedReferencesPending.clients} clientes, ${archivedReferencesPending.deals} oportunidades e ${archivedReferencesPending.tasks} tarefas).`;
      const text = counts.total === 0
        ? `Nenhuma responsabilidade de ${source.name} precisava ser alterada. ${archivedPendingText}`
        : `Transferência concluída: ${countLabel(counts.clients, "cliente", "clientes")}, ${countLabel(counts.deals, "oportunidade", "oportunidades")} e ${countLabel(counts.tasks, "tarefa", "tarefas")}. Total: ${counts.total}. ${archivedPendingText}`;
      setFeedback({ kind: "success", text });
      dialogRef.current?.close();
      router.refresh();
    } catch {
      setFeedback({ kind: "error", text: "Não foi possível concluir a transferência. Verifique seu acesso e tente novamente." });
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
  }

  return (
    <div className="assignment-transfer" aria-labelledby="assignment-transfer-title">
      <div className="assignment-transfer-heading">
        <div>
          <h3 id="assignment-transfer-title">Transferir responsabilidades</h3>
          <p>
            Escolha membros desta equipe. A transferência será confirmada antes de ser executada.
          </p>
        </div>
        <span className="responsibility-owner-label">
          <ShieldCheck size={13} aria-hidden="true" /> Somente OWNER
        </span>
      </div>

      <div className="assignment-transfer-fields">
        <div className="field">
          <label htmlFor="assignment-transfer-source">Membro de origem</label>
          <select
           id="assignment-transfer-source" 
           className="input select" 
           value={fromUserId} 
           disabled={pending} 
           onChange={(event) => { 
            setFromUserId(event.target.value); 
            setFeedback(null); 
           }}
          >
            <option value="">Selecione uma pessoa</option>

            {members.map((person) => <option 
                                      key={person.userId} 
                                      value={person.userId}>
                                        {personLabel(person)} · 
                                        {person.total.all} atribuições
                                    </option>
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="assignment-transfer-destination">
            Novo responsável
          </label>

          <select
           id="assignment-transfer-destination" 
           className="input select" 
           value={toUserId} 
           disabled={!source || pending} 
           onChange={(event) => { 
            setToUserId(event.target.value); 
            setFeedback(null); 
           }}
          >
            <option value="">Selecione o destino</option>

            {members.filter((person) => 
              person.userId !== fromUserId).map((person) => 
              <option key={person.userId} value={person.userId}>
                {personLabel(person)}
              </option>
            )}

            <option value={unassignedValue}>
              Deixar registros sem responsável
            </option>
          </select>
        </div>
        <Button type="button" variant="secondary" disabled={!selectionValid || pending} onClick={openConfirmation}>
          <ArrowRightLeft size={15} aria-hidden="true" /> Revisar transferência
        </Button>
      </div>

      {source && preview && <div className="assignment-transfer-preview" aria-live="polite">
        <strong>Prévia para {source.name}</strong>
        <p>{destination ? `Destino: ${destination}` : "Selecione um destino para continuar."}</p>
        <div className="assignment-preview-counts">
          <span>{countLabel(preview.clients, "cliente", "clientes")}</span>
          <span>{countLabel(preview.deals, "oportunidade", "oportunidades")}</span>
          <span>{countLabel(preview.tasks, "tarefa", "tarefas")}</span>
          <span>{preview.total} no total</span>
        </div>
        <p>{preview.active} ativos · {preview.archived} arquivados</p>
        <p><Archive size={13} aria-hidden="true" /> Registros arquivados também serão transferidos e permanecerão arquivados.</p>
      </div>}

      <p className="assignment-transfer-caveat">As quantidades apresentadas são uma prévia. Alterações realizadas por outros usuários podem modificar o total até a confirmação da transferência.</p>
      {feedback && (!confirmOpen || feedback.kind !== "error") && <p className={`assignment-transfer-feedback assignment-transfer-feedback--${feedback.kind}`} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p>}

      <dialog ref={dialogRef} className="assignment-transfer-dialog" aria-labelledby="assignment-confirm-title" onClose={() => setConfirmOpen(false)} onCancel={(event) => { if (pending) event.preventDefault(); }}>
        {source && preview && <div className="assignment-dialog-content">
          <span className="assignment-dialog-icon"><ArrowRightLeft size={18} aria-hidden="true" /></span>
          <h2 id="assignment-confirm-title">Confirmar transferência</h2>
          <p>As responsabilidades de <strong>{source.name}</strong> serão transferidas para <strong>{destination}</strong>.</p>
          <ul className="assignment-dialog-summary">
            <li>{countLabel(preview.clients, "cliente", "clientes")}</li>
            <li>{countLabel(preview.deals, "oportunidade", "oportunidades")}</li>
            <li>{countLabel(preview.tasks, "tarefa", "tarefas")}</li>
            <li>{preview.active} ativos e {preview.archived} arquivados</li>
          </ul>
          <p>Os registros arquivados continuarão arquivados. A prévia pode mudar se houver alterações simultâneas.</p>
          {feedback?.kind === "error" && <p className="assignment-transfer-feedback assignment-transfer-feedback--error" role="alert">{feedback.text}</p>}
          <div className="assignment-dialog-actions">
            <Button type="button" variant="secondary" disabled={pending} onClick={closeConfirmation}>Cancelar</Button>
            <Button type="button" disabled={pending} onClick={confirmTransfer}>
              {pending && <LoaderCircle size={15} className="assignment-transfer-spinner" aria-hidden="true" />}
              {pending ? "Transferindo…" : "Confirmar transferência"}
            </Button>
          </div>
          {pending && <span className="visually-hidden" role="status">Transferência em andamento</span>}
        </div>}
      </dialog>
    </div>
  );
}
