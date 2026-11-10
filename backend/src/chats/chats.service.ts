import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../messages/entities/message.entity';
import { UsersService } from '../users/users.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatReadState } from './entities/chat-read-state.entity';
import { Chat } from './entities/chat.entity';

interface LastMessageRow {
  chatId: string;
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  senderName: string;
}

interface UnreadRow {
  chatId: string;
  count: number;
}

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat) private readonly chats: Repository<Chat>,
    @InjectRepository(ChatReadState)
    private readonly readStates: Repository<ChatReadState>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly usersService: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateChatDto) {
    const otherIds = [...new Set(dto.participantIds)].filter(
      (id) => id !== userId,
    );
    if (otherIds.length === 0) {
      throw new BadRequestException('Debes seleccionar al menos otro usuario');
    }

    const users = await this.usersService.findByIds([userId, ...otherIds]);
    if (users.length !== otherIds.length + 1) {
      throw new NotFoundException(
        'Uno o más usuarios seleccionados no existen',
      );
    }

    const isGroup = otherIds.length > 1;

    if (!isGroup) {
      const existingId = await this.findDirectChatId(userId, otherIds[0]);
      if (existingId) return this.findOneForUser(existingId, userId);
    }

    const chat = await this.chats.save(
      this.chats.create({
        name: isGroup ? (dto.name ?? null) : null,
        isGroup,
        participants: users,
      }),
    );
    const fullChat = await this.findOneForUser(chat.id, userId);
    this.events.emit('chat.created', fullChat);
    return fullChat;
  }

  private findAllForUser(userId: string) {
    return this.chats
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'me', 'me.id = :userId', { userId })
      .leftJoinAndSelect('chat.participants', 'participant')
      .orderBy('chat.createdAt', 'DESC')
      .getMany();
  }

  async findSummariesForUser(userId: string) {
    const chats = await this.findAllForUser(userId);
    if (chats.length === 0) return [];
    const ids = chats.map((chat) => chat.id);

    const lastRows: LastMessageRow[] = await this.messages.query(
      `SELECT DISTINCT ON (m."chatId") m."chatId", m.id, m.content, m."createdAt",
              u.id AS "senderId", u.name AS "senderName"
       FROM messages m
       JOIN users u ON u.id = m."senderId"
       WHERE m."chatId" = ANY($1)
       ORDER BY m."chatId", m."createdAt" DESC`,
      [ids],
    );

    const unreadRows: UnreadRow[] = await this.messages.query(
      `SELECT m."chatId", COUNT(*)::int AS count
       FROM messages m
       LEFT JOIN chat_read_states r
         ON r."chatId" = m."chatId" AND r."userId" = $1
       WHERE m."chatId" = ANY($2)
         AND m."senderId" <> $1
         AND (r."lastReadAt" IS NULL OR m."createdAt" > r."lastReadAt")
       GROUP BY m."chatId"`,
      [userId, ids],
    );

    const lastByChat = new Map(lastRows.map((row) => [row.chatId, row]));
    const unreadByChat = new Map(
      unreadRows.map((row) => [row.chatId, row.count]),
    );

    return chats.map((chat) => {
      const last = lastByChat.get(chat.id);
      return {
        ...chat,
        lastMessage: last
          ? {
              id: last.id,
              chatId: chat.id,
              content: last.content,
              createdAt: last.createdAt,
              sender: { id: last.senderId, name: last.senderName },
            }
          : null,
        unreadCount: unreadByChat.get(chat.id) ?? 0,
      };
    });
  }

  async findOneForUser(chatId: string, userId: string) {
    const chat = await this.chats
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'me', 'me.id = :userId', { userId })
      .leftJoinAndSelect('chat.participants', 'participant')
      .where('chat.id = :chatId', { chatId })
      .getOne();

    if (!chat) throw new NotFoundException('Chat no encontrado');
    return chat;
  }

  async markAsRead(chatId: string, userId: string) {
    await this.findOneForUser(chatId, userId);

    const existing = await this.readStates.findOne({
      where: { chat: { id: chatId }, user: { id: userId } },
    });
    const state =
      existing ??
      this.readStates.create({ chat: { id: chatId }, user: { id: userId } });
    state.lastReadAt = new Date();
    await this.readStates.save(state);

    return { ok: true };
  }

  isParticipant(chatId: string, userId: string) {
    return this.chats
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'p', 'p.id = :userId', { userId })
      .where('chat.id = :chatId', { chatId })
      .getExists();
  }

  async findIdsForUser(userId: string) {
    const rows = await this.chats
      .createQueryBuilder('chat')
      .select('chat.id', 'id')
      .innerJoin('chat.participants', 'p', 'p.id = :userId', { userId })
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  private async findDirectChatId(userA: string, userB: string) {
    const chat = await this.chats
      .createQueryBuilder('chat')
      .select('chat.id', 'id')
      .innerJoin('chat.participants', 'p')
      .where('chat.isGroup = false')
      .andWhere('p.id IN (:...ids)', { ids: [userA, userB] })
      .groupBy('chat.id')
      .having('COUNT(DISTINCT p.id) = 2')
      .getRawOne<{ id: string }>();
    return chat?.id ?? null;
  }
}
