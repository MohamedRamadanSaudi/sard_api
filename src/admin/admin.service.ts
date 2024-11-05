import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { Admin } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }
  async create(admin: Admin): Promise<Admin> {
    // check if the email is already in use
    const existingAdmin = await this.findOneByEmail(admin.email);
    if (existingAdmin) {
      throw new NotFoundException('Email already in use');
    }
    admin.password = await bcrypt.hash(admin.password, 10);
    return await this.prisma.admin.create({
      data: {
        ...admin,
      },
    });
  }
  async findOneByEmail(email: string): Promise<Admin> {
    return await this.prisma.admin.findUnique({ where: { email } });
  }
}
