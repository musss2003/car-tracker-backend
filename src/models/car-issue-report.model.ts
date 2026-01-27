import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from "typeorm";
import { Car } from "./car.model";
import { User } from "./user.model";

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

@Entity("car_issue_reports")
@Index(['carId'])
@Index(['status'])
@Index(['severity'])
export class CarIssueReport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Relation to Car (cannot be deleted)
  @Column({ name: "car_id" })
  carId: string;

  @ManyToOne(() => Car, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "car_id" })
  car: Car;

  // Who reported it
  @Column({ name: "reported_by" })
  reportedById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "reported_by" })
  reportedBy: User;

  @CreateDateColumn({ name: "reported_at" })
  reportedAt: Date;

  // Description of the issue
  @Column({ type: "text" })
  description: string;

  // Optional diagnostic PDF
  @Column({ name: "diagnostic_pdf_url", type: "text", nullable: true })
  diagnosticPdfUrl?: string;

  // Severity (use enum)
  @Column({
    type: "enum",
    enum: IssueSeverity,
    nullable: true
  })
  severity?: IssueSeverity;

  // Status (use enum)
  @Column({
    type: "enum",
    enum: IssueStatus,
    default: IssueStatus.OPEN
  })
  status: IssueStatus;

  // Who resolved it (optional)
  @Column({ name: "resolved_by", nullable: true })
  resolvedById?: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: "resolved_by" })
  resolvedBy?: User;

  // When resolved
  @Column({ name: "resolved_at", type: "timestamp", nullable: true })
  resolvedAt?: Date;

  // Additional notes (like Contract pattern)
  @Column({ name: "additional_notes", type: "text", nullable: true })
  additionalNotes?: string;

  // Notification tracking (like Contract pattern)
  @Column({ name: "notification_sent", type: "boolean", default: false })
  notificationSent: boolean;

  // Who last updated
  @Column({ name: "updated_by", nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy?: User;

  @UpdateDateColumn({ name: "updated_at", nullable: true })
  updatedAt?: Date;
}

export interface ICarIssueReport {
  id: string;
  carId: string;
  car: Car;
  reportedById: string;
  reportedBy: User;
  reportedAt: Date;
  description: string;
  diagnosticPdfUrl?: string;
  severity?: IssueSeverity;
  status: IssueStatus;
  resolvedById?: string;
  resolvedBy?: User;
  resolvedAt?: Date;
  additionalNotes?: string;
  notificationSent: boolean;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
}

export default CarIssueReport;