import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsNotEmpty } from 'class-validator';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  cover?: any;

  @IsNumber()
  @Min(0)
  duration: number;

  @IsString()
  @IsNotEmpty()
  audio: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  price_points?: number;

  @IsBoolean()
  @IsOptional()
  is_free?: boolean = false;

  @IsString()
  @IsOptional()
  authorId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string[];
}
