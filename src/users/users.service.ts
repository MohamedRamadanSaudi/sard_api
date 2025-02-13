import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UpdateMeDto, UpdateUserDto } from './dto/updateUser.dto';
import { CreateUserDto } from './dto/createUser.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { parse } from 'path';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async createUser(createUserDto: CreateUserDto) {
    // if user already exists, send an error to the client
    const existingUser = await this.findByEmail(createUserDto.email.toLocaleLowerCase());
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        email: createUserDto.email.toLocaleLowerCase(),
        password: hashedPassword,
        name: createUserDto.name,
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

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async getUserHomeData(id: string) {
    return await this.prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        photo: true,
        streak: true,
        points: true,
      },
    });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: { id: true, email: true, isVerified: true },
    });
  }

  async updateMe(id: string, updateMeDto: UpdateMeDto, photo?: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    let photoUrl = user.photo;
    if (photo) {
      photoUrl = await this.cloudinaryService.uploadImage(photo);

      if (user?.photo) {
        const urlParts = user.photo.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = parse(publicIdWithExtension).name;

        await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`);
      }
    }

    return await this.prisma.user.update({
      where: { id },
      data: { ...updateMeDto, photo: photoUrl },
      select: {
        name: true,
        photo: true,
        gender: true,
        birthday: true,
        phone: true,
      },
    });
  }

}
