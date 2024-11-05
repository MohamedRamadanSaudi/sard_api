import { IsEmail, IsLowercase, IsString } from "class-validator";

export class RegisterUserDto {
  @IsEmail()
  @IsLowercase()
  email: string;

  @IsString()
  password: string;
}