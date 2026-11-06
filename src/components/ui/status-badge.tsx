const labels: Record<string, string> = {
  active: "Ativo", prospect: "Prospecto", inactive: "Inativo",
  new_lead: "Novo lead", qualification: "Qualificação", proposal: "Proposta", negotiation: "Negociação", won: "Ganho", lost: "Perdido",
  todo: "A fazer", in_progress: "Em andamento", done: "Concluída", canceled: "Cancelada",
  low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente",
};

export function StatusBadge({ value }: { value: string }) {

  return <>
          <span className={`status-badge status-badge--${value}`}>
            {labels[value] 
            ?? value}
          </span>
        </>
}
