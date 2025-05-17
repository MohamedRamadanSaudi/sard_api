import { Module } from '@nestjs/common';
import { PaymobService } from './paymob.service';
import { PaymobController } from './paymob.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailsService } from 'src/mails/mails.service';
import VerificationCodeGenerator from 'src/utils/code-generator/VerificationCodeGenerator';

@Module({
  imports: [PrismaModule],
  controllers: [PaymobController],
  providers: [PaymobService, MailsService, VerificationCodeGenerator],
})
export class PaymobModule { }
