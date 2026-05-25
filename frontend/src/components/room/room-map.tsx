'use client';

import { useEffect } from 'react';
import {
	MapContainer,
	TileLayer,
	Marker,
	Popup,
	LayersControl,
	useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const POI_ICONS: Record<string, string> = {
	school: '🏫',
	hospital: '🏥',
	supermarket: '🛒',
	restaurant: '🍜',
	bank: '🏦',
	bus_station: '🚌',
	market: '🏪',
	park: '🌳',
};

const POI_LABELS: Record<string, string> = {
	school: 'Trường học',
	hospital: 'Bệnh viện',
	supermarket: 'Siêu thị',
	restaurant: 'Quán ăn',
	bank: 'Ngân hàng',
	bus_station: 'Trạm xe buýt',
	market: 'Chợ',
	park: 'Công viên',
};

function ChangeView({ center }: { center: [number, number] }) {
	const map = useMap();
	useEffect(() => {
		map.setView(center, map.getZoom());
	}, [center, map]);
	return null;
}

// Icon cho vị trí phòng trọ (pulsing red dot)
const roomIcon =
	typeof window !== 'undefined' ?
		L.divIcon({
			className: 'custom-room-marker',
			html: `
		<div class="relative flex items-center justify-center w-8 h-8">
			<div class="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping"></div>
			<div class="relative w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md"></div>
		</div>
	`,
			iconSize: [32, 32],
			iconAnchor: [16, 16],
		})
	:	null;

// Hàm tạo icon cho các tiện ích xung quanh
const createPoiIcon = (type: string) => {
	const emoji = POI_ICONS[type] || '📍';
	return L.divIcon({
		className: 'custom-poi-marker',
		html: `
			<div class="flex items-center justify-center w-8 h-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
				<span class="text-base">${emoji}</span>
			</div>
		`,
		iconSize: [32, 32],
		iconAnchor: [16, 16],
	});
};

export default function RoomMap({
	address,
	lat,
	lng,
}: {
	address?: string;
	lat?: number;
	lng?: number;
}) {
	// Ưu tiên sử dụng tọa độ lat, lng truyền vào từ Database
	const hasCoords =
		lat !== undefined &&
		lng !== undefined &&
		Number.isFinite(lat) &&
		Number.isFinite(lng);

	const { data: geocodeData, isLoading: isGeocodingLoading } = useQuery({
		queryKey: ['room-map-geocode', address],
		queryFn: async () => {
			const res = await api.get<{ lat: number; lng: number }>(
				'/analytics/geocode',
				{
					params: { address },
				},
			);
			return res.data;
		},
		enabled: !hasCoords && Boolean(address),
	});

	const finalLat = hasCoords ? lat : geocodeData?.lat;
	const finalLng = hasCoords ? lng : geocodeData?.lng;

	// Query lấy thông tin phân tích tiện ích xung quanh (sử dụng cùng key để tận dụng cache)
	const { data: neighborhoodData } = useQuery({
		queryKey: ['neighborhood', finalLat, finalLng],
		queryFn: () =>
			api
				.get(`/analytics/neighborhood?lat=${finalLat}&lng=${finalLng}`)
				.then((r) => r.data),
		enabled: !!finalLat && !!finalLng,
		staleTime: 1000 * 60 * 30, // cache 30 phút
	});

	if (isGeocodingLoading && !hasCoords) {
		return <Skeleton className='h-[350px] w-full rounded-xl mt-4' />;
	}

	if ((!finalLat || !finalLng) && !isGeocodingLoading) {
		return (
			<div className='w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground mt-4'>
				Không xác định được vị trí từ địa chỉ để hiển thị bản đồ.
			</div>
		);
	}

	const position: [number, number] = [finalLat as number, finalLng as number];
	const externalQuery = `${finalLat},${finalLng}`;

	return (
		<div className='w-full rounded-xl overflow-hidden border border-border mt-4 relative'>
			{/* Address header */}
			<div className='bg-card px-4 py-3 border-b border-border z-10 relative'>
				<div className='flex items-start gap-2'>
					<svg
						className='w-4 h-4 mt-0.5 text-red-500 shrink-0'
						viewBox='0 0 24 24'
						fill='currentColor'>
						<path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
					</svg>
					<div className='flex-1 min-w-0'>
						<p className='text-sm text-muted-foreground leading-snug font-medium'>
							{address}
						</p>
						<a
							href={`https://www.google.com/maps?q=${externalQuery}`}
							target='_blank'
							rel='noopener noreferrer'
							className='text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1 mt-0.5'>
							Xem bản đồ lớn trên Google Maps
						</a>
					</div>
				</div>
			</div>

			{/* Leaflet Map with Google Tiles */}
			<div className='h-[350px] w-full relative z-0'>
				<MapContainer
					center={position}
					zoom={16}
					scrollWheelZoom={false}
					className='h-full w-full'>
					<LayersControl position='topright'>
						<LayersControl.BaseLayer checked name='Bản đồ giao thông (Google)'>
							<TileLayer
								attribution='&copy; Google Maps'
								url='https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
							/>
						</LayersControl.BaseLayer>
						<LayersControl.BaseLayer name='Ảnh vệ tinh (Google Hybrid)'>
							<TileLayer
								attribution='&copy; Google Maps'
								url='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
							/>
						</LayersControl.BaseLayer>
					</LayersControl>

					{/* Ghim vị trí phòng trọ */}
					{roomIcon && (
						<Marker position={position} icon={roomIcon}>
							<Popup>
								<div className='p-1.5 text-xs font-sans'>
									<p className='font-bold text-foreground text-sm'>
										Vị trí phòng trọ
									</p>
									<p className='text-muted-foreground mt-0.5'>{address}</p>
								</div>
							</Popup>
						</Marker>
					)}

					{/* Ghim các tiện ích xung quanh */}
					{neighborhoodData?.nearbyPlaces?.map((place: any, idx: number) => {
						if (!place.lat || !place.lng) return null;
						return (
							<Marker
								key={idx}
								position={[place.lat, place.lng]}
								icon={createPoiIcon(place.type)}>
								<Popup>
									<div className='p-1.5 text-xs font-sans max-w-[200px]'>
										<p className='font-bold text-sm leading-snug'>
											{place.name}
										</p>
										<p className='mt-1'>
											{POI_LABELS[place.type] || place.type} •{' '}
											<span className='font-medium'>
												{place.distance < 1000 ?
													`${place.distance}m`
												:	`${(place.distance / 1000).toFixed(1)}km`}
											</span>
										</p>
									</div>
								</Popup>
							</Marker>
						);
					})}

					<ChangeView center={position} />
				</MapContainer>
			</div>

			{/* Link mở trong Google Maps */}
			<a
				href={`https://www.google.com/maps?q=${externalQuery}`}
				target='_blank'
				rel='noopener noreferrer'
				className='absolute bottom-3 left-3 bg-card hover:bg-secondary px-3 py-1.5 rounded-lg shadow-md text-xs font-semibold text-blue-600 transition-colors flex items-center gap-1.5 border border-border z-[400]'>
				<svg
					className='w-3.5 h-3.5'
					viewBox='0 0 24 24'
					fill='none'
					stroke='currentColor'
					strokeWidth='2.5'>
					<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3' />
				</svg>
				Mở trong Google Maps
			</a>
		</div>
	);
}
