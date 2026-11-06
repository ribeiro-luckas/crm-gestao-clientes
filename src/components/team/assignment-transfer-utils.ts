import type { MemberAssignmentSummary } from "@/modules/team/actions";

export function findAssignmentSource(members: MemberAssignmentSummary[], userId: string) {
  return members.find((member) => member.userId === userId);
}

export function isValidAssignmentTransfer(fromUserId: string, toUserId: string, members: MemberAssignmentSummary[]) {
  if (!fromUserId || !toUserId || fromUserId === toUserId) return false;
  const sourceExists = members.some((member) => member.userId === fromUserId);
  const destinationExists = toUserId === "__unassigned__" || members.some((member) => member.userId === toUserId);
  return sourceExists && destinationExists;
}

export function getTransferPreview(source: MemberAssignmentSummary) {
  return {
    clients: source.clients.active + source.clients.archived,
    deals: source.deals.active + source.deals.archived,
    tasks: source.tasks.active + source.tasks.archived,
    active: source.total.active,
    archived: source.total.archived,
    total: source.total.all,
  };
}
