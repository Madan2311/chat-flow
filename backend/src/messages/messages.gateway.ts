import { UseFilters } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsExceptionsFilter } from '../common/filters/ws-exceptions.filter';
import { AuthUser, JwtPayload } from '../auth/types/auth.types';
import { Chat } from '../chats/entities/chat.entity';
import { ChatsService } from '../chats/chats.service';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

interface AuthSocket extends Socket {
  data: { user: AuthUser };
}

const chatRoom = (chatId: string) => `chat:${chatId}`;
const userRoom = (userId: string) => `user:${userId}`;

@UseFilters(WsExceptionsFilter)
@WebSocketGateway()
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string') return next(new Error('No autenticado'));

      try {
        const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
        socket.data.user = {
          id: payload.sub,
          email: payload.email,
        } satisfies AuthUser;
        next();
      } catch {
        next(new Error('Sesión inválida o expirada'));
      }
    });
  }

  async handleConnection(client: AuthSocket) {
    const { id } = client.data.user;
    const chatIds = await this.chatsService.findIdsForUser(id);
    await client.join([userRoom(id), ...chatIds.map(chatRoom)]);
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const { id: userId } = client.data.user;

    if (!(await this.chatsService.isParticipant(dto.chatId, userId))) {
      throw new WsException('No perteneces a este chat');
    }

    const message = await this.messagesService.create(userId, dto);
    this.server.to(chatRoom(dto.chatId)).emit('message:new', message);
    return { ok: true };
  }

  @OnEvent('chat.created')
  handleChatCreated(chat: Chat) {
    const rooms = chat.participants.map((participant) =>
      userRoom(participant.id),
    );
    this.server.in(rooms).socketsJoin(chatRoom(chat.id));
    this.server.to(rooms).emit('chat:new', chat);
  }
}
