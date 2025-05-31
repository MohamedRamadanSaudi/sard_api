import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { parse } from 'path';
import { GoogleDriveService } from 'src/common/services/google-drive.service';
import { GroqService } from '../common/services/groq.service';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly groqService: GroqService,
  ) { }

  async create(
    createBookDto: CreateBookDto,
    cover?: Express.Multer.File,
    audio?: Express.Multer.File,
  ) {
    let coverUrl = '';
    let audioUrl = '';

    if (cover) {
      coverUrl = await this.cloudinaryService.uploadImage(cover);
    }

    if (audio) {
      audioUrl = await this.googleDriveService.uploadAudio(audio);
    }

    const { categoryId, authorId, ...restBookData } = createBookDto;

    // Convert single categoryId to array if needed
    const categoryIds = categoryId
      ? Array.isArray(categoryId)
        ? categoryId
        : [categoryId]
      : undefined; return this.prisma.book.create({
        data: {
          ...restBookData,
          is_free: typeof restBookData.is_free === 'string'
            ? restBookData.is_free === 'true'
            : restBookData.is_free,
          duration: parseInt(restBookData.duration as any) || 0,
          price: restBookData.price ? parseFloat(restBookData.price as any) : undefined,
          price_points: restBookData.price_points ? parseInt(restBookData.price_points as any) : undefined,
          cover: coverUrl,
          audio: audioUrl,
          rating: 0,
          authorId: authorId || undefined,
          BookCategory: categoryIds ? {
            create: categoryIds.map(catId => ({
              categoryId: catId,
            }))
          } : undefined,
        },
        include: {
          Author: true,
          BookCategory: {
            include: {
              category: true,
            },
          },
        },
      });
  }

  async addReview(bookId: string, numberOfStars: number, userId: string) {
    // Check if the user owns the book or has a completed order
    const userHasBook = await this.prisma.user.findFirst({
      where: {
        id: userId,
        myBooks: {
          some: { id: bookId }, // Check if the book exists in user's myBooks
        },
      },
    });

    const userHasCompletedOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        bookId,
        status: 'completed', // Ensure order is completed
      },
    });

    if (!userHasBook && !userHasCompletedOrder) {
      throw new ForbiddenException('You can only review books you own.');
    }

    // Check if the user has already reviewed this book
    const existingReview = await this.prisma.review.findFirst({
      where: {
        userId,
        bookId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this book.');
    }

    // Create a new review
    return await this.prisma.review.create({
      data: {
        userId,
        bookId,
        numberOfStars,
      },
    });
  }


  async findAll(userId: string, categoryId?: string, search?: string) {
    // Fetch user favorite book IDs first
    const userFavorites = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        favorites: {
          select: { bookId: true }
        }
      }
    });

    const favoriteBookIds = new Set(userFavorites?.favorites.map(fav => fav.bookId) || []);

    const books = await this.prisma.book.findMany({
      where: {
        AND: [
          categoryId
            ? {
              BookCategory: {
                some: {
                  categoryId: categoryId, // Filter by category
                },
              },
            }
            : {}, // If no categoryId is provided, ignore this filter
          search
            ? {
              title: {
                contains: search, // Search by book title
                mode: 'insensitive', // Case-insensitive search
              },
            }
            : {}, // If no search term is provided, ignore this filter
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        price_points: true,
        is_free: true,
        cover: true,
        Author: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      books: books.map(book => ({
        ...book,
        is_favorite: favoriteBookIds.has(book.id)
      }))
    };
  }

  async findAllForLandingPage(categoryId?: string, search?: string) {
    const books = await this.prisma.book.findMany({
      where: {
        AND: [
          categoryId
            ? {
              BookCategory: {
                some: {
                  categoryId: categoryId, // Filter by category
                },
              },
            }
            : {}, // If no categoryId is provided, ignore this filter
          search
            ? {
              title: {
                contains: search, // Search by book title
                mode: 'insensitive', // Case-insensitive search
              },
            }
            : {}, // If no search term is provided, ignore this filter
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        price_points: true,
        is_free: true,
        cover: true,
        Author: {
          select: {
            name: true,
          },
        },
      },
    });

    return books
  }

  async findAllForAdmin() {
    return await this.prisma.book.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        price_points: true,
        is_free: true,
        cover: true,
        Author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllBooksWithPoints(userId: string) {
    const books = await this.prisma.book.findMany({
      where: {
        price_points: { not: null }
      },
      select: {
        id: true,
        title: true,
        price_points: true,
        cover: true,
        Author: {
          select: {
            name: true,
          }
        }
      }
    })
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
      books: books.map(book => {
        const isFavorite = user.favorites.some(fav => fav.bookId === book.id);
        return {
          ...book,
          is_favorite: isFavorite
        }
      })
    }
  }

  async getRecommendationsBooks(userId: string) {
    // get random books with rating > 4 and with price (not free and not price_points)
    const books = await this.prisma.book.findMany({
      where: {
        rating: { gte: 4 },
        price: { not: null }
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        cover: true,
        Author: {
          select: {
            name: true,
          }
        }
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
      books: books.map(book => {
        const isFavorite = user.favorites.some(fav => fav.bookId === book.id);
        return {
          ...book,
          is_favorite: isFavorite
        }
      })
    }
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findFirst({
      where: { id },
      select: {
        id: true,
        cover: true,
        price_points: true,
        price: true,
        is_free: true,
        title: true,
        duration: true,
        description: true,
        Author: {
          select: {
            name: true,
            photo: true,
          }
        },
        BookCategory: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                photo: true
              }
            },
          },
        },
        // return reviews length
        _count: {
          select: {
            reviews: true
          }
        },
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    // get reviews average
    const reviews = await this.prisma.review.findMany({
      where: { bookId: id },
      select: {
        numberOfStars: true
      }
    });
    const reviewsCount = reviews.length;
    const reviewsSum = reviews.reduce((acc, curr) => acc + curr.numberOfStars, 0);
    const reviewsAverage = reviewsCount > 0 ? reviewsSum / reviewsCount : 0;

    // update book object with rating every time it's fetched " just for now :) ", because recommended books are fetched based on rating
    await this.prisma.book.update({
      where: { id },
      data: {
        rating: reviewsAverage
      }
    })

    return {
      ...book,
      rating: reviewsAverage
    };
  }

  async findOneForUpdateOrDelete(id: string) {
    const book = await this.prisma.book.findFirst({
      where: { id },
      include: {
        Author: true,
        BookCategory: {
          include: {
            category: true,
          },
        },
        reviews: true,
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return book;
  }

  async update(
    id: string,
    updateBookDto: UpdateBookDto,
    cover?: Express.Multer.File,
    audio?: Express.Multer.File,
  ) {
    const book = await this.findOneForUpdateOrDelete(id)

    let coverUrl = '';
    let audioUrl = '';

    if (cover) {
      if (book.cover) {
        const urlParts = book.cover.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = parse(publicIdWithExtension).name;
        await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`);
      }
      coverUrl = await this.cloudinaryService.uploadImage(cover);
    }

    if (audio) {
      if (book.audio) {
        await this.googleDriveService.deleteAudio(book.audio);
      }
      audioUrl = await this.googleDriveService.uploadAudio(audio);
    }

    const { categoryId, authorId, ...restBookData } = updateBookDto;

    // Convert single categoryId to array if needed
    const categoryIds = categoryId
      ? Array.isArray(categoryId)
        ? categoryId
        : [categoryId]
      : undefined;

    if (categoryIds) {
      await this.prisma.bookCategory.deleteMany({
        where: { bookId: id },
      });
    }

    return this.prisma.book.update({
      where: { id },
      data: {
        ...restBookData,
        duration: restBookData.duration ? parseInt(restBookData.duration as any) : undefined,
        price: restBookData.price ? parseFloat(restBookData.price as any) : undefined,
        price_points: restBookData.price_points ? parseInt(restBookData.price_points as any) : undefined,
        is_free: typeof restBookData.is_free === 'string'
          ? restBookData.is_free === 'true'
          : restBookData.is_free,
        ...(coverUrl && { cover: coverUrl }),
        ...(audioUrl && { audio: audioUrl }),
        authorId: authorId || undefined,
        BookCategory: categoryIds ? {
          create: categoryIds.map(catId => ({
            categoryId: catId,
          }))
        } : undefined,
      },
      include: {
        Author: true,
        BookCategory: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const book = await this.findOneForUpdateOrDelete(id);

    // Delete cover from Cloudinary if exists
    if (book.cover) {
      const urlParts = book.cover.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = parse(publicIdWithExtension).name;
      await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`);
    }

    // Delete audio file if exists
    if (book.audio) {
      await this.googleDriveService.deleteAudio(book.audio);
    }

    // First delete all related BookCategory records
    await this.prisma.bookCategory.deleteMany({
      where: { bookId: id },
    });

    // Then delete the book
    return this.prisma.book.delete({
      where: { id },
    });
  }

  async generateBookSummary(id: string) {
    const book = await this.findOne(id);
    const summary = await this.groqService.summarizeBook(book.description, "default-user");
    return { summary };
  }

  async suggestDescription(title: string, genre: string) {
    const description = await this.groqService.generateBookDescription(title, genre, "default-user");
    return { description };
  }
}
