import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { GoogleDriveService } from 'src/common/services/google-drive.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { GroqService } from '../common/services/groq.service';
import { PlayService } from '../common/services/play.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot(),
  ],
  controllers: [BooksController],
  providers: [
    BooksService,
    PrismaService,
    JwtService,
    CloudinaryService,
    GoogleDriveService,
    GroqService,
    PlayService,
  ],
  exports: [BooksService],
})
export class BooksModule { }
