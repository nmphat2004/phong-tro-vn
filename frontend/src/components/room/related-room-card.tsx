import { PriceTag } from '@/components/room/price-tag';
import { formatRelativeTime } from '@/lib/time-format';
import { Room } from '@/types';
import { Camera, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface RelatedRoomCardProps {
	room: Room;
	compact?: boolean;
}

const RelatedRoomCard = ({ room, compact = false }: RelatedRoomCardProps) => {
	const primaryImage =
		room.images?.find((img) => img.isPrimary) || room.images?.[0];
	const photoCount = room.images?.length || 0;

	if (compact) {
		return (
			<Link href={`/rooms/${room.id}`} className='flex gap-3 group'>
				<div className='relative h-16 w-24 rounded-md overflow-hidden border shrink-0 bg-secondary/20'>
					{primaryImage && (
						<Image
							src={primaryImage.url}
							alt={room.title}
							fill
							className='object-cover'
						/>
					)}
				</div>
				<div className='min-w-0 space-y-1'>
					<p className='line-clamp-2 text-sm font-medium group-hover:text-primary transition-colors'>
						{room.title}
					</p>
					<div className='text-sm font-semibold text-primary'>
						<PriceTag amount={room.price} size='sm' />
					</div>
					<p className='text-xs text-muted-foreground'>
						{formatRelativeTime(room.createdAt)}
					</p>
				</div>
			</Link>
		);
	}

	return (
		<Link
			href={`/rooms/${room.id}`}
			className='group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow'>
			<div className='relative h-40 bg-secondary/20'>
				{primaryImage && (
					<Image
						src={primaryImage.url}
						alt={room.title}
						fill
						className='object-cover'
					/>
				)}
				<div className='absolute left-2 bottom-2 rounded bg-black/55 text-white text-xs px-2 py-1 inline-flex items-center gap-1'>
					<Camera className='w-3 h-3' />
					{photoCount}
				</div>
			</div>
			<div className='p-3 space-y-2'>
				<p className='font-semibold line-clamp-2 group-hover:text-primary transition-colors'>
					{room.title}
				</p>
				<div className='text-primary font-semibold'>
					<PriceTag amount={room.price} size='sm' />
				</div>
				<p className='text-sm text-muted-foreground'>{room.area || '--'} m²</p>
				<p className='text-sm text-muted-foreground line-clamp-1 inline-flex items-center gap-1'>
					<MapPin className='w-3.5 h-3.5 shrink-0' />
					{room.address}
				</p>
				<p className='text-xs text-muted-foreground'>
					{formatRelativeTime(room.createdAt)}
				</p>
			</div>
		</Link>
	);
};

export default RelatedRoomCard;
