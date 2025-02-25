import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { parse } from 'path';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async create(createAuthorDto: CreateAuthorDto, photo?: Express.Multer.File) {
    // check if author already exists
    const authorExists = await this.prisma.author.findFirst({
      where: {
        name: createAuthorDto.name,
      },
    });
    if (authorExists) {
      throw new NotFoundException('Author already exists');
    }

    let photoUrl = '';
    if (photo) {
      photoUrl = await this.cloudinaryService.uploadImage(photo);
    }
    const author = await this.prisma.author.create({
      data: {
        ...createAuthorDto,
        photo: photoUrl,
      },
    });
    return author;
  }

  findAll() {
    return this.prisma.author.findMany();
  }

  async findOne(id: string) {
    const author = await this.prisma.author.findUnique({ where: { id } });
    if (!author) {
      throw new NotFoundException('Author not found');
    }
    return author;
  }

  async update(id: string, updateAuthorDto: UpdateAuthorDto, photo?: Express.Multer.File) {
    const author = await this.prisma.author.findUnique({
      where: { id },
      select: {
        photo: true,
      },
    });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    let photoUrl = '';
    if (photo) {
      photoUrl = await this.cloudinaryService.uploadImage(photo);
    }

    if (author?.photo) {
      const urlParts = author.photo.split('/'); // Split the URL
      const publicIdWithExtension = urlParts[urlParts.length - 1]; // Get the last part
      const publicId = parse(publicIdWithExtension).name; // Remove the file extension

      await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`); // Adjust the folder path if necessary
    }

    const result = await this.prisma.author.update({
      where: { id },
      data: { ...updateAuthorDto, photo: photoUrl },
    });
    return result;
  }

  async remove(id: string) {
    const author = await this.prisma.author.findFirst({ where: { id } });
    if (!author) {
      throw new NotFoundException('Author not found');
    }
    if (author?.photo) {
      const urlParts = author.photo.split('/'); // Split the URL
      const publicIdWithExtension = urlParts[urlParts.length - 1]; // Get the last part
      const publicId = parse(publicIdWithExtension).name; // Remove the file extension

      await this.cloudinaryService.deleteImage(`sard_uploads/${publicId}`); // Adjust the folder path if necessary
    }
    await this.prisma.author.delete({ where: { id } });
    return { message: 'Author deleted successfully' };
  }
}
