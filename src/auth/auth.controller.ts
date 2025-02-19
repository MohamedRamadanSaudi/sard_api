import { Controller, Post, Body, UnauthorizedException, ValidationPipe, Patch, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register.dto';
import { LoginUserDto } from './dto/login.dto';
import { ChangePasswordDto, CreateOtpDto, ResetOtpDto, ResetPasswordDto } from './dto/createOtp.dto';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body(ValidationPipe) registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Post('login')
  async login(@Body(ValidationPipe) loginUserDto: LoginUserDto) {
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('admin-login')
  adminLogin(@Body(ValidationPipe) loginData: LoginUserDto) {
    return this.authService.adminLogIn(loginData);
  }

  @Post('forget-password')
  forgetPassword(@Body(ValidationPipe) resetData: CreateOtpDto) {
    return this.authService.createPasswordOtp(resetData);
  }

  @Post('validate-password-otp')
  validatePasswordOtp(@Body() resetData: ResetOtpDto) {
    return this.authService.verifyPasswordOtp(resetData)
  }

  @Post('validate-email')
  validateEmail(@Body(ValidationPipe) resetData: CreateOtpDto) {
    return this.authService.createEmailOtp(resetData);
  }

  @Post('validate-email-otp')
  validateEmailOtp(@Body() resetData: ResetOtpDto) {
    return this.authService.verifyEmailOtp(resetData)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user')
  @Patch('change-password')
  changePassword(
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
    @Req() req: any
  ) {
    const userId = req.user.userId
    return this.authService.changePassword(userId, changePasswordDto)
  }

  @Patch('reset-password')
  resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto)
  }
}
