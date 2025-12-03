import { Repository } from 'typeorm';
import { User, UserRole } from '../models/User';
import { AppDataSource } from '../config/db';
import { BaseRepository } from '../common/repositories/base.repository';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(AppDataSource.getRepository(User));
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  /**
   * Find user by username or email
   */
  async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    return this.repository.findOne({
      where: [{ username }, { email }],
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return this.repository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all users without sensitive data
   */
  async findAllSafe(): Promise<Partial<User>[]> {
    return this.repository.find({
      select: [
        'id',
        'username',
        'email',
        'name',
        'citizenshipId',
        'profilePhotoUrl',
        'phone',
        'address',
        'role',
        'lastLogin',
        'lastActiveAt',
        'createdAt',
        'updatedAt',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get user by ID without password
   */
  async findByIdSafe(id: string): Promise<Partial<User> | null> {
    return this.repository.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'email',
        'name',
        'citizenshipId',
        'profilePhotoUrl',
        'phone',
        'address',
        'role',
        'lastLogin',
        'lastActiveAt',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    const now = new Date();
    await this.repository.update(userId, {
      lastLogin: now,
      lastActiveAt: now,
    });
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    await this.repository.update(userId, {
      lastActiveAt: new Date(),
    });
  }

  /**
   * Search users by name or username
   */
  async searchByNameOrUsername(searchTerm: string): Promise<Partial<User>[]> {
    return this.repository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.name',
        'user.role',
        'user.profilePhotoUrl',
        'user.lastActiveAt',
      ])
      .where('user.name ILIKE :searchTerm OR user.username ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .orderBy('user.name', 'ASC')
      .getMany();
  }

  /**
   * Get admins only
   */
  async findAdmins(): Promise<User[]> {
    return this.findByRole(UserRole.ADMIN);
  }

  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    return this.repository.count({ where: { role } });
  }
}
