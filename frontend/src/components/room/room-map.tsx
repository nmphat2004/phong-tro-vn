'use client';

import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

export default function RoomMap({ address, lat, lng }: { address?: string; lat?: number; lng?: number }) {
	// Ưu tiên sử dụng tọa độ lat, lng truyền vào từ Database
	const hasCoords = lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['room-map-geocode', address],
		queryFn: async () => {
			const res = await api.get<{ lat: number; lng: number }>('/analytics/geocode', {
				params: { address },
			});
			return res.data;
		},
		enabled: !hasCoords && Boolean(address),
	});

	const finalLat = hasCoords ? lat : data?.lat;
	const finalLng = hasCoords ? lng : data?.lng;

	if (isLoading && !hasCoords) {
		return <Skeleton className='h-[300px] w-full rounded-xl mt-4' />;
	}

	if ((!finalLat || !finalLng) && !isLoading) {
		return (
			<div className='w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground mt-4'>
				Không xác định được vị trí từ địa chỉ để hiển thị bản đồ.
			</div>
		);
	}

	// Kết hợp tọa độ và địa chỉ trong ngoặc đơn để Google Maps hiển thị đúng Marker và đúng nhãn địa chỉ
	const mapQuery = `${finalLat},${finalLng} (${encodeURIComponent(address || '')})`;
	const googleMapsUrl = `https://maps.google.com/maps?q=${mapQuery}&hl=vi&z=16&output=embed`;
	const externalQuery = encodeURIComponent(address || `${finalLat},${finalLng}`);

	return (
		<div className='w-full rounded-xl overflow-hidden border border-border mt-4 relative'>
			{/* Address header */}
			<div className='bg-card px-4 py-3 border-b border-border'>
				<div className='flex items-start gap-2'>
					<svg className='w-4 h-4 mt-0.5 text-red-500 shrink-0' viewBox='0 0 24 24' fill='currentColor'>
						<path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/>
					</svg>
					<div className='flex-1 min-w-0'>
						<p className='text-sm text-muted-foreground leading-snug'>{address}</p>
						<a
							href={`https://www.google.com/maps?q=${externalQuery}`}
							target='_blank'
							rel='noopener noreferrer'
							className='text-xs text-blue-600 hover:underline font-medium'>
							Xem bản đồ lớn
						</a>
					</div>
				</div>
			</div>

			{/* Google Maps iframe */}
			<iframe
				src={googleMapsUrl}
				width='100%'
				height='300'
				style={{ border: 0 }}
				allowFullScreen
				loading='lazy'
				referrerPolicy='no-referrer-when-downgrade'
				title='Bản đồ vị trí phòng'
			/>

			{/* "Mở trong Maps" link */}
			<a
				href={`https://www.google.com/maps?q=${externalQuery}`}
				target='_blank'
				rel='noopener noreferrer'
				className='absolute bottom-3 left-3 bg-card px-3 py-1.5 rounded-lg shadow-md text-xs font-medium text-blue-600 hover:bg-secondary transition-colors flex items-center gap-1.5 border border-border'>
				<svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
					<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3'/>
				</svg>
				Mở trong Maps
			</a>
		</div>
	);
}
