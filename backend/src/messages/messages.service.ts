import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatsService } from '../chats/chats.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Message } from './entities/message.entity';
import { toMessageResponse } from './message.mapper';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly chatsService: ChatsService,
  ) {}

  async create(senderId: string, dto: SendMessageDto) {
    const saved = await this.messages.save(
      this.messages.create({
        content: dto.content,
        sender: { id: senderId },
        chat: { id: dto.chatId },
      }),
    );
    const message = await this.messages.findOneOrFail({
      where: { id: saved.id },
      relations: { sender: true },
    });
    return toMessageResponse(message, dto.chatId);
  }

  async findByChat(
    userId: string,
    chatId: string,
    { limit, before }: GetMessagesQueryDto,
  ) {
    if (!(await this.chatsService.isParticipant(chatId, userId))) {
      throw new NotFoundException('Chat no encontrado');
    }

    const query = this.messages
      .createQueryBuilder('message')
      .innerJoinAndSelect('message.sender', 'sender')
      .where('message.chat = :chatId', { chatId })
      .orderBy('message.createdAt', 'DESC')
      .take(limit);

    if (before) query.andWhere('message.createdAt < :before', { before });

    const rows = await query.getMany();
    return rows.reverse().map((message) => toMessageResponse(message, chatId));
  }
}
