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
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }
    return user;
  }

  async getUsers() {
    // ignore the password
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        isVerified: true,
      }
    });
  }


  async checkAndUpdateStreak(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        lastLoginDate: true,
        streak: true,
        points: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const today = new Date();
    const lastLoginDate = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

    // Check if the user logged in yesterday
    const isConsecutiveLogin = lastLoginDate && this.isConsecutiveDay(lastLoginDate, today);

    let updatedStreak = user.streak;
    let updatedPoints = user.points;

    if (isConsecutiveLogin) {
      updatedStreak += 1; // Increment streak
      if (updatedStreak === 7) {
        updatedPoints += 10; // Award 10 points
        updatedStreak = 0; // Reset streak
      }
    } else {
      updatedStreak = 1; // Reset streak to 1 for the current login
    }

    // Update the user's streak, points, and last login date
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        streak: updatedStreak,
        points: updatedPoints,
        lastLoginDate: today,
      },
    });

    return {
      message: 'Streak updated successfully',
      streak: updatedStreak,
      points: updatedPoints,
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        photo: true,
        gender: true,
        birthday: true,
        phone: true,
      }
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async getUserHomeData(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        name: true,
        photo: true,
        streak: true,
        points: true,
      },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
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

  // Helper function to check if two dates are consecutive days
  private isConsecutiveDay(previousDate: Date, currentDate: Date): boolean {
    const previousDay = new Date(previousDate);
    previousDay.setHours(0, 0, 0, 0); // Normalize to start of the day

    const currentDay = new Date(currentDate);
    currentDay.setHours(0, 0, 0, 0); // Normalize to start of the day

    const timeDifference = currentDay.getTime() - previousDay.getTime();
    const dayDifference = timeDifference / (1000 * 60 * 60 * 24); // Convert to days

    return dayDifference === 1; // True if the difference is exactly 1 day
  }

}
