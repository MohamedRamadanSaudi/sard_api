import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Logger } from '@nestjs/common';
import { CreateOtpDto, ResetOtpDto, ResetPasswordDto } from './dto/createOtp.dto';
import { MailsService } from 'src/mails/mails.service';
import { RegisterUserDto } from './dto/register.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import VerificationCodeGenerator from 'src/utils/code-generator/VerificationCodeGenerator';
import { LoginUserDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailsService,
    private verificationCodeGenerator: VerificationCodeGenerator,
    private logger: Logger,
  ) { }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      delete user.password;
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: "user" };
    this.logger.log(`User: ${user.email} logged in`);
    return {
      token: this.jwtService.sign(payload),
    };
  }

  async adminLogIn(loginData: LoginUserDto) {
    const admin = await this.prisma.admin.findFirst({ where: { email: loginData.email } });

    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
    }

    if (await bcrypt.compare(loginData.password, admin.password)) {
      const payload = { email: admin.email, sub: admin.id, role: "admin" };
      return {
        token: this.jwtService.sign(payload),
      };
    }

    throw new HttpException('Invalid credentials', HttpStatus.BAD_REQUEST);
  }

  async register(user: RegisterUserDto) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser: User = await this.prisma.user.create({ data: { ...user, password: hashedPassword } as User })

    if (newUser) {
      await this.mailService.sendEmailVerificationCode(newUser.email)
    }
    delete newUser.password
    return newUser
  }

  async createPasswordOtp(createOtpDto: CreateOtpDto) {
    const user = await this.usersService.findByEmail(createOtpDto.email);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    await this.mailService.sendEmailResetPasswordCode(createOtpDto.email)

    return {
      status: 'success',
      message: 'Code sent to your email',
    }
  }

  async verifyPasswordOtp(otpDto: ResetOtpDto) {
    const hashed = this.verificationCodeGenerator.hash(otpDto.code)
    const user = await this.prisma.user.findFirst({ where: { email: otpDto.email } })

    if (!user) {
      throw new HttpException('Invalid code', HttpStatus.BAD_REQUEST);
    }

    if (user.passwordResetOtp !== hashed) {
      throw new HttpException('Invalid code', HttpStatus.BAD_REQUEST);
    }

    return {
      status: 'success',
      message: 'Code verified',
    }
  }

  async createEmailOtp(createOtpDto: CreateOtpDto) {
    const user = await this.usersService.findByEmail(createOtpDto.email);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    await this.mailService.sendEmailVerificationCode(createOtpDto.email)

    return {
      status: 'success',
      message: 'Code sent to your email',
    }
  }

  async verifyEmailOtp(otpDto: ResetOtpDto) {
    const hashed = this.verificationCodeGenerator.hash(otpDto.code)
    const user = await this.prisma.user.findFirst({ where: { otp: hashed } })

    if (!user) {
      throw new HttpException('Invalid code', HttpStatus.BAD_REQUEST);
    }

    // Update the user's isVerified field to true
    await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true, otp: null, otpExpiry: null } })

    return {
      status: 'success',
      message: 'Email verified successfully',
    }
  }

  async resetPassword(resetData: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { email: resetData.email } })

    const hashedPassword = await bcrypt.hash(resetData.password, 10);
    await this.prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword, passwordResetOtp: null, passwordResetOtpExpiry: null } })

    return {
      status: 'success',
      message: 'Password reset successfully',
    }
  }
}
