import { Transform } from 'class-transformer';
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
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  is_free?: boolean;

  @IsString()
  @IsOptional()
  authorId?: string;

  @IsString()
  @IsOptional()
  categoryId?: string[];
}
