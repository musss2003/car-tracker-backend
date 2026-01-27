import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  MinLength
} from 'class-validator';

export enum IssueSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum IssueStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved'
}

/**
 * DTO for creating a new car issue report
 */
export class CreateCarIssueReportDto {
  @IsUUID()
  @IsNotEmpty()
  carId!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description!: string;

  @IsString()
  @IsOptional()
  diagnosticPdfUrl?: string;

  @IsEnum(IssueSeverity)
  @IsOptional()
  severity?: IssueSeverity;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;
}

/**
 * DTO for updating a car issue report
 */
export class UpdateCarIssueReportDto {
  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  diagnosticPdfUrl?: string;

  @IsEnum(IssueSeverity)
  @IsOptional()
  severity?: IssueSeverity;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsUUID()
  @IsOptional()
  resolvedById?: string;

  @IsDateString()
  @IsOptional()
  resolvedAt?: string;  // String in DTO, Date in entity
}