import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { parse } from 'path';
import { GoogleDriveService } from 'src/common/services/google-drive.service';

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly googleDriveService: GoogleDriveService,
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
      : undefined;

    return this.prisma.book.create({
      data: {
        ...restBookData,
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

  async findAll() {
    return this.prisma.book.findMany({
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

  async findOne(id: string) {
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
    const book = await this.findOne(id);

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
    const book = await this.findOne(id);

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
}
