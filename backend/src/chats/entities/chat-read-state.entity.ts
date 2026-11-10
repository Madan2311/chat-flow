import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Chat } from './chat.entity';

@Entity('chat_read_states')
@Index(['user', 'chat'], { unique: true })
export class ChatReadState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Chat, { onDelete: 'CASCADE' })
  chat: Chat;

  @Column({ type: 'timestamptz' })
  lastReadAt: Date;
}
