import {
  Controller,
  Post,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/createAdminDto';
import { Admin } from '@prisma/client';

@Controller('admins')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }
  @Post()
  async create(
    @Body() admin: CreateAdminDto,
  ) {
    return await this.adminService.create(admin as Admin);
  }
}
