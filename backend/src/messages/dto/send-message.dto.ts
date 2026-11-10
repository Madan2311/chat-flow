import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms';

export class SendMessageDto {
  @IsUUID('all', { message: 'El identificador del chat es inválido' })
  chatId: string;

  @Trim()
  @IsString({ message: 'El mensaje debe ser texto' })
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(2000, {
    message: 'El mensaje no puede superar los 2000 caracteres',
  })
  content: string;
}
