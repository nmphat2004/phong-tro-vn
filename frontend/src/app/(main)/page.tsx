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
	ChevronDown,
	Home,
	School,
	Search,
	ShieldCheck,
	Star,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
			color: 'bg-indigo-500/8 text-indigo-600 dark:text-indigo-400 border-indigo-500/10',
		},
		{
			icon: Building,
			title: 'Nhà riêng',
			value: 'house',
			color: 'bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border-emerald-500/10',
		},
		{
			icon: Building2,
			title: 'Chung cư mini',
			value: 'mini',
			color: 'bg-violet-500/8 text-violet-600 dark:text-violet-400 border-violet-500/10',
		},
		{
			icon: School,
			title: 'Ký túc xá',
			value: 'shared',
			color: 'bg-amber-500/8 text-amber-600 dark:text-amber-400 border-amber-500/10',
		},
	];

	// Fetch newest rooms
	const { data: latestRooms, isLoading: newestLoading } = useQuery({
		queryKey: ['rooms', 'newest'],
		queryFn: () => getRooms({ sortBy: 'newest', page: 1, limit: 4 }),
	});

	const isLoading = newestLoading;

	return (
		<div className='bg-background flex flex-col min-h-screen'>
			{/* Split Hero Section */}
			<section className="relative pt-20 pb-16 md:pt-24 md:pb-24 overflow-hidden border-b border-border/40 bg-linear-to-b from-primary/3 via-transparent to-transparent">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(67,56,202,0.05),transparent_45%)]" />
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
						{/* Left Column: Text Content & Search Panel */}
						<div className="lg:col-span-7 space-y-6 text-left">
							<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground tracking-tight leading-tight">
								Tìm kiếm phòng trọ <span className="bg-linear-to-r from-primary to-indigo-600 bg-clip-text text-transparent">uy tín</span> và nhanh chóng
							</h1>
							<p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
								Hơn 100.000 tin đăng phòng trọ, chung cư mini được kiểm duyệt kỹ càng giúp bạn an tâm tìm tổ ấm.
							</p>

							{/* Search Panel */}
							<div className="bg-card border border-border/50 rounded-2xl shadow-xl p-4 sm:p-5 w-full max-w-2xl">
								<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
									{/* District */}
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider block">
											Khu vực
										</label>
										<div className="relative">
											<select
												value={searchDistrict}
												onChange={(e) => setSearchDistrict(e.target.value)}
												className="w-full px-3.5 py-2.5 outline-none rounded-xl bg-secondary/50 border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm appearance-none cursor-pointer"
											>
												<option value="">Tất cả Quận/Huyện</option>
												{hcmDistricts.map((d) => (
													<option key={d.name} value={d.name}>
														{d.name}
													</option>
												))}
											</select>
											<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
										</div>
									</div>

									{/* Room Type */}
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider block">
											Loại phòng
										</label>
										<div className="relative">
											<select
												value={roomType}
												onChange={(e) => setRoomType(e.target.value)}
												className="w-full px-3.5 py-2.5 outline-none rounded-xl bg-secondary/50 border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm appearance-none cursor-pointer"
											>
												<option value="">Tất cả loại phòng</option>
												{roomTypesList.map((type) => (
													<option key={type.label} value={type.value}>
														{type.label}
													</option>
												))}
											</select>
											<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
										</div>
									</div>

									{/* Price Range */}
									<div className="space-y-1.5">
										<label className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider block">
											Mức giá
										</label>
										<div className="relative">
											<select
												value={priceRange}
												onChange={(e) => setPriceRange(e.target.value)}
												className="w-full px-3.5 py-2.5 outline-none rounded-xl bg-secondary/50 border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-sm appearance-none cursor-pointer"
											>
												<option value="">Chọn mức giá</option>
												{priceRanges.map((range) => (
													<option key={range.label} value={range.label}>
														{range.label}
													</option>
												))}
											</select>
											<ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
										</div>
									</div>
								</div>

								<div className="mt-4">
									<Link href={`/rooms?district=${searchDistrict}&roomType=${roomType}&price=${priceRange}`} className="w-full block">
										<Button className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-bold shadow-md rounded-xl active:scale-[0.98] transition-transform">
											<Search className="w-4 h-4 mr-2" /> Tìm kiếm ngay
										</Button>
									</Link>
								</div>
							</div>
						</div>

						{/* Right Column: Visual Preview */}
						<div className="lg:col-span-5 relative hidden lg:block">
							<div className="relative w-full aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border border-border/40 group">
								<Image
									src="/hero_apartment.png"
									alt="Premium Apartment Interior"
									fill
									priority
									sizes="500px"
									className="object-cover group-hover:scale-103 transition-transform duration-700"
								/>
								{/* Glass overlay details for physical edge refraction */}
								<div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none" />
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Stats Banner */}
			<section className="bg-secondary/20 py-8 md:py-10 border-b border-border/40">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
						<div className="flex items-center gap-4.5 text-left">
							<div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
								<ShieldCheck className="w-6 h-6 text-primary" />
							</div>
							<div>
								<h4 className="text-base font-bold text-foreground">100% Tin duyệt kỹ</h4>
								<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
									Hệ thống lọc tin đăng thông minh và được kiểm duyệt thủ công.
								</p>
							</div>
						</div>

						<div className="flex items-center gap-4.5 text-left md:border-x md:border-border/40 md:px-8">
							<div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
								<Star className="w-6 h-6 text-primary" />
							</div>
							<div>
								<h4 className="text-base font-bold text-foreground">Đánh giá thực tế</h4>
								<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
									Hệ thống review và chấm điểm minh bạch từ chính người thuê trọ.
								</p>
							</div>
						</div>

						<div className="flex items-center gap-4.5 text-left">
							<div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
								<Users className="w-6 h-6 text-primary" />
							</div>
							<div>
								<h4 className="text-base font-bold text-foreground">Kết nối tức thì</h4>
								<p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
									Hỗ trợ đàm thoại và trao đổi trực tiếp giữa chủ trọ và người tìm.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Quick categories */}
			<section className="py-16 md:py-20">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-left mb-8 md:mb-10">
						<h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
							Phân loại phòng thuê
						</h2>
						<p className="text-sm text-muted-foreground mt-1">
							Khám phá phòng trọ theo nhu cầu của bạn
						</p>
					</div>

					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
						{categories.map((category) => (
							<Link
								href={`/rooms?roomType=${category.value}`}
								key={category.title}
								className={`group bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:shadow-lg hover:shadow-primary/3 hover:scale-102 hover:-translate-y-0.5 transition-all duration-300 text-center flex flex-col items-center`}
							>
								<div
									className={`w-16 h-16 rounded-2xl ${category.color} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}
								>
									<category.icon className="w-8 h-8" />
								</div>
								<h3 className="font-bold text-base sm:text-lg text-foreground mb-1">
									{category.title}
								</h3>
								<span className="text-xs text-muted-foreground group-hover:text-primary transition-colors mt-1 block">
									Xem tin đăng &rarr;
								</span>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* AI Recommendations */}
			<RoomRecommendations />

			{/* Latest Listings */}
			<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
				<div className="flex items-end justify-between mb-8">
					<div className="text-left">
						<h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
							Tin đăng mới nhất
						</h2>
						<p className="text-muted-foreground text-xs sm:text-sm mt-1">
							Cập nhật liên tục 24/7
						</p>
					</div>
					<Link
						href="/rooms?sortBy=newest"
						className="flex items-center gap-1 text-xs sm:text-sm text-primary hover:bg-primary/8 px-3.5 py-2 rounded-xl font-bold transition-all"
					>
						Xem thêm <ChevronRight className="w-4 h-4" />
					</Link>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{isLoading ?
						Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="space-y-4">
								<Skeleton className="h-48 w-full rounded-2xl" />
								<Skeleton className="h-4 w-3/4 rounded-lg" />
								<Skeleton className="h-4 w-1/2 rounded-lg" />
							</div>
						))
					:	latestRooms?.data.map((room: any) => (
							<RoomCard room={room} key={room.id} layout="grid" />
						))
					}
				</div>
			</section>

			{/* CTA Banner for Landlords */}
			<section className="bg-linear-to-br from-zinc-900 via-slate-900 to-indigo-950 text-white py-16 md:py-24 border-t border-border/20 w-full relative overflow-hidden">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(67,56,202,0.15),transparent_40%)] animate-pulse" />
				<div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-6 sm:space-y-8">
					<h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
						Bạn có phòng cho thuê?
					</h2>
					<p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
						Tiếp cận hàng nghìn khách thuê tiềm năng mỗi ngày. Đăng tin miễn phí, duyệt nhanh chóng, quản lý dễ dàng.
					</p>
					<div className="pt-2">
						<Link href="/post" onClick={handlePostClick}>
							<Button
								variant="default"
								size="lg"
								className="bg-primary text-white hover:bg-primary/90 text-sm sm:text-base font-bold shadow-xl rounded-xl active:scale-[0.98] transition-all px-8 py-6 h-auto border border-white/10"
							>
								Đăng tin ngay
							</Button>
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
};

export default HomePage;
