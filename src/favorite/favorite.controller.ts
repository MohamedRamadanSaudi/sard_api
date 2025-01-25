import { Controller, Get, Post, Body, Delete, Req, UseGuards } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  create(
    @Req() req,
    @Body() createFavoriteDto: CreateFavoriteDto
  ) {
    const userId = req.user.userId;
    return this.favoriteService.add(userId, createFavoriteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  findAll(@Req() req) {
    const userId = req.user.userId;
    return this.favoriteService.list(userId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  remove(
    @Req() req,
    @Body("bookId") bookId: string
  ) {
    const userId = req.user.userId;
    return this.favoriteService.remove(userId, bookId);
  }
}
