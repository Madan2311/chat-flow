import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth.types';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findByChat(
    @CurrentUser() user: AuthUser,
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.findByChat(user.id, chatId, query);
  }
}
