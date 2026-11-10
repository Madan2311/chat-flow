import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ default: false })
  isGroup: boolean;

  @ManyToMany(() => User)
  @JoinTable({ name: 'chat_participants' })
  participants: User[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
