import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from './dto/updateUser.dto';

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

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isVerified: true },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: { id: true, email: true, isVerified: true },
    });
  }

}
