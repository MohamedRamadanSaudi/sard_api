import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { PaymobService } from 'src/paymob/paymob.service';
import { ConfigModule } from '@nestjs/config';
import { MailsService } from 'src/mails/mails.service';
import VerificationCodeGenerator from 'src/utils/code-generator/VerificationCodeGenerator';

@Module({
  imports: [ConfigModule],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, JwtService, PaymobService, MailsService, VerificationCodeGenerator],
})
export class OrdersModule { }
