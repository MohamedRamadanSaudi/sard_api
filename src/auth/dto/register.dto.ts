import { IsEmail, IsLowercase, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterUserDto {
  @IsEmail()
  @IsLowercase()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}