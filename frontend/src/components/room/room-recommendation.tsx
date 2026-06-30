'use client';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import RoomCard from './room-card';
import Link from 'next/link';
import { motion } from 'motion/react';

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

	const containerVariants = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.08
			}
		}
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 16 },
		show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
	};

	return (
		<section className='py-16 md:py-20 relative overflow-hidden bg-secondary/10 border-y border-border/40'>
			{/* Subtle mesh background */}
			<div className='absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(67,56,202,0.03),transparent_35%)] pointer-events-none' />

			<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10'>
				{/* Section Header */}
				<div className='flex items-center justify-between mb-8'>
					<div className='flex items-center gap-3.5'>
						<div
							className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs border ${
								isPersonalized ?
									'bg-primary/10 text-primary border-primary/15'
								:	'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/15'
							}`}>
							{isPersonalized ?
								<Sparkles className='w-5.5 h-5.5' />
							:	<TrendingUp className='w-5.5 h-5.5' />}
						</div>
						<div className='text-left'>
							<h2 className='text-xl md:text-2xl font-extrabold text-foreground tracking-tight'>
								{isPersonalized ? 'Gợi ý cho bạn' : 'Phòng nổi bật'}
							</h2>
							<p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
								{data.basedOn}
							</p>
						</div>
					</div>
					<Link
						href='/rooms'
						className='flex items-center gap-1 text-xs sm:text-sm text-primary hover:bg-primary/8 px-3.5 py-2 rounded-xl font-bold transition-all'>
						Xem tất cả <ChevronRight className='w-4 h-4' />
					</Link>
				</div>

				{/* Room Grid with Motion Stagger */}
				<motion.div
					variants={containerVariants}
					initial='hidden'
					whileInView='show'
					viewport={{ once: true, amount: 0.1 }}
					className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
				>
					{data.rooms.slice(0, 4).map((room: any) => (
						<motion.div key={room.id} variants={itemVariants} className='relative group h-full'>
							{/* Match score badge */}
							{room.matchScore && (
								<div className='absolute top-3 left-3 z-10'>
									<span className='inline-flex items-center gap-1 bg-linear-to-r from-primary to-indigo-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg shadow-primary/20'>
										<Sparkles className='w-3 h-3' />
										{room.matchScore}% phù hợp
									</span>
								</div>
							)}
							<RoomCard room={room} />
							{/* Match reason */}
							{room.matchReason && (
								<div className='mt-2.5 px-1 text-left'>
									<p className='text-xs text-primary font-medium line-clamp-1 flex items-center gap-1.5'>
										<span className='inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0' />
										{room.matchReason}
									</p>
								</div>
							)}
						</motion.div>
					))}
				</motion.div>
			</div>
		</section>
	);
};

export default RoomRecommendations;
