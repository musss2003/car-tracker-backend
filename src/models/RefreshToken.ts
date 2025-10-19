import { PrimaryGeneratedColumn, Column, CreateDateColumn, Entity } from "typeorm";

export interface IRefreshToken {
    id: number;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
}

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'user_id', type: 'varchar', length: 255 })
    userId!: string;

    @Column({ name: 'token_hash', type: 'varchar', length: 255 })
    tokenHash!: string;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt!: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}