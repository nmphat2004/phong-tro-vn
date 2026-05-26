'use client';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import RoomCard from './room-card';
import Link from 'next/link';

const RoomRecommendations = () => {
	const { user } = useAuthStore();

	// Personalized recommendations (only when logged in)
	const { data: personalizedData, isLoading: personalizedLoading } = useQuery({
		queryKey: ['recommendations', user?.id],
		queryFn: () => api.get('/recommendations').then((r) => r.data),
		enabled: !!user,
		staleTime: 1000 * 60 * 10,
	});

	// Popular rooms (always fetch as fallback)
	const { data: popularData, isLoading: popularLoading } = useQuery({
		queryKey: ['recommendations', 'popular'],
		queryFn: () => api.get('/recommendations/popular').then((r) => r.data),
		staleTime: 1000 * 60 * 10,
		// Only fetch if: not logged in, OR logged in but personalized returned empty
		enabled:
			!user ||
			(!!user && !personalizedLoading && !personalizedData?.rooms?.length),
	});

	const isLoading = user ? personalizedLoading : popularLoading;

	// Use personalized if available, otherwise fallback to popular
	const data =
		user && personalizedData?.rooms?.length ? personalizedData : popularData;

	if (isLoading) {
		return (
			<section className='py-16'>
				<div className='max-w-7xl mx-auto px-4'>
					<div className='flex items-center gap-3 mb-8'>
						<Skeleton className='h-10 w-10 rounded-xl' />
						<div className='space-y-2'>
							<Skeleton className='h-6 w-56' />
							<Skeleton className='h-4 w-40' />
						</div>
					</div>
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className='rounded-2xl border overflow-hidden'>
								<Skeleton className='h-48 w-full' />
								<div className='p-4 space-y-3'>
									<Skeleton className='h-4 w-3/4' />
									<Skeleton className='h-4 w-full' />
									<Skeleton className='h-4 w-1/2' />
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		);
	}

	if (!data?.rooms?.length) return null;

	const isPersonalized = data.type === 'personalized';

	return (
		<section className='py-16 relative overflow-hidden'>
			{/* Decorative background */}
			<div className='absolute inset-0 bg-linear-to-br from-primary/3 via-transparent to-violet-500/3' />
			<div className='absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2' />
			<div className='absolute bottom-0 left-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2' />

			<div className='max-w-7xl mx-auto px-4 relative z-10'>
				{/* Section Header */}
				<div className='flex items-center justify-between mb-8'>
					<div className='flex items-center gap-3'>
						<div
							className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
								isPersonalized ?
									'bg-linear-to-br from-primary to-blue-600'
								:	'bg-linear-to-br from-amber-500 to-orange-500'
							}`}>
							{isPersonalized ?
								<Sparkles className='w-5 h-5 text-white' />
							:	<TrendingUp className='w-5 h-5 text-white' />}
						</div>
						<div>
							<h2 className='text-2xl font-bold text-foreground'>
								{isPersonalized ? 'Gợi ý cho bạn' : 'Phòng nổi bật'}
							</h2>
							<p className='text-sm text-muted-foreground mt-0.5'>
								{data.basedOn}
							</p>
						</div>
					</div>
					<Link
						href='/rooms'
						className='flex items-center gap-1 text-primary hover:bg-primary/10 px-4 py-2 rounded-lg font-medium transition-colors'>
						Xem tất cả <ChevronRight className='w-4 h-4' />
					</Link>
				</div>

				{/* Room Grid */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'>
					{data.rooms.slice(0, 4).map((room: any) => (
						<div key={room.id} className='relative group'>
							{/* Match score badge */}
							{room.matchScore && (
								<div className='absolute top-3 left-3 z-10'>
									<span className='inline-flex items-center gap-1 bg-linear-to-r from-primary to-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg shadow-primary/25'>
										<Sparkles className='w-3 h-3' />
										{room.matchScore}% phù hợp
									</span>
								</div>
							)}
							<RoomCard room={room} />
							{/* Match reason */}
							{room.matchReason && (
								<div className='mt-2 px-1'>
									<p className='text-xs text-primary/80 font-medium line-clamp-1 flex items-center gap-1'>
										<span className='inline-block w-1 h-1 rounded-full bg-primary/60 shrink-0' />
										{room.matchReason}
									</p>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default RoomRecommendations;
