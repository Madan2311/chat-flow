import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Trim } from '../../common/transforms';

export class CreateChatDto {
  @IsArray({ message: 'Los participantes deben ser una lista' })
  @ArrayNotEmpty({ message: 'Debes seleccionar al menos un usuario' })
  @IsUUID('all', {
    each: true,
    message: 'Uno de los participantes tiene un identificador inválido',
  })
  participantIds: string[];

  @IsOptional()
  @Trim()
  @IsString({ message: 'El nombre del grupo debe ser texto' })
  @MaxLength(100, {
    message: 'El nombre del grupo no puede superar los 100 caracteres',
  })
  name?: string;
}
