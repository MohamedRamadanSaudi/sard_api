import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { MailsService } from 'src/mails/mails.service';
import VerificationCodeGenerator from 'src/utils/code-generator/VerificationCodeGenerator';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '90d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, MailsService, VerificationCodeGenerator],
  exports: [AuthService, JwtModule],
  controllers: [AuthController],
})
export class AuthModule { }
