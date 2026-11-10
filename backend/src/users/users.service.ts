import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsSelect, In, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';

const PUBLIC_FIELDS: FindOptionsSelect<User> = {
  id: true,
  name: true,
  email: true,
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: string) {
    return this.users.findOne({ where: { id } });
  }

  findByEmailWithPassword(email: string) {
    return this.users.findOne({
      where: { email },
      select: { ...PUBLIC_FIELDS, password: true },
    });
  }

  async create(data: Pick<User, 'name' | 'email' | 'password'>) {
    try {
      return await this.users.save(this.users.create(data));
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('El correo ya está registrado');
      }
      throw error;
    }
  }

  findAllExcept(id: string) {
    return this.users.find({
      where: { id: Not(id) },
      select: PUBLIC_FIELDS,
      order: { name: 'ASC' },
    });
  }

  findByIds(ids: string[]) {
    return this.users.find({ where: { id: In(ids) }, select: PUBLIC_FIELDS });
  }
}
