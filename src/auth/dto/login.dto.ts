import { IsEmail, IsLowercase, IsString } from "class-validator";

export class LoginUserDto {
  @IsEmail()
  @IsLowercase()
  email: string;

  @IsString()
  password: string;
}