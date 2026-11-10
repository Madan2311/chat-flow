import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof BadRequestException) {
      const client = host.switchToWs().getClient<Socket>();
      const response = exception.getResponse() as {
        message?: string | string[];
      };
      const message = Array.isArray(response.message)
        ? response.message[0]
        : response.message;

      client.emit('exception', {
        status: 'error',
        message: message ?? 'Datos inválidos',
      });
      return;
    }

    super.catch(exception, host);
  }
}
