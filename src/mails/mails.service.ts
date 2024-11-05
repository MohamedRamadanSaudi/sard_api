import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as Joi from 'joi';
import * as path from 'path';
import * as pug from 'pug';
import { PrismaService } from 'src/prisma/prisma.service';
import VerificationCodeGenerator from 'src/utils/code-generator/VerificationCodeGenerator';
import { joiValidator } from 'src/utils/joi/joiValidator';

@Injectable()
export class MailsService {
  private transporter: nodemailer.Transporter;
  private readonly from: string;
  constructor(
    private verificationCodeGenerator: VerificationCodeGenerator,
    private prisma: PrismaService,
  ) {
    this.from = process.env.EMAIL_FROM;
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async generateCode(): Promise<{ code: string, hashedCode: string }> {
    const code = this.verificationCodeGenerator.generateCode();
    const hashedCode = this.verificationCodeGenerator.hash(code);
    return { code, hashedCode };
  }

  private async renderTemplate(templatePath: string, context: Record<string, any>): Promise<string> {
    try {
      return pug.renderFile(templatePath, context);
    } catch (err) {
      console.error('Error rendering Pug template:', err);
      throw new HttpException('Error rendering email template', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async sendMail(to: string, code: string, expireTime: Date, subject: string, templatePath: string) {
    try {
      const html = await this.renderTemplate(templatePath, { code, expire: expireTime });
      await this.transporter.sendMail({
        to: to,
        from: this.from,
        subject: subject,
        html: html,
      });
    } catch (err) {
      console.error('Error sending email:', err);
      throw new HttpException("Error while sending email", HttpStatus.BAD_REQUEST);
    }
  }

  async sendEmailResetPasswordCode(email: string) {
    joiValidator({ email: email }, Joi.object({ email: Joi.string().email().required() }));
    const { code, hashedCode } = await this.generateCode();
    const expiryDate = new Date();
    // expiry date is 10 minutes from now
    expiryDate.setMinutes(expiryDate.getMinutes() + 10);
    const templatePath = path.join(process.cwd(), 'src', 'mails', 'templates', 'forgetPassword.pug');
    // Create a new reset OTP document with the expiry date
    await this.prisma.user.update(
      {
        where: { email },
        data: {
          passwordResetOtp: hashedCode,
          passwordResetOtpExpiry: expiryDate,
        },
      }
    );
    // Send the email
    await this.sendMail(email, code, expiryDate, "Reset Password", templatePath);
  }

  async sendEmailVerificationCode(email: string) {
    joiValidator({ email: email }, Joi.object({ email: Joi.string().email().required() }));
    const { code, hashedCode } = await this.generateCode();
    const expiryDate = new Date();
    // expiry date is 10 minutes from now
    expiryDate.setMinutes(expiryDate.getMinutes() + 10);
    const templatePath = path.join(process.cwd(), 'src', 'mails', 'templates', 'verification.pug');
    // Create a new verification OTP document with the expiry
    await this.prisma.user.update({
      where: { email },
      data: {
        otp: hashedCode,
        otpExpiry: expiryDate,
      },
    });
    // Send the email
    this.sendMail(email, code, expiryDate, "Email Verification", templatePath);
  }
}
