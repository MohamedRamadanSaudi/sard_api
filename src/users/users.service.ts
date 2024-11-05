import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async createUser(email: string, password: string) {
    // if user already exists, send an error to the client
    const existingUser = await this.findByEmail(email.toLocaleLowerCase());
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: {
        email: email.toLocaleLowerCase(),
        password: hashedPassword,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getUsers() {
    // ignore the password
    return this.prisma.user.findMany({ select: { id: true, email: true } });
  }
}
