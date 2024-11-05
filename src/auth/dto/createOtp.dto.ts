import { IsEmail, IsLowercase, IsString } from "class-validator";

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
    password: string;
}