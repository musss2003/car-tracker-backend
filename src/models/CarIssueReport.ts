import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";
import Car from "./Car";
import User from "./User"; // if you track who reported it

@Entity("car_issue_reports")
export class CarIssueReport {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // ----- Relation to Car -----
  @ManyToOne(() => Car, { onDelete: "CASCADE" })
  @JoinColumn({ name: "car_id" })
  car: Car;

  @Column({ name: "car_id" })
  carId: string;

  // ----- Who reported it (optional) -----
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "reported_by" })
  reportedBy: User;

  @Column({ name: "reported_by", nullable: true })
  reportedById: string;

  @CreateDateColumn({ name: "created_at" })
  reportedAt: Date;

  // ----- Description of the issue -----
  @Column({ type: "text" })
  description: string;

  // ----- Optional diagnostic PDF -----
  @Column({ name: "diagnostic_pdf_url", type: "text", nullable: true })
  diagnosticPdfUrl?: string;

  // ----- Severity (low / medium / high / critical) -----
  @Column({ type: "text", nullable: true })
  severity?: "low" | "medium" | "high" | "critical";

  // ----- Status (open / in_progress / resolved) -----
  @Column({
    type: "text",
    default: "open"
  })
  status: "open" | "in_progress" | "resolved";

  // ----- Who resolved it (optional) -----
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "resolved_by" })
  resolvedBy?: User;

  @Column({ name: "resolved_by", nullable: true })
  resolvedById?: string;

  // ----- When the issue was marked resolved -----
  @Column({ name: "resolved_at", type: "timestamp", nullable: true })
  resolvedAt?: Date;

  // ----- Who last updated this report -----
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy?: User;

  @Column({ name: "updated_by", nullable: true })
  updatedById?: string;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

export default CarIssueReport;
