import auditLogService from '../../services/audit-log.service';
import { AuditAction, AuditResource } from '../../models/audit-log,model';
import { AuditContext } from '../interfaces/base-service.interface';

/**
 * Decorator options for audit logging
 */
export interface AuditOptions {
  resource: AuditResource;
  action: AuditAction;
  description?: string | ((args: any[], result: any) => string);
  includeChanges?: boolean;
  beforeDataExtractor?: (args: any[]) => any;
  afterDataExtractor?: (result: any) => any;
  resourceIdExtractor?: (args: any[], result?: any) => string;
}

/**
 * Decorator for automatic audit logging
 * Usage:
 * @Audit({
 *   resource: AuditResource.CAR_INSURANCE,
 *   action: AuditAction.CREATE,
 *   description: 'Created insurance record'
 * })
 */
export function Audit(options: AuditOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let result: any;
      let error: any;
      let context: AuditContext | undefined;

      try {
        // Extract audit context from arguments (usually last parameter)
        const lastArg = args[args.length - 1];
        if (lastArg && typeof lastArg === 'object' && 'userId' in lastArg) {
          context = lastArg as AuditContext;
        }

        // Extract before data if needed
        const beforeData = options.beforeDataExtractor
          ? await options.beforeDataExtractor(args)
          : undefined;

        // Execute the original method
        result = await originalMethod.apply(this, args);

        // Extract after data if needed
        const afterData = options.afterDataExtractor
          ? options.afterDataExtractor(result)
          : undefined;

        // Extract resource ID
        const resourceId = options.resourceIdExtractor
          ? options.resourceIdExtractor(args, result)
          : result?.id || args[0];

        // Generate description
        let description: string;
        if (typeof options.description === 'function') {
          description = options.description(args, result);
        } else {
          description = options.description || `${options.action} ${options.resource}`;
        }

        // Log the audit entry
        const duration = Date.now() - startTime;
        await auditLogService.logCRUD({
          userId: context?.userId,
          username: context?.username,
          userRole: context?.userRole,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          action: options.action as any,
          resource: options.resource,
          resourceId,
          description,
          changes: options.includeChanges
            ? { before: beforeData, after: afterData }
            : undefined,
        });

        return result;
      } catch (err) {
        error = err;
        throw err;
      }
    };

    return descriptor;
  };
}

/**
 * Helper function to manually log audit entries
 * Use this when decorators cannot be applied
 */
export async function logAudit(
  options: AuditOptions & {
    context?: AuditContext;
    resourceId?: string;
    beforeData?: any;
    afterData?: any;
  }
) {
  const description =
    typeof options.description === 'function'
      ? options.description([], {})
      : options.description || `${options.action} ${options.resource}`;

  return auditLogService.logCRUD({
    userId: options.context?.userId,
    username: options.context?.username,
    userRole: options.context?.userRole,
    ipAddress: options.context?.ipAddress,
    userAgent: options.context?.userAgent,
    action: options.action as any,
    resource: options.resource,
    resourceId: options.resourceId,
    description,
    changes: options.includeChanges
      ? { before: options.beforeData, after: options.afterData }
      : undefined,
  });
}
