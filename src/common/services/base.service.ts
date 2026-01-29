import { FindManyOptions, ObjectLiteral } from 'typeorm';
import { IBaseService, AuditContext } from '../interfaces/base-service.interface';
import { BaseRepository } from '../repositories/base.repository';
import { AuditAction, AuditResource } from '../../models/audit-log.model';
import { logAudit } from '../decorators/audit.decorator';

/**
 * Base service class with integrated audit logging
 * Extend this for entity-specific services
 */
export abstract class BaseService<
  T extends ObjectLiteral,
  CreateDTO = any,
  UpdateDTO = any,
> implements IBaseService<T, CreateDTO, UpdateDTO> {
  constructor(
    protected repository: BaseRepository<T>,
    protected auditResource: AuditResource
  ) {}

  /**
   * Get entity by ID with audit logging
   */
  async getById(id: string, context?: AuditContext): Promise<T> {
    const entity = await this.repository.findById(id);

    if (!entity) {
      throw new Error(`${this.auditResource} with ID ${id} not found`);
    }

    // Log read action
    if (context) {
      await logAudit({
        resource: this.auditResource,
        action: AuditAction.READ,
        resourceId: id,
        description: `Retrieved ${this.auditResource} with ID ${id}`,
        context,
      });
    }

    return entity;
  }

  /**
   * Get all entities with optional audit logging
   */
  async getAll(options?: FindManyOptions<T>, context?: AuditContext): Promise<T[]> {
    const entities = await this.repository.findAll(options);

    // Log read action
    if (context) {
      await logAudit({
        resource: this.auditResource,
        action: AuditAction.READ,
        description: `Retrieved ${entities.length} ${this.auditResource}(s)`,
        context,
      });
    }

    return entities;
  }

  /**
   * Get entities with pagination and audit logging
   */
  async getPaginated(
    page: number = 1,
    limit: number = 10,
    options?: FindManyOptions<T>,
    context?: AuditContext
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const result = await this.repository.findWithPagination(page, limit, options);

    // Log read action
    if (context) {
      await logAudit({
        resource: this.auditResource,
        action: AuditAction.READ,
        description: `Retrieved page ${page} of ${this.auditResource}(s) (${result.data.length} items)`,
        context,
      });
    }

    return result;
  }

  /**
   * Create new entity with audit logging
   * Override this method in derived classes for custom validation/transformation
   */
  async create(data: CreateDTO, context?: AuditContext): Promise<T> {
    const entity = await this.repository.create(data as any);

    // Log create action
    if (context) {
      await logAudit({
        resource: this.auditResource,
        action: AuditAction.CREATE,
        resourceId: (entity as any).id,
        description: this.getCreateDescription(entity),
        includeChanges: true,
        afterData: this.sanitizeEntityForAudit(entity),
        context,
      });
    }

    return entity;
  }

  /**
   * Update entity with audit logging
   * Override this method in derived classes for custom validation/transformation
   */
  async update(id: string, data: UpdateDTO, context?: AuditContext): Promise<T> {
    // Get current state for audit trail
    const beforeEntity = await this.repository.findById(id);

    if (!beforeEntity) {
      throw new Error(`${this.auditResource} with ID ${id} not found`);
    }

    const updatedEntity = await this.repository.update(id, data as any);

    // Log update action
    if (context) {
      await logAudit({
        resource: this.auditResource,
        action: AuditAction.UPDATE,
        resourceId: id,
        description: this.getUpdateDescription(beforeEntity, updatedEntity),
        includeChanges: true,
        beforeData: this.sanitizeEntityForAudit(beforeEntity),
        afterData: this.sanitizeEntityForAudit(updatedEntity),
        context,
      });
    }

    return updatedEntity;
  }

  /**
   * Delete entity with audit logging
   */
  async delete(id: string, context?: AuditContext): Promise<boolean> {
    // Get entity before deletion for audit trail
    const entity = await this.repository.findById(id);

    if (!entity) {
      throw new Error(`${this.auditResource} with ID ${id} not found`);
    }

    const deleted = await this.repository.delete(id);

    // Log delete action
    if (context && deleted) {
      await logAudit({
        resource: this.auditResource,
        action: AuditAction.DELETE,
        resourceId: id,
        description: this.getDeleteDescription(entity),
        includeChanges: true,
        beforeData: this.sanitizeEntityForAudit(entity),
        context,
      });
    }

    return deleted;
  }

  /**
   * Override this to customize audit description for create operations
   */
  protected getCreateDescription(entity: T): string {
    return `Created ${this.auditResource} with ID ${(entity as any).id}`;
  }

  /**
   * Override this to customize audit description for update operations
   */
  protected getUpdateDescription(before: T, after: T): string {
    return `Updated ${this.auditResource} with ID ${(after as any).id}`;
  }

  /**
   * Override this to customize audit description for delete operations
   */
  protected getDeleteDescription(entity: T): string {
    return `Deleted ${this.auditResource} with ID ${(entity as any).id}`;
  }

  /**
   * Override this to remove sensitive data before audit logging
   */
  protected sanitizeEntityForAudit(entity: T): any {
    const sanitized = { ...entity };
    // Remove common sensitive fields
    delete (sanitized as any).password;
    delete (sanitized as any).passwordHash;
    delete (sanitized as any).salt;
    return sanitized;
  }

  /**
   * Get the underlying repository for advanced operations
   */
  protected getRepository(): BaseRepository<T> {
    return this.repository;
  }
}
