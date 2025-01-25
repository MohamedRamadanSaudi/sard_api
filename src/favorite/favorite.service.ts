import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) { }

  async add(userId: string, createFavoriteDto: CreateFavoriteDto) {
    const { bookId } = createFavoriteDto;

    // Check if the book exists
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Check if the favorite already exists
    const existingFavorite = await this.prisma.favorite.findFirst({
      where: { userId, bookId },
    });

    if (existingFavorite) {
      throw new NotFoundException('Book is already in favorites');
    }

    // Create the favorite
    return this.prisma.favorite.create({
      data: {
        userId,
        bookId,
      },
      include: { book: true }, // Include book details in the response
    });
  }

  async remove(userId: string, bookId: string) {
    // Check if the favorite exists
    const favorite = await this.prisma.favorite.findFirst({
      where: {
        userId,
        bookId,
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    // Delete the favorite
    return this.prisma.favorite.delete({
      where: {
        id: favorite.id,
      }
    });
  }

  async list(userId: string) {
    // Fetch all favorites for the user
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { book: true }, // Include book details in the response
    });
  }
}