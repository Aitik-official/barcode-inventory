import { prisma } from "./prisma";

export async function writeAudit(params: {
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  performedBy?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
      performedBy: params.performedBy ?? "system",
    },
  });
}
