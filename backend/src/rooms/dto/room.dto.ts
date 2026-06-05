/* eslint-disable @typescript-eslint/no-unsafe-return */
import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Phòng trọ cao cấp quận 1' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Phòng trọ' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ example: 'Phòng rộng rãi, thoáng mát...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 3500000 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ required: false })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  electricityCost: number;

  @ApiProperty({ required: false })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  waterCost: number;

  @ApiProperty({ required: false })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  deposit: number;

  @ApiProperty({ example: '3 tháng', required: false })
  @IsOptional()
  @IsString()
  minStay?: string;

  @ApiProperty({ example: 'Không cho nuôi chó mèo' })
  @IsString()
  rule: string;

  @ApiProperty({ example: '123 Nguyễn Huệ, Quận 1, TPHCM' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: 10.7769 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiProperty({ example: 106.7009 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiProperty({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  area?: number;

  @ApiProperty({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floor?: number;

  @ApiProperty({ example: ['uuid-amenity-1', 'uuid-amenity-2'] })
  @IsOptional()
  @IsArray()
  amenityIds: string[];

  @ApiProperty({ example: ['https://cloudinary.com/img1.jpg'] })
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @ApiProperty({ example: ['abc123def456'] })
  @IsOptional()
  @IsArray()
  imageHashes?: string[];

  @ApiProperty({ example: 'https://cloudinary.com/img1.jpg' })
  @IsOptional()
  @IsString()
  primaryImageUrl?: string;
}

export class UpdateRoomDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  electricityCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  waterCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  deposit?: number;

  @ApiProperty({ example: '3 tháng', required: false })
  @IsOptional()
  @IsString()
  minStay?: string;

  @ApiProperty({ example: 'Không cho nuôi chó mèo', required: false })
  @IsOptional()
  @IsString()
  rule?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  area?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floor?: number;

  @ApiProperty({ enum: RoomStatus, required: false })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  amenityIds: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  imageUrls?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  imageHashes?: string[];
}

export class SearchRoomDto {
  @ApiProperty({ required: false, example: 'Quận 1' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, example: 500000 })
  @Type(() => Number)
  @IsOptional()
  minPrice?: number;

  @ApiProperty({ required: false, example: 5000000 })
  @Type(() => Number)
  @IsOptional()
  maxPrice?: number;

  @ApiProperty({ required: false, example: 1 })
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  minArea?: number;

  @ApiProperty({ required: false, example: 50 })
  @Type(() => Number)
  @IsOptional()
  maxArea?: number;

  @ApiProperty({ required: false, example: 3 })
  @Type(() => Number)
  @IsOptional()
  minRating?: number;

  @ApiProperty({ required: false, example: 'Quận 1' })
  @IsOptional()
  selectedDistrict?: string;

  @ApiProperty({
    required: false,
    example: ['wifi', 'ac'],
    type: [String],
    description: 'Danh sách mã tiện nghi (vân cách bởi dấu phẩy)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').filter(Boolean);
    if (Array.isArray(value)) return value;
    return [];
  })
  amenities?: string[];

  @ApiProperty({ required: false, example: 'Phòng trọ' })
  @IsOptional()
  @IsString()
  roomType?: string;

  @ApiProperty({ required: false, example: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, example: 10 })
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    required: false,
    enum: ['newest', 'price_asc', 'price_desc', 'rating'],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'newest';
}
