import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere } from 'typeorm';

/**
 * Generic repository interface following Repository Pattern
 * Provides base CRUD operations for all entities
 */
export interface IBaseRepository<T> {
  /**
   * Find entity by ID
   */
  findById(id: string, options?: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find all entities with optional filtering
   */
  findAll(options?: FindManyOptions<T>): Promise<T[]>;

  /**
   * Find entities with pagination
   */
  findWithPagination(
    page: number,
    limit: number,
    options?: FindManyOptions<T>
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }>;

  /**
   * Find one entity by criteria
   */
  findOne(options: FindOneOptions<T>): Promise<T | null>;

  /**
   * Find entities by criteria
   */
  findBy(where: FindOptionsWhere<T>): Promise<T[]>;

  /**
   * Create and save a new entity
   */
  create(data: DeepPartial<T>): Promise<T>;

  /**
   * Update an entity by ID
   */
  update(id: string, data: DeepPartial<T>): Promise<T>;

  /**
   * Delete an entity by ID (soft delete if supported)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Hard delete an entity by ID
   */
  hardDelete(id: string): Promise<boolean>;

  /**
   * Count entities matching criteria
   */
  count(options?: FindManyOptions<T>): Promise<number>;

  /**
   * Check if entity exists
   */
  exists(where: FindOptionsWhere<T>): Promise<boolean>;

  /**
   * Get the raw TypeORM repository for advanced operations
   */
  getRepository(): any;
}
