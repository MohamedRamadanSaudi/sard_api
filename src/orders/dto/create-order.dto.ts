import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  bookId: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  points?: number;
}