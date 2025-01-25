import { GenderType } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
  @IsBoolean()
  isVerified: boolean;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(GenderType)
  gender?: GenderType;

  @IsOptional()
  birthday?: Date;

  @IsOptional()
  @IsString()
  phone?: string;
}
