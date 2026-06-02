import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto, SearchRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateRoomDto) {
    const { lat, lng } = dto;

    const room = await this.prisma.room.create({
      data: {
        ownerId,
        title: dto.title,
        type: dto.type,
        price: dto.price,
        electricityCost: dto.electricityCost,
        waterCost: dto.waterCost,
        deposit: dto.deposit,
        minStay: dto.minStay,
        description: dto.description,
        address: dto.address,
        rule: dto.rule,
        lat,
        lng,
        area: dto.area,
        floor: dto.floor,
        images: dto.imageUrls
          ? {
              create: dto.imageUrls.map((url, index) => ({
                url,
                hash: dto.imageHashes?.[index] || null,
                isPrimary: url === dto.primaryImageUrl || index === 0,
              })),
            }
          : undefined,
        amenities: dto.amenityIds
          ? {
              create: dto.amenityIds.map((amenityId) => ({ amenityId })),
            }
          : undefined,
      },
      include: {
        images: true,
        amenities: { include: { amenity: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    return room;
  }

  async update(id: string, ownerId: string, dto: UpdateRoomDto) {
    const { amenityIds, imageUrls, ...rest } = dto;
    const { lat, lng } = rest;

    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.ownerId !== ownerId) throw new ForbiddenException('Not your room');

    return this.prisma.room.update({
      where: { id },
      data: {
        ...rest,
        lat,
        lng,
        amenities: amenityIds
          ? {
              deleteMany: {},
              create: amenityIds.map((amenityId) => ({
                amenityId,
              })),
            }
          : undefined,
        images: imageUrls
          ? {
              deleteMany: {},
              create: imageUrls.map((url, index) => ({
                url,
                hash: dto.imageHashes?.[index] || null,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        amenities: { include: { amenity: true } },
      },
    });
  }

  async remove(id: string, ownerId: string, role: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');

    if (role !== 'ADMIN' && room.ownerId !== ownerId) {
      throw new ForbiddenException('Not your room');
    }

    await this.prisma.room.delete({ where: { id } });
    return { message: 'Room deleted successfully' };
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        images: true,
        amenities: { include: { amenity: true } },
        owner: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            isVerified: true,
            createdAt: true,
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');

    await this.prisma.room.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return room;
  }

  async findAll(dto: SearchRoomDto) {
    const {
      keyword,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      minRating,
      selectedDistrict,
      amenities,
      roomType,
      page = 1,
      limit = 10,
      sortBy = 'newest',
    } = dto;

    const buildSearchCondition = (term: string) => {
      const lower = term.toLowerCase();
      if (lower === 'phú thọ') {
        return {
          AND: [
            { address: { contains: 'Phú Thọ', mode: 'insensitive' } },
            {
              NOT: {
                address: { contains: 'Phú Thọ Hòa', mode: 'insensitive' },
              },
            },
            {
              NOT: {
                address: { contains: 'Phú Thọ Hoà', mode: 'insensitive' },
              },
            },
          ],
        };
      }
      if (lower === 'an phú' || lower === 'an phu') {
        return {
          AND: [
            { address: { contains: 'An Phú', mode: 'insensitive' } },
            {
              NOT: {
                address: { contains: 'An Phú Đông', mode: 'insensitive' },
              },
            },
            {
              NOT: { address: { contains: 'An Phú Tây', mode: 'insensitive' } },
            },
          ],
        };
      }
      if (lower === 'bình hưng' || lower === 'binh hung') {
        return {
          AND: [
            { address: { contains: 'Bình Hưng', mode: 'insensitive' } },
            {
              NOT: {
                address: { contains: 'Bình Hưng Hòa', mode: 'insensitive' },
              },
            },
            {
              NOT: {
                address: { contains: 'Bình Hưng Hoà', mode: 'insensitive' },
              },
            },
          ],
        };
      }
      if (lower === 'phú mỹ' || lower === 'phu my') {
        return {
          AND: [
            { address: { contains: 'Phú Mỹ', mode: 'insensitive' } },
            {
              NOT: {
                address: { contains: 'Phú Mỹ Hưng', mode: 'insensitive' },
              },
            },
          ],
        };
      }
      return {
        address: { contains: term, mode: 'insensitive' },
      };
    };

    const where: any = {
      status: 'AVAILABLE',
      ...(roomType && {
        type: { equals: roomType, mode: 'insensitive' },
      }),
      ...(selectedDistrict &&
        selectedDistrict !== 'all' && {
          OR: this.getDistrictSearchTerms(selectedDistrict).map((term) =>
            buildSearchCondition(term),
          ),
        }),
      ...(keyword && {
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
          ...this.getDistrictSearchTerms(keyword).map((term) =>
            buildSearchCondition(term),
          ),
        ],
      }),
      ...(minPrice || maxPrice
        ? {
            price: {
              ...(minPrice && { gte: minPrice }),
              ...(maxPrice && { lte: maxPrice }),
            },
          }
        : {}),

      ...(minArea || maxArea
        ? {
            area: {
              ...(minArea && { gte: minArea }),
              ...(maxArea && { lte: maxArea }),
            },
          }
        : {}),
      ...(minRating && { avgRating: { gte: minRating } }),
      ...(amenities &&
        amenities.length > 0 && {
          AND: amenities.map((value) => ({
            amenities: {
              some: {
                amenity: {
                  value: { equals: value, mode: 'insensitive' },
                },
              },
            },
          })),
        }),
    };

    const orderBy: any = {
      newest: { createdAt: 'desc' },
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      rating: { avgRating: 'desc' },
    }[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: true,
          amenities: { include: { amenity: true } },
          owner: {
            select: { id: true, fullName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.room.count({ where }),
    ]);

    return {
      data: rooms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByOwner(ownerId: string) {
    return this.prisma.room.findMany({
      where: { ownerId },
      include: {
        images: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllAmenities() {
    return this.prisma.amenity.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async reportRoom(roomId: string, reporterId: string, reason: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // Chủ trọ không được tự báo xấu phòng của mình
    if (room.ownerId === reporterId) {
      throw new ForbiddenException(
        'Bạn không thể báo xấu phòng của chính mình',
      );
    }

    // Kiểm tra xem user đã report phòng này chưa
    const existing = await this.prisma.report.findFirst({
      where: { roomId, reporterId },
    });
    if (existing) {
      throw new ForbiddenException('Bạn đã báo cáo phòng này rồi');
    }

    return this.prisma.report.create({
      data: {
        roomId,
        reporterId,
        reason,
        status: 'pending',
      },
    });
  }

  private normalizeSearchQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/q\.?\s*(\d+)/g, 'quận $1')
      .replace(/q\.?\s*bình thạnh/g, 'quận bình thạnh')
      .replace(/q\.?\s*gò vấp/g, 'quận gò vấp')
      .replace(/q\.?\s*phú nhuận/g, 'quận phú nhuận')
      .replace(/q\.?\s*tân bình/g, 'quận tân bình')
      .replace(/q\.?\s*tân phú/g, 'quận tân phú')
      .replace(/q\.?\s*bình tân/g, 'quận bình tân')
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)quận\s+bình\s+thạnh/g,
        'bình thạnh',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)quận\s+gò\s+vấp/g,
        'gò vấp',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)quận\s+phú\s+nhuận/g,
        'phú nhuận',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)quận\s+tân\s+bình/g,
        'tân bình',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)quận\s+tân\s+phú/g,
        'tân phú',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)quận\s+bình\s+tân/g,
        'bình tân',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)bình\s+thạnh/g,
        'quận bình thạnh',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)gò\s+vấp/g,
        'quận gò vấp',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)phú\s+nhuận/g,
        'quận phú nhuận',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)tân\s+bình/g,
        'quận tân bình',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)tân\s+phú/g,
        'quận tân phú',
      )
      .replace(
        /(?<!phường\s+|phuong\s+|xã\s+|xa\s+|thị\s+trấn\s+|thi\s+tran\s+)bình\s+tân/g,
        'quận bình tân',
      )
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getDistrictSearchTerms(districtOrKeyword: string): string[] {
    const normalized = this.normalizeSearchQuery(districtOrKeyword);
    const terms = [districtOrKeyword];

    // Mapping new/merged wards to all constituent old ward names
    const wardMap: Record<string, string[]> = {
      // Quận 1
      'sài gòn': [
        'Phường Sài Gòn',
        'Sài Gòn',
        'Bến Nghé',
        'Phường Bến Nghé',
        'Đa Kao',
        'Phường Đa Kao',
        'Nguyễn Thái Bình',
        'Phường Nguyễn Thái Bình',
      ],
      'tân định': ['Phường Tân Định', 'Tân Định', 'Đa Kao', 'Phường Đa Kao'],
      'bến thành': [
        'Phường Bến Thành',
        'Bến Thành',
        'Phạm Ngũ Lão',
        'Phường Phạm Ngũ Lão',
        'Cầu Ông Lãnh',
        'Phường Cầu Ông Lãnh',
        'Nguyễn Thái Bình',
        'Phường Nguyễn Thái Bình',
      ],
      'cầu ông lãnh': [
        'Phường Cầu Ông Lãnh',
        'Cầu Ông Lãnh',
        'Nguyễn Cư Trinh',
        'Phường Nguyễn Cư Trinh',
        'Cầu Kho',
        'Phường Cầu Kho',
        'Cô Giang',
        'Phường Cô Giang',
      ],

      // Quận 3
      'bàn cờ': [
        'Phường Bàn Cờ',
        'Bàn Cờ',
        'Phường 1',
        'Phường 2',
        'Phường 3',
        'Phường 4',
        'Phường 5',
        'P1 Quận 3',
        'P2 Quận 3',
        'P3 Quận 3',
        'P4 Quận 3',
        'P5 Quận 3',
      ],
      'xuân hòa': [
        'Phường Xuân Hòa',
        'Xuân Hòa',
        'Võ Thị Sáu',
        'Phường Võ Thị Sáu',
        'Phường 4',
        'Phường 6',
        'Phường 7',
        'Phường 8',
        'P4 Quận 3',
        'P6 Quận 3',
        'P7 Quận 3',
        'P8 Quận 3',
      ],
      'xuân hoà': [
        'Phường Xuân Hòa',
        'Xuân Hòa',
        'Võ Thị Sáu',
        'Phường Võ Thị Sáu',
        'Phường 4',
        'Phường 6',
        'Phường 7',
        'Phường 8',
        'P4 Quận 3',
        'P6 Quận 3',
        'P7 Quận 3',
        'P8 Quận 3',
      ],
      'nhiêu lộc': [
        'Phường Nhiêu Lộc',
        'Nhiêu Lộc',
        'Phường 9',
        'Phường 10',
        'Phường 11',
        'Phường 12',
        'Phường 13',
        'Phường 14',
        'P9 Quận 3',
        'P10 Quận 3',
        'P11 Quận 3',
        'P12 Quận 3',
        'P13 Quận 3',
        'P14 Quận 3',
      ],

      // Quận 4
      'xóm chiếu': [
        'Phường Xóm Chiếu',
        'Xóm Chiếu',
        'Phường 13',
        'Phường 15',
        'Phường 16',
        'Phường 18',
        'P13 Quận 4',
        'P15 Quận 4',
        'P16 Quận 4',
        'P18 Quận 4',
      ],
      'khánh hội': [
        'Phường Khánh Hội',
        'Khánh Hội',
        'Phường 8',
        'Phường 9',
        'Phường 2',
        'Phường 4',
        'Phường 15',
        'P8 Quận 4',
        'P9 Quận 4',
        'P2 Quận 4',
        'P4 Quận 4',
        'P15 Quận 4',
      ],
      'vĩnh hội': [
        'Phường Vĩnh Hội',
        'Vĩnh Hội',
        'Phường 1',
        'Phường 2',
        'Phường 3',
        'Phường 4',
        'P1 Quận 4',
        'P2 Quận 4',
        'P3 Quận 4',
        'P4 Quận 4',
      ],

      // Quận 5
      'chợ quán': [
        'Phường Chợ Quán',
        'Chợ Quán',
        'Phường 1',
        'Phường 2',
        'Phường 4',
        'P1 Quận 5',
        'P2 Quận 5',
        'P4 Quận 5',
      ],
      'an đông': [
        'Phường An Đông',
        'An Đông',
        'Phường 5',
        'Phường 7',
        'Phường 9',
        'P5 Quận 5',
        'P7 Quận 5',
        'P9 Quận 5',
      ],
      'chợ lớn': [
        'Phường Chợ Lớn',
        'Chợ Lớn',
        'Phường 11',
        'Phường 12',
        'Phường 13',
        'Phường 14',
        'P11 Quận 5',
        'P12 Quận 5',
        'P13 Quận 5',
        'P14 Quận 5',
      ],

      // Quận 6
      'bình tây': [
        'Phường Bình Tây',
        'Bình Tây',
        'Phường 2',
        'Phường 9',
        'Phường 3',
        'Phường 4',
        'Phường 5',
        'Phường 6',
        'P2 Quận 6',
        'P9 Quận 6',
      ],
      'bình tiên': [
        'Phường Bình Tiên',
        'Bình Tiên',
        'Phường 1',
        'Phường 7',
        'Phường 8',
        'P1 Quận 6',
        'P7 Quận 6',
        'P8 Quận 6',
      ],
      'bình phú': [
        'Phường Bình Phú',
        'Bình Phú',
        'Phường 10',
        'Phường 11',
        'P10 Quận 6',
        'P11 Quận 6',
      ],
      'phú lâm': [
        'Phường Phú Lâm',
        'Phú Lâm',
        'Phường 12',
        'Phường 13',
        'Phường 14',
        'P12 Quận 6',
        'P13 Quận 6',
        'P14 Quận 6',
      ],

      // Quận 7
      'tân thuận': [
        'Phường Tân Thuận',
        'Tân Thuận',
        'Bình Thuận',
        'Phường Bình Thuận',
        'Tân Thuận Đông',
        'Phường Tân Thuận Đông',
        'Tân Thuận Tây',
        'Phường Tân Thuận Tây',
      ],
      'phú thuận': ['Phường Phú Thuận', 'Phú Thuận', 'Phú Mỹ', 'Phường Phú Mỹ'],
      'tân mỹ': [
        'Phường Tân Mỹ',
        'Tân Mỹ',
        'Tân Phú',
        'Phường Tân Phú',
        'Phú Mỹ',
        'Phường Phú Mỹ',
      ],
      'tân hưng': [
        'Phường Tân Hưng',
        'Tân Hưng',
        'Tân Phong',
        'Phường Tân Phong',
        'Tân Quy',
        'Phường Tân Quy',
        'Tân Kiểng',
        'Phường Tân Kiểng',
      ],

      // Quận 8
      'chánh hưng': [
        'Phường Chánh Hưng',
        'Chánh Hưng',
        'Phường 4',
        'Phường 5',
        'Rạch Ông',
        'Phường Rạch Ông',
        'Hưng Phú',
        'Phường Hưng Phú',
        'P4 Quận 8',
        'P5 Quận 8',
      ],
      'phú định': [
        'Phường Phú Định',
        'Phú Định',
        'Phường 14',
        'Phường 15',
        'Phường 16',
        'Xóm Củi',
        'Phường Xóm Củi',
        'P14 Quận 8',
        'P15 Quận 8',
        'P16 Quận 8',
      ],
      'bình đông': [
        'Phường Bình Đông',
        'Bình Đông',
        'Phường 6',
        'Phường 5',
        'Phường 7',
        'An Phú Tây',
        'Xã An Phú Tây',
        'P6 Quận 8',
        'P5 Quận 8',
        'P7 Quận 8',
      ],

      // Quận 10
      'diên hồng': [
        'Phường Diên Hồng',
        'Diên Hồng',
        'Phường 6',
        'Phường 8',
        'Phường 14',
        'P6 Quận 10',
        'P8 Quận 10',
        'P14 Quận 10',
      ],
      'vườn lài': [
        'Phường Vườn Lài',
        'Vườn Lài',
        'Phường 1',
        'Phường 2',
        'Phường 4',
        'Phường 9',
        'Phường 10',
        'P1 Quận 10',
        'P2 Quận 10',
        'P4 Quận 10',
        'P9 Quận 10',
        'P10 Quận 10',
      ],
      'hòa hưng': [
        'Phường Hòa Hưng',
        'Hòa Hưng',
        'Phường 12',
        'Phường 13',
        'Phường 15',
        'Phường 14',
        'P12 Quận 10',
        'P13 Quận 10',
        'P15 Quận 10',
        'P14 Quận 10',
      ],
      'hoà hưng': [
        'Phường Hòa Hưng',
        'Hòa Hưng',
        'Phường 12',
        'Phường 13',
        'Phường 15',
        'Phường 14',
        'P12 Quận 10',
        'P13 Quận 10',
        'P15 Quận 10',
        'P14 Quận 10',
      ],

      // Quận 11
      'minh phụng': [
        'Phường Minh Phụng',
        'Minh Phụng',
        'Phường 1',
        'Phường 7',
        'Phường 16',
        'P1 Quận 11',
        'P7 Quận 11',
        'P16 Quận 11',
      ],
      'bình thới': [
        'Phường Bình Thới',
        'Bình Thới',
        'Phường 3',
        'Phường 10',
        'Phường 8',
        'P3 Quận 11',
        'P10 Quận 11',
        'P8 Quận 11',
      ],
      'hòa bình': [
        'Phường Hòa Bình',
        'Hòa Bình',
        'Phường 5',
        'Phường 14',
        'P5 Quận 11',
        'P14 Quận 11',
      ],
      'hoà bình': [
        'Phường Hòa Bình',
        'Hòa Bình',
        'Phường 5',
        'Phường 14',
        'P5 Quận 11',
        'P14 Quận 11',
      ],
      'phú thọ': [
        'Phường Phú Thọ',
        'Phú Thọ',
        'Phường 11',
        'Phường 15',
        'Phường 8',
        'P11 Quận 11',
        'P15 Quận 11',
        'P8 Quận 11',
      ],

      // Quận 12
      'đông hưng thuận': [
        'Phường Đông Hưng Thuận',
        'Đông Hưng Thuận',
        'Tân Thới Nhất',
        'Tân Hưng Thuận',
      ],
      'trung mỹ tây': ['Phường Trung Mỹ Tây', 'Trung Mỹ Tây', 'Tân Chánh Hiệp'],
      'tân thới hiệp': ['Phường Tân Thới Hiệp', 'Tân Thới Hiệp', 'Hiệp Thành'],
      'thới an': ['Phường Thới An', 'Thới An', 'Thạnh Xuân'],
      'an phú đông': ['Phường An Phú Đông', 'An Phú Đông', 'Thạnh Lộc'],

      // Quận Bình Tân
      'an lạc': ['Phường An Lạc', 'An Lạc', 'Bình Trị Đông B', 'An Lạc A'],
      'phường bình tân': [
        'Phường Bình Tân',
        'Bình Tân',
        'Bình Hưng Hòa B',
        'Bình Trị Đông A',
        'Tân Tạo',
      ],
      'tân tạo': [
        'Phường Tân Tạo',
        'Tân Tạo',
        'Tân Kiên',
        'Xã Tân Kiên',
        'Tân Tạo A',
        'Phường Tân Tạo A',
      ],
      'bình trị đông': [
        'Phường Bình Trị Đông',
        'Bình Trị Đông',
        'Bình Hưng Hòa A',
        'Bình Trị Đông A',
      ],
      'bình hưng hòa': [
        'Phường Bình Hưng Hòa',
        'Bình Hưng Hòa',
        'Sơn Kỳ',
        'Bình Hưng Hòa A',
      ],
      'bình hưng hoà': [
        'Phường Bình Hưng Hòa',
        'Bình Hưng Hòa',
        'Sơn Kỳ',
        'Bình Hưng Hòa A',
      ],

      // Quận Bình Thạnh
      'gia định': [
        'Phường Gia Định',
        'Gia Định',
        'Phường 1',
        'Phường 2',
        'Phường 3',
        'Phường 7',
        'Phường 15',
        'Phường 17',
        'P1 Bình Thạnh',
        'P2 Bình Thạnh',
        'P3 Bình Thạnh',
        'P7 Bình Thạnh',
        'P15 Bình Thạnh',
        'P17 Bình Thạnh',
      ],
      'phường bình thạnh': [
        'Phường Bình Thạnh',
        'Phường 12',
        'Phường 14',
        'Phường 26',
        'P12 Bình Thạnh',
        'P14 Bình Thạnh',
        'P26 Bình Thạnh',
      ],
      'bình lợi trung': [
        'Phường Bình Lợi Trung',
        'Bình Lợi Trung',
        'Phường 5',
        'Phường 6',
        'Phường 11',
        'Phường 13',
        'P5 Bình Thạnh',
        'P6 Bình Thạnh',
        'P11 Bình Thạnh',
        'P13 Bình Thạnh',
      ],
      'thạnh mỹ tây': [
        'Phường Thạnh Mỹ Tây',
        'Thạnh Mỹ Tây',
        'Phường 19',
        'Phường 21',
        'Phường 22',
        'Phường 24',
        'Phường 25',
        'P19 Bình Thạnh',
        'P21 Bình Thạnh',
        'P22 Bình Thạnh',
        'P24 Bình Thạnh',
        'P25 Bình Thạnh',
      ],
      'bình quới': [
        'Phường Bình Quới',
        'Bình Quới',
        'Phường 27',
        'Phường 28',
        'P27 Bình Thạnh',
        'P28 Bình Thạnh',
      ],

      // Quận Gò Vấp
      'hạnh thông': [
        'Phường Hạnh Thông',
        'Hạnh Thông',
        'Phường 1',
        'Phường 3',
        'Phường 4',
        'P1 Gò Vấp',
        'P3 Gò Vấp',
        'P4 Gò Vấp',
      ],
      'an nhơn': [
        'Phường An Nhơn',
        'An Nhơn',
        'Phường 5',
        'Phường 6',
        'Phường 7',
        'P5 Gò Vấp',
        'P6 Gò Vấp',
        'P7 Gò Vấp',
      ],
      'phường gò vấp': [
        'Phường Gò Vấp',
        'Phường 10',
        'Phường 17',
        'Phường 9',
        'P10 Gò Vấp',
        'P17 Gò Vấp',
        'P9 Gò Vấp',
      ],
      'an hội đông': [
        'Phường An Hội Đông',
        'An Hội Đông',
        'Phường 15',
        'Phường 16',
        'P15 Gò Vấp',
        'P16 Gò Vấp',
      ],
      'thông tây hội': [
        'Phường Thông Tây Hội',
        'Thông Tây Hội',
        'Phường 8',
        'Phường 11',
        'Phường 13',
        'P8 Gò Vấp',
        'P11 Gò Vấp',
        'P13 Gò Vấp',
      ],
      'an hội tây': [
        'Phường An Hội Tây',
        'An Hội Tây',
        'Phường 12',
        'Phường 14',
        'P12 Gò Vấp',
        'P14 Gò Vấp',
      ],

      // Quận Phú Nhuận
      'đức nhuận': [
        'Phường Đức Nhuận',
        'Đức Nhuận',
        'Phường 4',
        'Phường 5',
        'Phường 9',
        'P4 Phú Nhuận',
        'P5 Phú Nhuận',
        'P9 Phú Nhuận',
      ],
      'cầu kiệu': [
        'Phường Cầu Kiệu',
        'Cầu Kiệu',
        'Phường 1',
        'Phường 2',
        'Phường 3',
        'Phường 7',
        'Phường 15',
        'P1 Phú Nhuận',
        'P2 Phú Nhuận',
        'P3 Phú Nhuận',
        'P7 Phú Nhuận',
        'P15 Phú Nhuận',
      ],
      'phường phú nhuận': [
        'Phường Phú Nhuận',
        'Phường 8',
        'Phường 10',
        'Phường 11',
        'Phường 12',
        'Phường 13',
        'Phường 14',
        'Phường 15',
        'Phường 17',
        'P8 Phú Nhuận',
        'P10 Phú Nhuận',
        'P11 Phú Nhuận',
        'P12 Phú Nhuận',
        'P13 Phú Nhuận',
        'P14 Phú Nhuận',
        'P15 Phú Nhuận',
        'P17 Phú Nhuận',
      ],

      // Quận Tân Bình
      'tân sơn hòa': [
        'Phường Tân Sơn Hòa',
        'Tân Sơn Hòa',
        'Phường 1',
        'Phường 2',
        'Phường 3',
        'P1 Tân Bình',
        'P2 Tân Bình',
        'P3 Tân Bình',
      ],
      'tân sơn hoà': [
        'Phường Tân Sơn Hòa',
        'Tân Sơn Hòa',
        'Phường 1',
        'Phường 2',
        'Phường 3',
        'P1 Tân Bình',
        'P2 Tân Bình',
        'P3 Tân Bình',
      ],
      'tân sơn nhất': [
        'Phường Tân Sơn Nhất',
        'Tân Sơn Nhất',
        'Phường 4',
        'Phường 5',
        'Phường 7',
        'P4 Tân Bình',
        'P5 Tân Bình',
        'P7 Tân Bình',
      ],
      'tân hòa': [
        'Phường Tân Hòa',
        'Tân Hòa',
        'Phường 6',
        'Phường 8',
        'Phường 9',
        'P6 Tân Bình',
        'P8 Tân Bình',
        'P9 Tân Bình',
      ],
      'tân hoà': [
        'Phường Tân Hòa',
        'Tân Hòa',
        'Phường 6',
        'Phường 8',
        'Phường 9',
        'P6 Tân Bình',
        'P8 Tân Bình',
        'P9 Tân Bình',
      ],
      'bảy hiền': [
        'Phường Bảy Hiền',
        'Bảy Hiền',
        'Phường 10',
        'Phường 11',
        'Phường 12',
        'P10 Tân Bình',
        'P11 Tân Bình',
        'P12 Tân Bình',
      ],
      'phường tân bình': [
        'Phường Tân Bình',
        'Phường 13',
        'Phường 14',
        'Phường 15',
        'P13 Tân Bình',
        'P14 Tân Bình',
        'P15 Tân Bình',
      ],
      'tân sơn': ['Phường Tân Sơn', 'Tân Sơn', 'Phường 15', 'P15 Tân Bình'],

      // Quận Tân Phú
      'tây thạnh': ['Phường Tây Thạnh', 'Tây Thạnh', 'Phường Sơn Kỳ', 'Sơn Kỳ'],
      'tân sơn nhì': [
        'Phường Tân Sơn Nhì',
        'Tân Sơn Nhì',
        'Phường Sơn Kỳ',
        'Sơn Kỳ',
        'Phường Tân Quý',
        'Tân Quý',
        'Phường Tân Thành',
        'Tân Thành',
      ],
      'phú thọ hòa': [
        'Phường Phú Thọ Hòa',
        'Phú Thọ Hòa',
        'Phường Tân Thành',
        'Tân Thành',
        'Phường Tân Quý',
        'Tân Quý',
      ],
      'phú thọ hoà': [
        'Phường Phú Thọ Hòa',
        'Phú Thọ Hòa',
        'Phường Tân Thành',
        'Tân Thành',
        'Phường Tân Quý',
        'Tân Quý',
      ],
      'phường tân phú': [
        'Phường Tân Phú',
        'Tân Phú',
        'Phường Phú Trung',
        'Phú Trung',
        'Phường Hòa Thạnh',
        'Hòa Thạnh',
        'Phường Tân Thới Hòa',
        'Tân Thới Hòa',
        'Phường Tân Thành',
        'Tân Thành',
      ],
      'phú thạnh': [
        'Phường Phú Thạnh',
        'Phú Thạnh',
        'Phường Hiệp Tân',
        'Hiệp Tân',
        'Phường Tân Thới Hòa',
        'Tân Thới Hòa',
      ],

      // Thủ Đức
      'hiệp bình': [
        'Phường Hiệp Bình',
        'Hiệp Bình',
        'Hiệp Bình Chánh',
        'Hiệp Bình Phước',
        'Linh Đông',
      ],
      'phường thủ đức': [
        'Phường Thủ Đức',
        'Thủ Đức',
        'Bình Thọ',
        'Linh Chiểu',
        'Trường Thọ',
        'Linh Tây',
        'Linh Đông',
      ],
      'tam bình': ['Phường Tam Bình', 'Tam Bình', 'Bình Chiểu', 'Tam Phú'],
      'linh xuân': ['Phường Linh Xuân', 'Linh Xuân', 'Linh Trung', 'Linh Tây'],
      'tăng nhơn phú': [
        'Phường Tăng Nhơn Phú',
        'Tăng Nhơn Phú',
        'Phường Tân Phú',
        'Hiệp Phú',
        'Tăng Nhơn Phú A',
        'Tăng Nhơn Phú B',
        'Long Thạnh Mỹ',
      ],
      'long bình': ['Phường Long Bình', 'Long Bình', 'Long Thạnh Mỹ'],
      'long phước': ['Phường Long Phước', 'Long Phước', 'Trường Thạnh'],
      'long trường': ['Phường Long Trường', 'Long Trường', 'Phú Hữu'],
      'cát lái': ['Phường Cát Lái', 'Cát Lái', 'Thạnh Mỹ Lợi'],
      'bình trưng': [
        'Phường Bình Trưng',
        'Bình Trưng',
        'Bình Trưng Đông',
        'Bình Trưng Tây',
        'An Phú',
      ],
      'phước long': [
        'Phường Phước Long',
        'Phước Long',
        'Phước Bình',
        'Phước Long A',
        'Phước Long B',
      ],
      'an khánh': [
        'Phường An Khánh',
        'An Khánh',
        'Thủ Thiêm',
        'An Lợi Đông',
        'Thảo Điền',
        'An Phú',
      ],

      // Bình Chánh
      'vĩnh lộc': ['Xã Vĩnh Lộc', 'Vĩnh Lộc', 'Vĩnh Lộc A', 'Phạm Văn Hai'],
      'tân vĩnh lộc': [
        'Xã Tân Vĩnh Lộc',
        'Tân Vĩnh Lộc',
        'Vĩnh Lộc B',
        'Phạm Văn Hai',
        'Tân Tạo',
      ],
      'bình lợi': ['Xã Bình Lợi', 'Bình Lợi', 'Lê Minh Xuân'],
      'tân nhựt': [
        'Xã Tân Nhựt',
        'Tân Nhựt',
        'Tân Túc',
        'Tân Kiên',
        'Tân Tạo A',
        'Phường 16',
      ],
      'xã bình chánh': [
        'Xã Bình Chánh',
        'Bình Chánh',
        'Tân Quý Tây',
        'An Phú Tây',
      ],
      'hưng long': ['Xã Hưng Long', 'Hưng Long', 'Đa Phước', 'Qui Đức'],
      'bình hưng': ['Xã Bình Hưng', 'Bình Hưng', 'Phong Phú', 'Phường 7'],

      // Cần Giờ
      'bình khánh': [
        'Xã Bình Khánh',
        'Bình Khánh',
        'Tam Thôn Hiệp',
        'An Thới Đông',
      ],
      'an thới đông': ['Xã An Thới Đông', 'An Thới Đông', 'Lý Nhơn'],
      'xã cần giờ': ['Xã Cần Giờ', 'Cần Giờ', 'Long Hòa', 'Cần Thạnh'],

      // Củ Chi
      'xã củ chi': [
        'Xã Củ Chi',
        'Củ Chi',
        'Tân Phú Trung',
        'Tân Thông Hội',
        'Phước Vĩnh An',
      ],
      'tân an hội': [
        'Xã Tân An Hội',
        'Tân An Hội',
        'Thị trấn Củ Chi',
        'Củ Chi',
        'Phước Hiệp',
      ],
      'thái mỹ': ['Xã Thái Mỹ', 'Thái Mỹ', 'Trung Lập Thượng', 'Phước Thạnh'],
      'an nhơn tây': ['Xã An Nhơn Tây', 'An Nhơn Tây', 'Phú Mỹ Hưng', 'An Phú'],
      'nhuận đức': [
        'Xã Nhuận Đức',
        'Nhuận Đức',
        'Phạm Văn Cội',
        'Trung Lập Hạ',
      ],
      'phú hòa đông': [
        'Xã Phú Hòa Đông',
        'Phú Hòa Đông',
        'Tân Thạnh Tây',
        'Tân Thạnh Đông',
      ],
      'bình mỹ': ['Xã Bình Mỹ', 'Bình Mỹ', 'Hòa Phú', 'Trung An'],

      // Hóc Môn
      'đông thạnh': [
        'Xã Đông Thạnh',
        'Đông Thạnh',
        'Thới Tam Thôn',
        'Nhị Bình',
      ],
      'xã hóc môn': [
        'Xã Hóc Môn',
        'Hóc Môn',
        'Tân Hiệp',
        'Tân Xuân',
        'Thị trấn Hóc Môn',
      ],
      'xuân thới sơn': [
        'Xã Xuân Thới Sơn',
        'Xuân Thới Sơn',
        'Tân Thới Nhì',
        'Xuân Thới Đông',
      ],
      'bà điểm': ['Xã Bà Điểm', 'Bà Điểm', 'Xuân Thới Thượng', 'Trung Chánh'],

      // Nhà Bè
      'xã nhà bè': [
        'Xã Nhà Bè',
        'Nhà Bè',
        'Thị trấn Nhà Bè',
        'Phú Xuân',
        'Phước Kiển',
        'Phước Lộc',
      ],
      'hiệp phước': ['Xã Hiệp Phước', 'Hiệp Phước', 'Nhơn Đức', 'Long Thới'],
    };

    // Check if ward mappings matched
    let wardMatched = false;
    for (const [key, wards] of Object.entries(wardMap)) {
      if (normalized.includes(key)) {
        terms.push(...wards);
        wardMatched = true;
      }
    }

    // Determine if it is a ward search
    const isWardSearch =
      wardMatched ||
      normalized.includes('phường') ||
      normalized.includes('phuong') ||
      normalized.includes('xã') ||
      normalized.includes('xa') ||
      normalized.includes('thị trấn') ||
      normalized.includes('thi tran');

    // Only match district level maps if it is NOT a ward search
    if (!isWardSearch) {
      const districtMap: Record<string, string[]> = {
        'quận 1': [
          'Quận 1',
          'Q1',
          'Q.1',
          'Sài Gòn',
          'Tân Định',
          'Bến Thành',
          'Cầu Ông Lãnh',
          'Bến Nghé',
          'Đa Kao',
          'Nguyễn Thái Bình',
          'Phạm Ngũ Lão',
          'Nguyễn Cư Trinh',
          'Cầu Kho',
          'Cô Giang',
        ],
        'quận 3': [
          'Quận 3',
          'Q3',
          'Q.3',
          'Bàn Cờ',
          'Xuân Hòa',
          'Xuân Hoà',
          'Nhiêu Lộc',
          'Võ Thị Sáu',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
        ],
        'quận 4': [
          'Quận 4',
          'Q4',
          'Q.4',
          'Xóm Chiếu',
          'Khánh Hội',
          'Vĩnh Hội',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 6',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
          'Phường 18',
        ],
        'quận 5': [
          'Quận 5',
          'Q5',
          'Q.5',
          'Chợ Quán',
          'An Đông',
          'Chợ Lớn',
          'Phường 3',
          'Phường 6',
          'Phường 8',
          'Phường 10',
          'Phường 15',
          'Phường 1',
          'Phường 2',
          'Phường 4',
          'Phường 5',
          'Phường 7',
          'Phường 9',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
        ],
        'quận 6': [
          'Quận 6',
          'Q6',
          'Q.6',
          'Bình Tây',
          'Bình Tiên',
          'Bình Phú',
          'Phú Lâm',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
        ],
        'quận 7': [
          'Quận 7',
          'Q7',
          'Q.7',
          'Tân Thuận',
          'Phú Thuận',
          'Tân Mỹ',
          'Tân Hưng',
          'Bình Thuận',
          'Tân Thuận Đông',
          'Tân Thuận Tây',
          'Phường Tân Phú',
          'Phú Mỹ',
          'Tân Phong',
          'Tân Quy',
          'Tân Kiểng',
        ],
        'quận 8': [
          'Quận 8',
          'Q8',
          'Q.8',
          'Chánh Hưng',
          'Phú Định',
          'Bình Đông',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
          'Rạch Ông',
          'Hưng Phú',
          'Xóm Củi',
        ],
        'quận 10': [
          'Quận 10',
          'Q10',
          'Q.10',
          'Diên Hồng',
          'Vườn Lài',
          'Hòa Hưng',
          'Hoà Hưng',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
        ],
        'quận 11': [
          'Quận 11',
          'Q11',
          'Q.11',
          'Minh Phụng',
          'Bình Thới',
          'Hòa Bình',
          'Hoà Bình',
          'Phú Thọ',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 16',
        ],
        'quận 12': [
          'Quận 12',
          'Q12',
          'Q.12',
          'Đông Hưng Thuận',
          'Trung Mỹ Tây',
          'Tân Thới Hiệp',
          'Thới An',
          'An Phú Đông',
          'Tân Thới Nhất',
          'Tân Hưng Thuận',
          'Tân Chánh Hiệp',
          'Hiệp Thành',
          'Thạnh Xuân',
          'Thạnh Lộc',
        ],
        'quận bình thạnh': [
          'Bình Thạnh',
          'Quận Bình Thạnh',
          'Gia Định',
          'Bình Thạnh',
          'Bình Lợi Trung',
          'Thạnh Mỹ Tây',
          'Bình Quới',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 17',
          'Phường 19',
          'Phường 21',
          'Phường 22',
          'Phường 24',
          'Phường 25',
          'Phường 26',
          'Phường 27',
          'Phường 28',
        ],
        'quận bình tân': [
          'Bình Tân',
          'Quận Bình Tân',
          'An Lạc',
          'Bình Tân',
          'Tân Tạo',
          'Bình Trị Đông',
          'Bình Hưng Hòa',
          'Bình Hưng Hoà',
          'Bình Trị Đông B',
          'An Lạc A',
          'Bình Hưng Hòa B',
          'Bình Trị Đông A',
          'Tân Kiên',
          'Tân Tạo A',
          'Bình Hưng Hòa A',
        ],
        'quận gò vấp': [
          'Gò Vấp',
          'Quận Gò Vấp',
          'Hạnh Thông',
          'An Nhơn',
          'Gò Vấp',
          'An Hội Đông',
          'Thông Tây Hội',
          'An Hội Tây',
          'Phường 1',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 14',
          'Phường 15',
          'Phường 16',
          'Phường 17',
        ],
        'quận phú nhuận': [
          'Phú Nhuận',
          'Quận Phú Nhuận',
          'Đức Nhuận',
          'Cầu Kiệu',
          'Phú Nhuận',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
          'Phường 17',
        ],
        'quận tân bình': [
          'Tân Bình',
          'Quận Tân Bình',
          'Tân Sơn Hòa',
          'Tân Sơn Hoà',
          'Tân Sơn Nhất',
          'Tân Hòa',
          'Tân Hoà',
          'Bảy Hiền',
          'Tân Bình',
          'Tân Sơn',
          'Phường 1',
          'Phường 2',
          'Phường 3',
          'Phường 4',
          'Phường 5',
          'Phường 6',
          'Phường 7',
          'Phường 8',
          'Phường 9',
          'Phường 10',
          'Phường 11',
          'Phường 12',
          'Phường 13',
          'Phường 14',
          'Phường 15',
        ],
        'quận tân phú': [
          'Tân Phú',
          'Quận Tân Phú',
          'Tây Thạnh',
          'Tân Sơn Nhì',
          'Phú Thọ Hòa',
          'Phú Thọ Hoà',
          'Tân Phú',
          'Phú Thạnh',
          'Sơn Kỳ',
          'Tân Quý',
          'Tân Thành',
          'Phú Trung',
          'Hòa Thạnh',
          'Tân Thới Hòa',
          'Hiệp Tân',
        ],
        'thủ đức': [
          'Thủ Đức',
          'TP. Thủ Đức',
          'TP Thủ Đức',
          'Thành phố Thủ Đức',
          'Hiệp Bình',
          'Thủ Đức',
          'Tam Bình',
          'Linh Xuân',
          'Tăng Nhơn Phú',
          'Long Bình',
          'Long Phước',
          'Long Trường',
          'Cát Lái',
          'Bình Trưng',
          'Phước Long',
          'An Khánh',
          'Hiệp Bình Chánh',
          'Hiệp Bình Phước',
          'Linh Đông',
          'Bình Thọ',
          'Linh Chiểu',
          'Trường Thọ',
          'Linh Tây',
          'Bình Chiểu',
          'Tam Phú',
          'Linh Trung',
          'Phường Tân Phú',
          'Hiệp Phú',
          'Tăng Nhơn Phú A',
          'Tăng Nhơn Phú B',
          'Long Thạnh Mỹ',
          'Trường Thạnh',
          'Phú Hữu',
          'Thạnh Mỹ Lợi',
          'Bình Trưng Đông',
          'Bình Trưng Tây',
          'An Phú',
          'Phước Bình',
          'Phước Long A',
          'Phước Long B',
          'Thủ Thiêm',
          'An Lợi Đông',
          'Thảo Điền',
          'Quận 2',
          'Q2',
          'Q.2',
          'Quận 9',
          'Q9',
          'Q.9',
        ],
        'bình chánh': [
          'Bình Chánh',
          'Huyện Bình Chánh',
          'Vĩnh Lộc',
          'Tân Vĩnh Lộc',
          'Bình Lợi',
          'Tân Nhựt',
          'Bình Chánh',
          'Hưng Long',
          'Bình Hưng',
          'Vĩnh Lộc A',
          'Phạm Văn Hai',
          'Vĩnh Lộc B',
          'Lê Minh Xuân',
          'Tân Túc',
          'Tân Nhựt',
          'Tân Kiên',
          'Tân Quý Tây',
          'An Phú Tây',
          'Đa Phước',
          'Qui Đức',
          'Phong Phú',
          'Bình Hưng',
        ],
        'cần giờ': [
          'Cần Giờ',
          'Huyện Cần Giờ',
          'Bình Khánh',
          'An Thới Đông',
          'Cần Giờ',
          'Thạnh An',
          'Tam Thôn Hiệp',
          'Lý Nhơn',
          'Long Hòa',
          'Cần Thạnh',
        ],
        'củ chi': [
          'Củ Chi',
          'Huyện Củ Chi',
          'Củ Chi',
          'Tân An Hội',
          'Thái Mỹ',
          'An Nhơn Tây',
          'Nhuận Đức',
          'Phú Hòa Đông',
          'Bình Mỹ',
          'Tân Phú Trung',
          'Tân Thông Hội',
          'Phước Vĩnh An',
          'Phước Hiệp',
          'Trung Lập Thượng',
          'Phước Thạnh',
          'Phú Mỹ Hưng',
          'An Phú',
          'Phạm Văn Cội',
          'Trung Lập Hạ',
          'Tân Thạnh Tây',
          'Tân Thạnh Đông',
          'Hòa Phú',
          'Trung An',
        ],
        'hóc môn': [
          'Hóc Môn',
          'Huyện Hóc Môn',
          'Đông Thạnh',
          'Hóc Môn',
          'Xuân Thới Sơn',
          'Bà Điểm',
          'Thới Tam Thôn',
          'Nhị Bình',
          'Tân Hiệp',
          'Tân Xuân',
          'Tân Thới Nhì',
          'Xuân Thới Đông',
          'Xuân Thới Thượng',
          'Trung Chánh',
        ],
        'nhà bè': [
          'Nhà Bè',
          'Huyện Nhà Bè',
          'Nhà Bè',
          'Hiệp Phước',
          'Phú Xuân',
          'Phước Kiển',
          'Phước Lộc',
          'Nhơn Đức',
          'Long Thới',
        ],
      };

      for (const [key, wards] of Object.entries(districtMap)) {
        if (normalized.includes(key)) {
          terms.push(...wards);
        }
      }
    }

    return Array.from(new Set(terms));
  }
}
