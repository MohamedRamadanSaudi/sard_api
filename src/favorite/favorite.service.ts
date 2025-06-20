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
    await this.prisma.favorite.create({
      data: {
        userId,
        bookId,
      },
      include: { book: true }, // Include book details in the response
    });

    return { message: 'Book added to favorites' };
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
    await this.prisma.favorite.delete({
      where: {
        id: favorite.id,
      }
    });

    return { message: 'Favorite removed' };
  }

  async list(userId: string) {
    // Fetch all favorites for the user
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: {
        book: {
          select: {
            id: true,
            title: true,
            description: true,
            cover: true,
            Author: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    // get user favorite books and modify the response to include is_favorite field and set it to true if the book is in the user favorite books
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        favorites: {
          select: {
            bookId: true
          }
        }
      }
    });


    return {
      favorites: favorites.map(favorite => {
        const isFavorite = user.favorites.some(fav => fav.bookId === favorite.book.id);
        return {
          book: {
            ...favorite.book,
            is_favorite: isFavorite
          },
        }
      })

    }
  }
}