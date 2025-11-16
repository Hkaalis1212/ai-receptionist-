import { storage } from "./storage";
import type { Request } from "express";

// Audit logging middleware for tracking sensitive operations
export async function logAuditEvent(
  action: string,
  resource: string,
  resourceId: string | undefined,
  req: Request,
  details?: string
) {
  try {
    await storage.createAuditLog({
      action,
      resource,
      resourceId,
      userId: "system", // In future, integrate with auth system
      ipAddress: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.get("user-agent") || "unknown",
      details,
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

// Helper to log data access
export async function logDataAccess(resource: string, resourceId: string, req: Request) {
  await logAuditEvent("READ", resource, resourceId, req);
}

// Helper to log data modification
export async function logDataModification(
  action: "CREATE" | "UPDATE" | "DELETE",
  resource: string,
  resourceId: string | undefined,
  req: Request,
  details?: string
) {
  await logAuditEvent(action, resource, resourceId, req, details);
}

// Helper to log sensitive API access
export async function logApiAccess(endpoint: string, req: Request) {
  await logAuditEvent("API_ACCESS", "api", undefined, req, endpoint);
}
