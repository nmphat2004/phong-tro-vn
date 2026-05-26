import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 4 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  cleanRating: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  securityRating: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  locationRating: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  landlordRating: number;

  @ApiProperty({ example: 'Phòng sạch sẽ, chủ trọ thân ' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class UpdateReviewDto {
  @ApiProperty({ example: 4, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({ example: 4, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  @IsOptional()
  cleanRating?: number;

  @ApiProperty({ example: 4, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  @IsOptional()
  securityRating?: number;

  @ApiProperty({ example: 4, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  @IsOptional()
  locationRating?: number;

  @ApiProperty({ example: 4, required: false })
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  @IsOptional()
  landlordRating?: number;

  @ApiProperty({ example: 'Phòng sạch sẽ, chủ trọ thân thiện', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
