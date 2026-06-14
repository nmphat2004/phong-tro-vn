'use client';
import RoomCard from '@/components/room/room-card';
import RoomRecommendations from '@/components/room/room-recommendation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { hcmDistricts, priceRanges, roomTypesList } from '@/data/data';
import { getRooms } from '@/lib/api/room.api';
import { useAuthStore } from '@/stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import {
	Building,
	Building2,
	ChevronRight,
	Home,
	School,
	Search,
	ShieldCheck,
	Star,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

const HomePage = () => {
	const [searchDistrict, setSearchDistrict] = useState('');
	const [priceRange, setPriceRange] = useState('');
	const [roomType, setRoomType] = useState('');
	const { user } = useAuthStore();
	const router = useRouter();

	const handlePostClick = (e: React.MouseEvent) => {
		if (user?.role !== 'LANDLORD') {
			e.preventDefault();
			toast.error('Bạn cần có tài khoản Chủ trọ để đăng tin!', {
				description: 'Vui lòng đăng nhập với vai trò Chủ trọ.',
				action: {
					label: 'Đăng nhập',
					onClick: () => router.push('/login'),
				},
			});
		}
	};

	const categories = [
		{
			icon: Home,
			title: 'Phòng trọ',
			value: 'room',
			color: 'bg-blue-500/10 text-blue-600',
		},
		{
			icon: Building,
			title: 'Nhà nguyên căn',
			value: 'house',
			color: 'bg-green-500/10 text-green-600',
		},
		{
			icon: Building2,
			title: 'Chung cư mini',
			value: 'mini',
			color: 'bg-purple-500/10 text-purple-600',
		},
		{
			icon: School,
			title: 'Ký túc xá',
			value: 'shared',
			color: 'bg-orange-500/10 text-orange-600',
		},
	];

	// Fetch newest rooms
	const { data: latestRooms, isLoading: newestLoading } = useQuery({
		queryKey: ['rooms', 'newest'],
		queryFn: () => getRooms({ sortBy: 'newest', page: 1, limit: 4 }),
	});

	const isLoading = newestLoading;

	return (
		<div className='bg-background flex flex-col'>
			{/* Advanced Hero Section */}
			<section
				className='relative pt-16 pb-20 md:pt-24 md:pb-32 flex items-center justify-center'
				style={{
					backgroundImage:
						'url(https://images.unsplash.com/photo-1560518883-ce09059eeefa?w=1600&blur=40)',
					backgroundSize: 'cover',
					backgroundPosition: 'center',
				}}>
				<div className='absolute inset-0 bg-linear-to-r from-blue-900/80 to-slate-900/80'></div>
				<div className='relative z-10 w-full max-w-5xl mx-auto px-4 text-center'>
					<h1 className='text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight drop-shadow-md'>
						Nơi tìm kiếm Phòng Trọ uy tín
					</h1>
					<p className='text-sm sm:text-base md:text-xl text-blue-100 mb-8 font-medium drop-shadow'>
						Hơn 100.000 tin đăng phòng trọ, nhà nguyên căn, chung cư mini
					</p>

					{/* Deep Search Panel */}
					<div className='bg-card rounded-2xl shadow-2xl p-4 md:p-6 w-full text-left'>
						<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
							<div className='space-y-1'>
								<label className='text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1'>
									Khu vực
								</label>
								<select
									value={searchDistrict}
									onChange={(e) => setSearchDistrict(e.target.value)}
									className='w-full px-3 py-2.5 outline-none rounded-lg bg-secondary border border-border focus:border-primary transition-colors focus:ring-1 focus:ring-primary text-sm'>
									<option value=''>Tất cả Quận/Huyện</option>
									{hcmDistricts.map((d) => (
										<option key={d.name} value={d.name}>
											{d.name}
										</option>
									))}
								</select>
							</div>

							<div className='space-y-1'>
								<label className='text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1'>
									Loại phòng
								</label>
								<select
									value={roomType}
									onChange={(e) => setRoomType(e.target.value)}
									className='w-full px-3 py-2.5 outline-none rounded-lg bg-secondary border border-border focus:border-primary transition-colors focus:ring-1 focus:ring-primary text-sm'>
									<option value=''>Tất cả loại phòng</option>
									{roomTypesList.map((type) => (
										<option key={type.label} value={type.value}>
											{type.label}
										</option>
									))}
								</select>
							</div>

							<div className='space-y-1'>
								<label className='text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1'>
									Mức giá
								</label>
								<select
									value={priceRange}
									onChange={(e) => setPriceRange(e.target.value)}
									className='w-full px-3 py-2.5 outline-none rounded-lg bg-secondary border border-border focus:border-primary transition-colors focus:ring-1 focus:ring-primary text-sm'>
									<option value=''>Chọn mức giá</option>
									{priceRanges.map((range) => (
										<option key={range.label} value={range.label}>
											{range.label}
										</option>
									))}
								</select>
							</div>

							<div className='space-y-1'>
								<label className='text-xs font-semibold text-gray-500 uppercase opacity-0 hidden md:block'>
									Search
								</label>
								<Link
									href={`/rooms?district=${searchDistrict}&roomType=${roomType}&price=${priceRange}`}
									className='w-full flex'>
									<Button className='w-full h-10 md:h-[42px] bg-primary hover:bg-primary/95 text-sm md:text-md font-bold shadow-md'>
										<Search className='w-4 h-4 mr-2' /> Tìm kiếm
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Stats Banner */}
			<section className='bg-primary text-white py-6 shadow-inner relative z-20 -mt-6 sm:-mt-8 mx-4 sm:mx-auto max-w-6xl w-[calc(100%-2rem)] sm:w-auto rounded-2xl'>
				<div className='grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center px-4'>
					<div className='flex flex-col items-center justify-center gap-2'>
						<ShieldCheck className='w-7.5 h-7.5 md:w-8 md:h-8 opacity-80' />
						<div>
							<h4 className='text-lg md:text-xl font-bold'>100% Tin duyệt kỹ</h4>
							<p className='text-xs md:text-sm text-primary-foreground/80'>
								Hệ thống lọc tin đăng thông minh
							</p>
						</div>
					</div>
					<div className='flex flex-col items-center justify-center gap-2 border-y md:border-y-0 md:border-x border-white/20 py-4 md:py-0'>
						<Star className='w-7.5 h-7.5 md:w-8 md:h-8 opacity-80' />
						<div>
							<h4 className='text-lg md:text-xl font-bold'>Trải nghiệm thực tế</h4>
							<p className='text-xs md:text-sm text-primary-foreground/80'>
								Đánh giá trực tiếp từ người thuê
							</p>
						</div>
					</div>
					<div className='flex flex-col items-center justify-center gap-2'>
						<Users className='w-7.5 h-7.5 md:w-8 md:h-8 opacity-80' />
						<div>
							<h4 className='text-lg md:text-xl font-bold'>Dễ dàng truy cập</h4>
							<p className='text-xs md:text-sm text-primary-foreground/80'>
								Tìm kiếm dễ dàng, nhanh chóng
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Quick categories */}
			<section className='bg-secondary/30 py-8 md:py-12'>
				<div className='max-w-7xl mx-auto px-4'>
					<h2 className='text-xl md:text-2xl font-bold mb-5 md:mb-6'>Phân loại phòng</h2>
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4'>
						{categories.map((category) => (
							<Link
								href={`/rooms?roomType=${category.value}`}
								key={category.title}
								className='bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-center'>
								<div
									className={`w-12 h-12 sm:w-16 sm:h-16 ${category.color} rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4`}>
									<category.icon className='w-6 h-6 sm:w-8 sm:h-8' />
								</div>
								<h3 className='mb-1 font-bold text-sm sm:text-base text-foreground'>
									{category.title}
								</h3>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* AI Recommendations */}
			<RoomRecommendations />

			{/* Latest Listings */}
			<section className='max-w-7xl mx-auto px-4 py-10 md:py-16 w-full'>
				<div className='flex items-center justify-between mb-6 md:mb-8'>
					<div>
						<h2 className='text-xl md:text-2xl font-bold text-foreground'>
							Tin đăng mới nhất
						</h2>
						<p className='text-muted-foreground text-xs md:text-sm mt-1'>
							Cập nhật liên tục 24/7
						</p>
					</div>
					<Link
						href='/rooms?sortBy=newest'
						className='flex items-center gap-1 text-xs md:text-sm text-primary hover:bg-primary/10 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium transition-colors'>
						Xem thêm <ChevronRight className='w-4 h-4' />
					</Link>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6'>
					{isLoading ?
						Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className='space-y-4'>
								<Skeleton className='h-48 w-full rounded-xl' />
								<Skeleton className='h-4 w-3/4' />
								<Skeleton className='h-4 w-1/2' />
							</div>
						))
					:	latestRooms?.data.map((room: any) => (
							<RoomCard room={room} key={room.id} layout='grid' />
						))
					}
				</div>
			</section>

			{/* CTA Banner for Landlords */}
			<section className='bg-linear-to-br from-slate-900 to-blue-900 text-white py-12 md:py-20 w-full'>
				<div className='max-w-4xl mx-auto px-4 text-center'>
					<h2 className='mb-3 md:mb-4 text-2xl md:text-4xl font-bold'>
						Bạn có phòng cho thuê?
					</h2>
					<p className='mb-6 md:mb-8 text-sm md:text-lg text-blue-100 max-w-2xl mx-auto'>
						Tiếp cận hàng nghìn khách thuê tiềm năng mỗi ngày. Đăng tin miễn
						phí, duyệt nhanh chóng, quản lý dễ dàng.
					</p>
					<Link href='/post' onClick={handlePostClick}>
						<Button
							variant='default'
							size='lg'
							className='bg-primary h-11 md:h-12 px-6 md:px-8 text-white hover:bg-primary/90 text-sm md:text-lg font-bold shadow-xl border border-white/20 rounded-xl'>
							Đăng tin ngay
						</Button>
					</Link>
				</div>
			</section>
		</div>
	);
};

export default HomePage;
