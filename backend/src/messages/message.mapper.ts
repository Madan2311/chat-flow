import { Message } from './entities/message.entity';

export function toMessageResponse(message: Message, chatId: string) {
  return {
    id: message.id,
    chatId,
    content: message.content,
    createdAt: message.createdAt,
    sender: { id: message.sender.id, name: message.sender.name },
  };
}
