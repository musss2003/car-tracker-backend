import { FindManyOptions } from 'typeorm';

/**
 * Generic service interface following Service Pattern
 * Provides base business logic operations
 */
export interface IBaseService<T, CreateDTO = any, UpdateDTO = any> {
  /**
   * Get entity by ID
   */
  getById(id: string): Promise<T>;

  /**
   * Get all entities
   */
  getAll(options?: FindManyOptions<T>): Promise<T[]>;

  /**
   * Get entities with pagination
   */
  getPaginated(
    page: number,
    limit: number,
    options?: FindManyOptions<T>
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }>;

  /**
   * Create a new entity
   */
  create(data: CreateDTO, context?: AuditContext): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, data: UpdateDTO, context?: AuditContext): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: string, context?: AuditContext): Promise<boolean>;
}

/**
 * Context information for audit logging
 */
export interface AuditContext {
  userId?: string;
  username?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit action types
 */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'ARCHIVE' | 'UNARCHIVE';
