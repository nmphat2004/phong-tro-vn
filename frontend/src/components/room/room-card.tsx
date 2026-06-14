import { Room } from '@/types';
import { MapPin, Maximize, Maximize2, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AmenityIcon from './amenity-icon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PriceTag } from './price-tag';

interface Props {
	room: Room;
	layout?: 'grid' | 'list';
}

const RoomCard = ({ room, layout = 'grid' }: Props) => {
	const primaryImage =
		room.images?.find((img) => img.isPrimary) || room.images?.[0];

	if (layout === 'list') {
		return (
			<Link href={`/rooms/${room.id}`}>
				<div className='bg-card border border-border rounded-xl p-3 sm:p-4 hover:shadow-lg transition-shadow duration-200 flex gap-3 sm:gap-4'>
					{/* Ảnh */}
					<div className='relative shrink-0 w-28 h-24 sm:w-[200px] sm:h-[140px]'>
						{primaryImage ?
							<Image
								src={primaryImage.url}
								alt={room.title}
								fill
								sizes='(max-width: 640px) 112px, 200px'
								className='rounded-lg object-cover'
							/>
						:	<div className='w-full h-full flex items-center justify-center text-gray-300 bg-secondary rounded-lg'>
								<Maximize2 className='w-8 h-8 sm:w-12 sm:h-12' />
							</div>
						}
					</div>

					{/* Thông tin */}
					<div className='flex-1 flex flex-col justify-between min-w-0'>
						<div>
							<h3 className='text-sm sm:text-base font-bold mb-1 sm:mb-2 line-clamp-1 sm:line-clamp-2 text-foreground hover:text-primary transition-colors'>{room.title}</h3>

							<div className='flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2'>
								<MapPin className='w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-primary/70' />
								<span className='line-clamp-1'>{room.address}</span>
							</div>

							<div className='inline-flex items-baseline gap-1'>
								<PriceTag size='sm' amount={room.price} />
							</div>

							<div className='flex items-center gap-3 mt-1 text-xs sm:text-sm text-muted-foreground'>
								<div className='flex items-center gap-1'>
									<Maximize className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/70' />
									<span>{room.area}m²</span>
								</div>
							</div>

							<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 sm:mt-3 border-t border-border/10 sm:border-t-0 pt-2 sm:pt-0'>
								<div className='hidden sm:flex items-center gap-1.5 flex-wrap'>
									{room.amenities.slice(0, 4).map((amenity) => (
										<AmenityIcon
											key={amenity.amenity.id}
											icon={amenity.amenity.icon}
											name={amenity.amenity.name}
											size='sm'
										/>
									))}
								</div>
								<div className='flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto'>
									<div className='flex items-center gap-1 shrink-0'>
										{/* Desktop Stars */}
										<div className='hidden sm:flex items-center gap-0.5'>
											{[1, 2, 3, 4, 5].map((star) => (
												<Star
													key={star}
													className={`w-3.5 h-3.5 ${star <= room.avgRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
												/>
											))}
										</div>
										{/* Mobile Single Star */}
										<div className='flex sm:hidden items-center gap-1'>
											<Star className='w-3.5 h-3.5 fill-amber-400 text-amber-400' />
											<span className='text-xs font-semibold text-foreground'>{Number(room.avgRating).toFixed(1)}</span>
										</div>
										{room.reviewCount !== undefined && (
											<span className='text-xs text-muted-foreground'>
												({room.reviewCount})
											</span>
										)}
									</div>
									<Badge
										variant='outline'
										className={cn(
											'rounded-full font-medium h-6 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-2.5 shrink-0',
											room.status === 'AVAILABLE' ?
												'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
											:	'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
										)}>
										{room.status === 'AVAILABLE' ? 'Còn phòng' : 'Đã thuê'}
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Link>
		);
	}

	return (
		<Link href={`/rooms/${room.id}`}>
			<div className='bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-200'>
				{/* Ảnh */}
				<div className='relative w-full h-48'>
					{primaryImage ?
						<Image
							src={primaryImage.url}
							alt={room.title}
							fill
							sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
							className='object-cover'
						/>
					:	<div className='w-full h-full flex items-center justify-center text-gray-300'>
							<Maximize2 className='w-12 h-12' />
						</div>
					}
				</div>

				{/* Thông tin */}
				<div className='p-4'>
					<h3 className='mb-2 line-clamp-2'>{room.title}</h3>

					<div className='inline-flex items-baseline gap-1'>
						<PriceTag size='md' amount={room.price} />
					</div>

					<div className='flex items-center gap-1.5 text-sm text-muted-foreground mt-2'>
						<MapPin className='w-4 h-4' />
						<span className='line-clamp-1'>{room.address}</span>
					</div>

					<div className='flex items-center justify-between mt-3'>
						<div className='flex items-center gap-1.5'>
							<div className='flex items-center gap-0.5'>
								{[1, 2, 3, 4, 5].map((star) => (
									<Star
										key={star}
										className={`w-3.5 h-3.5 ${star <= room.avgRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} hover:cursor-pointer hover:scale-110 hover:transition-transform`}
									/>
								))}
							</div>
							{room.reviewCount !== undefined && (
								<span className='text-xs text-muted-foreground'>
									({room.reviewCount})
								</span>
							)}
						</div>
						<Badge
							variant='outline'
							className={cn(
								'rounded-full font-medium h-8',
								room.status === 'AVAILABLE' ?
									'bg-emerald-50 text-emerald-600 border-emerald-200'
								:	'bg-rose-50 text-rose-600 border-rose-200',
							)}>
							{room.status === 'AVAILABLE' ? 'Còn phòng' : 'Đã cho thuê'}
						</Badge>
					</div>
				</div>
			</div>
		</Link>
	);
};

export default RoomCard;
