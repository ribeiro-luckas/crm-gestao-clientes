export interface ClientDependencyCounts {
  activeContacts: number;
  openDeals: number;
  pendingTasks: number;
}

export function evaluateClientArchivalEligibility(
  dependencies: ClientDependencyCounts,
): { canArchive: boolean; reason?: string } {
  
  if (dependencies.activeContacts > 0) {

    return { canArchive: false, reason: "Não é possível arquivar um cliente com contatos ativos vinculados." };
  }

  if (dependencies.openDeals > 0) {

    return { canArchive: false, reason: "Não é possível arquivar um cliente com oportunidades comerciais em aberto." };
  }

  if (dependencies.pendingTasks > 0) {

    return { canArchive: false, reason: "Não é possível arquivar um cliente com tarefas pendentes." };
  }

  return { canArchive: true };
}
