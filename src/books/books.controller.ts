import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFiles, Query, Req } from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AudioService } from 'src/common/services/text-to-speech.service';

@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly textToSpeechService: AudioService,
  ) { }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cover', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]))
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async create(
    @UploadedFiles() files: { cover?: Express.Multer.File[], audio?: Express.Multer.File[] },
    @Body() createBookDto: CreateBookDto,
  ) {
    const cover = files.cover?.[0];
    const audio = files.audio?.[0];
    return this.booksService.create(createBookDto, cover, audio);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  findAll(
    @Req() req,
    @Query('category_id') category_id: string,
    @Query('search') search: string,
  ) {
    const userId = req.user.userId; // Extract user ID from JWT
    return this.booksService.findAll(userId, category_id, search);
  }

  @Get('landing-page')
  findAllForLandingPage(
    @Query('category_id') category_id: string,
    @Query('search') search: string,
  ) {
    return this.booksService.findAllForLandingPage(category_id, search);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllForAdmin() {
    return this.booksService.findAllForAdmin();
  }


  @Get('points')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  findAllBooksWithPoints(
    @Req() req
  ) {
    const userId = req.user.userId; // Extract user ID from JWT
    return this.booksService.findAllBooksWithPoints(userId);
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  getRecommendationsBooks(
    @Req() req
  ) {
    const userId = req.user.userId; // Extract user ID from JWT
    return this.booksService.getRecommendationsBooks(userId);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  async addReview(
    @Param('id') bookId: string,
    @Body('numberOfStars') numberOfStars: number,
    @Req() req
  ) {
    const userId = req.user.userId; // Extract user ID from JWT
    return await this.booksService.addReview(bookId, numberOfStars, userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  findOne(
    @Param('id') id: string,
    @Req() req
  ) {
    const userId = req.user.userId; // Extract user ID from JWT
    if (req.user.role === 'admin') {
      return this.booksService.findOne(id, null);
    }
    return this.booksService.findOne(id, userId);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'cover', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]))
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @UploadedFiles() files: { cover?: Express.Multer.File[], audio?: Express.Multer.File[] },
  ) {
    const cover = files.cover?.[0];
    const audio = files.audio?.[0];
    return this.booksService.update(id, updateBookDto, cover, audio);
  }


  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.booksService.remove(id);
  }

  @Get(':id/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  async getBookSummary(@Param('id') id: string) {
    return this.booksService.generateBookSummary(id);
  }

  @Post('suggest-description')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async suggestDescription(
    @Body('title') title: string,
    @Body('genre') genre: string,
  ) {
    return this.booksService.suggestDescription(title, genre);
  }

  @Post('text-to-speech')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  async convertTextToSpeech(@Body() body: { text: string }) {
    const url = await this.textToSpeechService.generateAudioFromText(body.text);
    return { url };
  }
}
