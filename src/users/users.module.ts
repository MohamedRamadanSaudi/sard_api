import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  providers: [PrismaService, UsersService, JwtService, CloudinaryService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
