import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBookDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  cover?: any;

  @IsOptional()
  duration?: number;


  @IsOptional()
  audio?: any;

  @IsOptional()
  price?: number;

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
