import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NotificationStatus } from '../models/notification.model';

/**
 * DTO for creating a new notification
 */
export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  recipientId!: string;

  @IsUUID()
  @IsOptional()
  senderId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  type!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message!: string;
}

/**
 * DTO for updating a notification
 */
export class UpdateNotificationDto {
  @IsString()
  @MaxLength(100)
  @IsOptional()
  type?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  message?: string;

  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;
}

/**
 * DTO for marking notifications as read
 */
export class MarkAsReadDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  notificationIds!: string[];
}
