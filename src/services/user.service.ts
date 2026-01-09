import bcrypt from 'bcrypt';
import { User, UserRole } from '../models/user.model';
import { UserRepository } from '../repositories/user.repository';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/audit-log,model';
import { AuditContext } from '../common/interfaces/base-service.interface';
import { CreateUserDto, UpdateUserDto, ChangePasswordDto, ResetPasswordDto } from '../dto/user.dto';
import { ConflictError, NotFoundError, ValidationError, UnauthorizedError } from '../common/errors';
import { RefreshToken } from '../models/refresh-token.model';
import { AppDataSource } from '../config/db';
import { queueCredentialsEmail, queuePasswordResetEmail } from '../queues/email.queue';
import { logAudit } from '../common/decorators/audit.decorator';
import { notifyAdmins } from './notificationService';
import { Server as SocketIOServer } from 'socket.io';

export class UserService extends BaseService<User> {
  private userRepository: UserRepository;
  private io?: SocketIOServer;

  constructor(io?: SocketIOServer) {
    const userRepository = new UserRepository();
    super(userRepository, AuditResource.USER);
    this.userRepository = userRepository;
    this.io = io;
  }

  /**
   * Set Socket.IO instance for notifications
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(data: CreateUserDto, context: AuditContext): Promise<Partial<User>> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByUsernameOrEmail(
      data.username,
      data.email
    );

    if (existingUser) {
      throw new ConflictError('User with this username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await this.create(
      {
        ...data,
        password: hashedPassword,
        role: data.role || UserRole.USER,
      },
      context
    );

    // Queue credentials email if requested (async background job)
    if ((data as any).sendCredentials) {
      try {
        await queueCredentialsEmail(data.email, data.username, data.password, data.name);
        console.log(`✅ Credentials email queued for ${data.email}`);
      } catch (error) {
        console.error('Failed to queue credentials email:', error);
      }
    }

    // Send notification to admins
    if (this.io) {
      try {
        await notifyAdmins(
          `Novi korisnik: ${data.username}`,
          'user-new',
          context.userId,
          this.io
        );
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    // Remove password from response
    const { password, ...userResponse } = user;
    return userResponse;
  }

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    data: UpdateUserDto,
    context: AuditContext
  ): Promise<Partial<User>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check for duplicate username or email
    if (data.username || data.email) {
      const existingUser = await this.userRepository.findByUsernameOrEmail(
        data.username || '',
        data.email || ''
      );

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError('Username or email already in use');
      }
    }

    const updatedUser = await this.update(userId, data, context);

    // Send notification to admins
    if (this.io) {
      try {
        await notifyAdmins(
          `Podaci korisnika ažurirani: ${updatedUser.username}`,
          'user-updated',
          context.userId,
          this.io
        );
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }

    // Remove password from response
    const { password, ...userResponse } = updatedUser;
    return userResponse;
  }

  /**
   * Get all users without sensitive data
   */
  async getAllUsers(): Promise<Partial<User>[]> {
    return this.userRepository.findAllSafe();
  }

  /**
   * Get user by ID without sensitive data
   */
  async getUserById(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findByIdSafe(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  /**
   * Change user password (requires current password)
   */
  async changePassword(
    userId: string,
    data: ChangePasswordDto,
    context: AuditContext
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(data.newPassword, user.password);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });

    // Invalidate existing refresh tokens for security
    const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    await refreshTokenRepository.delete({ userId });

    // Log password change
    await logAudit({
      resource: AuditResource.USER,
      action: 'UPDATE' as any,
      resourceId: userId,
      context,
      description: 'User changed their password',
      includeChanges: false,
    });
  }

  /**
   * Reset user password (admin only)
   */
  async resetPassword(
    userId: string,
    data: ResetPasswordDto,
    context: AuditContext
  ): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });

    // Invalidate existing refresh tokens
    const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    await refreshTokenRepository.delete({ userId });

    // Queue password reset email if requested (async background job)
    if (data.sendEmail) {
      try {
        await queuePasswordResetEmail(user.email, user.username, data.newPassword, user.name);
        console.log(`✅ Password reset email queued for ${user.email}`);
      } catch (error) {
        console.error('Failed to queue password reset email:', error);
      }
    }

    // Log password reset
    await logAudit({
      resource: AuditResource.USER,
      action: 'UPDATE' as any,
      resourceId: userId,
      context,
      description: 'Admin reset user password',
      includeChanges: false,
    });
  }

  /**
   * Delete user (soft delete - archives the user)
   */
  async deleteUser(userId: string, context: AuditContext): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Delete user
    await this.delete(userId, context);

    // Invalidate refresh tokens
    const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);
    await refreshTokenRepository.delete({ userId });
  }

  /**
   * Search users by name or username
   */
  async searchUsers(searchTerm: string): Promise<Partial<User>[]> {
    return this.userRepository.searchByNameOrUsername(searchTerm);
  }

  /**
   * Get all admin users
   */
  async getAdmins(): Promise<User[]> {
    return this.userRepository.findAdmins();
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.updateLastLogin(userId);
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<void> {
    await this.userRepository.updateLastActive(userId);
  }

  /**
   * Get user count by role
   */
  async getUserCountByRole(role: UserRole): Promise<number> {
    return this.userRepository.countByRole(role);
  }
}
