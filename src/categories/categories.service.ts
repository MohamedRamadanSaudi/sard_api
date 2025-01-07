import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { parse } from 'path';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(createCategoryDto: CreateCategoryDto, photo?: Express.Multer.File) {
    let photoUrl = '';
    if (photo) {
      photoUrl = await this.cloudinaryService.uploadImage(photo);
    }
    const category = await this.prisma.category.create({
      data: {
        ...createCategoryDto,
        photo: photoUrl,
      },
    });
    return category;
  }

  findAll() {
    return this.prisma.category.findMany();
  }

  findOne(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, photo?: Express.Multer.File) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        photo: true,
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let photoUrl = '';
    if (photo) {
      photoUrl = await this.cloudinaryService.uploadImage(photo);
    }

    if (category?.photo) {
      const urlParts = category.photo.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = parse(publicIdWithExtension).name;

      await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`);
    }

    const result = await this.prisma.category.update({
      where: { id },
      data: { ...updateCategoryDto, photo: photoUrl },
    });
    return result;
  }

  async remove(id: string) {
    const category = await this.prisma.category.findFirst({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    if (category?.photo) {
      const urlParts = category.photo.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = parse(publicIdWithExtension).name;

      await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`);
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
