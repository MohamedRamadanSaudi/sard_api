import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(createBookDto: CreateBookDto) {
    return this.prisma.book.create({
      data: {
        ...createBookDto,
        rating: 0,
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

  async update(id: string, updateBookDto: UpdateBookDto) {
    await this.findOne(id); // Check if book exists

    return this.prisma.book.update({
      where: { id },
      data: updateBookDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check if book exists

    return this.prisma.book.delete({
      where: { id },
    });
  }
}
