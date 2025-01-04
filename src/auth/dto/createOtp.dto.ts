import { IsEmail, IsLowercase, IsString, MinLength } from "class-validator";

export class CreateOtpDto {
    @IsEmail()
    @IsLowercase()
    email: string;
}

export class ResetOtpDto {
    @IsString()
    code: string;

    @IsEmail()
    @IsLowercase()
    email: string;
}

export class ResetPasswordDto {
    @IsEmail()
    @IsLowercase()
    email: string;

    @IsString()
    old_password: string;

    @IsString()
    @MinLength(6)
    new_password: string;
}