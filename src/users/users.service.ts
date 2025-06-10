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


  async getUserHomeData(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        photo: true,
        streak: true,
        points: true,
        lastLoginDate: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    } const today = new Date();
    const lastLoginDate = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

    // Check if the user already logged in today
    const isAlreadyLoggedInToday = lastLoginDate && this.isSameDay(lastLoginDate, today);

    // Check if the user logged in yesterday (consecutive login)
    const isConsecutiveLogin = lastLoginDate && this.isConsecutiveDay(lastLoginDate, today);

    let updatedStreak = user.streak;
    let updatedPoints = user.points;
    let message: string;    // If user hasn't logged in today, process the login
    if (!isAlreadyLoggedInToday) {
      if (isConsecutiveLogin) {
        // User logged in yesterday, increment streak
        updatedStreak += 1;
        if (updatedStreak === 7) {
          // After 7 consecutive days, award 10 points and reset streak to 0
          updatedPoints += 10;
          updatedStreak = 0;
          message = "رائع! لقد حصلت على 10 نقاط 👏 استمر في استخدام التطبيق يوميًا لبدء سلسلة إنجازاتك!";
        } else {
          // Continue streak without points
          if (updatedStreak === 1) {
            message = "أحسنت! لقد بدأت سلسلة إنجازاتك 🔥 حاول الحفاظ على استمرارها يوميًا!";
          } else {
            message = `سلسلتك مستمرة منذ ${updatedStreak} أيام! 💪 لا تتوقف الآن، استمر لتحقيق المزيد!`;
          }
        }
      } else {
        // User didn't log in yesterday, reset streak
        if (lastLoginDate === null) {
          // First time login
          updatedStreak = 1;
        } else {
          // Broke the streak, start new one
          updatedStreak = 1;
        }
        message = "أحسنت! لقد بدأت سلسلة إنجازاتك 🔥 حاول الحفاظ على استمرارها يوميًا!";
      }

      // Update the user's streak, points, and last login date
      await this.prisma.user.update({
        where: { id },
        data: {
          streak: updatedStreak,
          points: updatedPoints,
          lastLoginDate: today,
        },
      });
    } else {
      // User already logged in today, just show appropriate message based on current streak
      if (updatedStreak === 0) {
        message = "رائع! لقد حصلت على 10 نقاط 👏 استمر في استخدام التطبيق يوميًا لبدء سلسلة إنجازاتك!";
      } else if (updatedStreak === 1) {
        message = "أحسنت! لقد بدأت سلسلة إنجازاتك 🔥 حاول الحفاظ على استمرارها يوميًا!";
      } else {
        message = `سلسلتك مستمرة منذ ${updatedStreak} أيام! 💪 لا تتوقف الآن، استمر لتحقيق المزيد!`;
      }
    }

    return {
      name: user.name,
      photo: user.photo,
      streak: updatedStreak,
      points: updatedPoints,
      message,
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
        phone: true,
        isVerified: true,
      }
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
        phone: true,
      },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique(
      {
        where: { id },
        include: {
          orders: true,
          favorites: true,
        }
      }
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if the user has any completed orders
    const hasCompletedOrders = user.orders.some(order => order.status === 'completed');

    if (hasCompletedOrders) {
      throw new BadRequestException('User has completed orders, cannot delete');
    }

    // If there are favorites, delete them
    if (user.favorites.length > 0) {
      await this.prisma.favorite.deleteMany({
        where: { userId: id }
      });
    }

    // Delete any pending orders
    if (user.orders.length > 0) {
      await this.prisma.order.deleteMany({
        where: { userId: id }
      });
    }

    // Delete user's photo from Cloudinary if it exists
    if (user.photo) {
      const urlParts = user.photo.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = parse(publicIdWithExtension).name;

      await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`);
    }

    // Delete the user
    await this.prisma.user.delete({ where: { id } });

    return { message: 'User deleted successfully' };
  }

  // Helper function to check if two dates are consecutive days
  private isConsecutiveDay(previousDate: Date, currentDate: Date): boolean {
    if (this.isSameDay(previousDate, currentDate)) {
      return false;
    }

    const previousDay = new Date(previousDate);
    previousDay.setHours(0, 0, 0, 0); // Normalize to start of the day

    const currentDay = new Date(currentDate);
    currentDay.setHours(0, 0, 0, 0); // Normalize to start of the day

    const timeDifference = currentDay.getTime() - previousDay.getTime();
    const dayDifference = timeDifference / (1000 * 60 * 60 * 24); // Convert to days

    return dayDifference === 1; // True if the difference is exactly 1 day
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }
}
