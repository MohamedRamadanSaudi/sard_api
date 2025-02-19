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

export class ChangePasswordDto {
    @IsString()
    old_password: string;

    @IsString()
    @MinLength(6)
    new_password: string;
}

export class ResetPasswordDto {
    @IsString()
    @MinLength(6)
    new_password: string;

    @IsEmail()
    @IsLowercase()
    email: string;
}
