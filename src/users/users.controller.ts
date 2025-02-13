import { Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UpdateMeDto, UpdateUserDto } from './dto/updateUser.dto';
import { CreateUserDto } from './dto/createUser.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('check-streak')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  checkStreak(@Req() req) {
    return this.usersService.checkAndUpdateStreak(req.user.userId);
    // if the streak in the response is 0, show a message to the user he has earned 10 points
    // if the streak is 1, show a message to the user he started a streak
    // if the streak is 2 or more, show a message to the user to keep going
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getUsers() {
    return this.usersService.getUsers();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  getMe(@Req() req) {
    return this.usersService.getUser(req.user.userId);
  }

  @Get('me/home')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  getMeHome(@Req() req) {
    return this.usersService.getUserHomeData(req.user.userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @UseInterceptors(FileInterceptor('photo'))
  updateMe(
    @Req() req,
    @Body() updateMeDto: UpdateMeDto,
    @UploadedFile() photo: Express.Multer.File
  ) {
    return this.usersService.updateMe(req.user.userId, updateMeDto, photo);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateUserDto);
  }
}
