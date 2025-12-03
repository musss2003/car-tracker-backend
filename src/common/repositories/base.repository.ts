import {
  Repository,
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
} from 'typeorm';
import { IBaseRepository } from '../interfaces/base-repository.interface';

/**
 * Base repository implementation with common CRUD operations
 * Extend this class for entity-specific repositories
 */
export abstract class BaseRepository<T extends ObjectLiteral>
  implements IBaseRepository<T>
{
  constructor(protected repository: Repository<T>) {}

  async findById(id: string, options?: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as any,
      ...options,
    });
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    options?: FindManyOptions<T>
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findBy(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.findBy(where);
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    await this.repository.update({ id } as any, data as any);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`Entity with id ${id} not found after update`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    // Check if entity has soft delete column
    const metadata = this.repository.metadata;
    const hasSoftDelete = metadata.columns.some(
      (col) => col.propertyName === 'deletedAt'
    );

    if (hasSoftDelete) {
      const result = await this.repository.softDelete({ id } as any);
      return (result.affected ?? 0) > 0;
    }

    return this.hardDelete(id);
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await this.repository.delete({ id } as any);
    return (result.affected ?? 0) > 0;
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options);
  }

  async exists(where: FindOptionsWhere<T>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  getRepository(): Repository<T> {
    return this.repository;
  }
}
