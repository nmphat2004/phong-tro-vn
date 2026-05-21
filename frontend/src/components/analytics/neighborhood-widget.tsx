/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { MapPin, Star } from 'lucide-react';
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

const SCORE_LABELS = ['Tiện nghi', 'Giao thông', 'An ninh', 'Yên tĩnh'];
const SCORE_KEYS = [
	'convenienceScore',
	'transportScore',
	'safetyScore',
	'noiseScore',
];

const gradeColor: Record<string, string> = {
	A: 'bg-green-500/15 text-green-600',
	B: 'bg-blue-500/15 text-blue-600',
	C: 'bg-yellow-500/15 text-yellow-600',
	D: 'bg-red-500/15 text-red-600',
};

interface Props {
	lat: number;
	lng: number;
}

export default function NeighborhoodWidget({ lat, lng }: Props) {
	const { data, isLoading } = useQuery({
		queryKey: ['neighborhood', lat, lng],
		queryFn: () =>
			api
				.get(`/analytics/neighborhood?lat=${lat}&lng=${lng}`)
				.then((r) => r.data),
		enabled: !!lat && !!lng,
		staleTime: 1000 * 60 * 30, // cache 30 phút
	});

	if (!lat || !lng) return null;

	if (isLoading) {
		return (
			<div className='border rounded-xl p-5 space-y-3'>
				<Skeleton className='h-5 w-40' />
				<Skeleton className='h-16 w-full' />
				<Skeleton className='h-4 w-full' />
				<Skeleton className='h-4 w-3/4' />
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className='border rounded-xl p-5 space-y-4'>
			{/* Header */}
			<div className='flex items-center justify-between'>
				<h3 className='font-semibold flex items-center gap-2'>
					<MapPin className='w-4 h-4 text-blue-600' />
					Phân tích khu vực
				</h3>
				<div
					className={`text-lg font-bold px-3 py-1 rounded-full ${gradeColor[data.grade] || gradeColor.C}`}>
					{data.grade}
				</div>
			</div>

			{/* Overall score */}
			<div className='flex items-center gap-3 bg-secondary rounded-lg p-3'>
				<div className='text-4xl font-bold text-foreground'>{data.overall}</div>
				<div>
					<div className='flex gap-0.5'>
						{Array.from({ length: 5 }).map((_, i) => (
							<Star
								key={i}
								className={`w-4 h-4 ${i < Math.round(data.overall / 20) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
							/>
						))}
					</div>
					<p className='text-xs text-muted-foreground mt-0.5'>trên 100 điểm</p>
				</div>
			</div>

			{/* Score breakdown */}
			<div className='space-y-2.5'>
				{SCORE_KEYS.map((key, i) => {
					const score = data.scores[key] || 0;
					const label =
						score >= 80 ? 'Xuất sắc'
						: score >= 65 ? 'Tốt'
						: score >= 50 ? 'Trung bình'
						: 'Hạn chế';
					const barColor =
						score >= 80 ? 'bg-green-500'
						: score >= 65 ? 'bg-blue-500'
						: score >= 50 ? 'bg-yellow-500'
						: 'bg-red-400';

					return (
						<div key={key}>
							<div className='flex justify-between text-sm mb-1'>
								<span className='text-muted-foreground'>{SCORE_LABELS[i]}</span>
								<span className='font-medium text-foreground'>
									{score} — {label}
								</span>
							</div>
							<div className='h-2 bg-secondary rounded-full overflow-hidden'>
								<div
									className={`h-full rounded-full transition-all duration-500 ${barColor}`}
									style={{ width: `${score}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>

			{/* Nearby places */}
			{data.nearbyPlaces?.length > 0 && (
				<div>
					<p className='text-sm font-medium text-foreground mb-2'>Xung quanh:</p>
					<div className='space-y-1.5'>
						{data.nearbyPlaces.slice(0, 5).map((place: any, i: number) => (
							<div
								key={i}
								className='flex items-center justify-between text-sm'>
								<span className='flex items-center gap-1.5 text-muted-foreground'>
									<span>{POI_ICONS[place.type] || '📍'}</span>
									<span className='line-clamp-1'>{place.name}</span>
								</span>
								<span className='text-muted-foreground shrink-0 ml-2'>
									{place.distance < 1000 ?
										`${place.distance}m`
									:	`${(place.distance / 1000).toFixed(1)}km`}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Summary */}
			<p className='text-xs text-muted-foreground border-t border-border pt-3'>{data.summary}</p>
		</div>
	);
}
