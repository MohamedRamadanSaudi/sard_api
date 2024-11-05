import { IsEmail, IsLowercase, IsString } from 'class-validator';


export class CreateAdminDto {
  @IsEmail()
  @IsLowercase()
  email: string;

  @IsString()
  password: string;
}

