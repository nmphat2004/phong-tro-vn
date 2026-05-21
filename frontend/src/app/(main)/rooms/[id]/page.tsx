'use client';
import NeighborhoodWidget from '@/components/analytics/neighborhood-widget';
import ReviewForm from '@/components/review/review-form';
import AmenityIcon from '@/components/room/amenity-icon';
import DetailImageGallery from '@/components/room/detail-image-gallery';
import FeaturedSidebarList from '@/components/room/featured-sidebar-list';
import { PriceTag } from '@/components/room/price-tag';
import RelatedRoomCard from '@/components/room/related-room-card';
import { StarRating } from '@/components/room/star-rating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getReviews, checkReviewEligibility } from '@/lib/api/review.api';
import { getRoomById, getRooms } from '@/lib/api/room.api';
import api from '@/lib/axios';
import { formatRelativeTime } from '@/lib/time-format';
import { getSavedRoomStatus, saveRoom, unsaveRoom } from '@/lib/api/user.api';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Heart, MapPin, MessageCircle, Flag, BadgeCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import ReportDialog from '@/components/room/report-dialog';

const RoomMap = dynamic(() => import('@/components/room/room-map'), {
	ssr: false,
	loading: () => <Skeleton className='h-[300px] w-full rounded-xl mt-4' />,
});

const inferDistrict = (address?: string) => {
	if (!address) return '';
	const chunks = address
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
	if (chunks.length < 2) return '';
	return chunks[chunks.length - 2];
};

const RoomDetailPage = () => {
	const { id } = useParams();
	const { user } = useAuthStore();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [phoneRevealed, setPhoneRevealed] = useState(false);
	const [showReportDialog, setShowReportDialog] = useState(false);

	const { data: room, isLoading } = useQuery({
		queryKey: ['room', id],
		queryFn: () => getRoomById(id as string),
	});

	const { data: reviewData } = useQuery({
		queryKey: ['reviews', id],
		queryFn: () => getReviews(id as string),
		enabled: !!id,
	});



	const { data: reviewEligibility } = useQuery({
		queryKey: ['review-eligibility', id, user?.id],
		queryFn: () => checkReviewEligibility(id as string),
		enabled: Boolean(id) && Boolean(user) && user?.id !== room?.owner?.id,
	});
	const { data: savedRoomStatus } = useQuery({
		queryKey: ['saved-room-status', id, user?.id],
		queryFn: () => getSavedRoomStatus(id as string),
		enabled: Boolean(id) && Boolean(user),
	});

	const district = inferDistrict(room?.address);
	const { data: featuredRoomsData } = useQuery({
		queryKey: ['room-detail-featured', id],
		queryFn: () => getRooms({ sortBy: 'rating', page: 1, limit: 10 }),
		enabled: Boolean(room?.id),
	});

	const { data: sameAreaRoomsData } = useQuery({
		queryKey: ['room-detail-same-area', id, district],
		queryFn: () =>
			getRooms({
				selectedDistrict: district || undefined,
				sortBy: 'newest',
				page: 1,
				limit: 10,
			}),
		enabled: Boolean(room?.id),
	});

	const { data: latestRoomsData } = useQuery({
		queryKey: ['room-detail-latest', id],
		queryFn: () => getRooms({ sortBy: 'newest', page: 1, limit: 10 }),
		enabled: Boolean(room?.id),
	});
	const shouldGeocode = Boolean(room?.address);
	const {
		data: geocodeResult,
		isLoading: isGeocoding,
		isError: geocodeError,
	} = useQuery({
		queryKey: ['room-detail-geocode', room?.id, room?.address],
		queryFn: async () => {
			const res = await api.get<{ lat: number; lng: number }>(
				'/analytics/geocode',
				{
					params: { address: room?.address },
				},
			);
			return res.data;
		},
		enabled: shouldGeocode,
	});

	const { mutate: toggleSavedRoom, isPending: isSaving } = useMutation({
		mutationFn: (saved: boolean) =>
			saved ? unsaveRoom(id as string) : saveRoom(id as string),
		onSuccess: (_, saved) => {
			queryClient.invalidateQueries({
				queryKey: ['saved-room-status', id, user?.id],
			});
			queryClient.invalidateQueries({ queryKey: ['saved-rooms'] });
			toast.success(saved ? 'Đã bỏ lưu phòng' : 'Đã lưu phòng thành công');
		},
		onError: () => {
			toast.error('Không thể cập nhật phòng đã lưu, vui lòng thử lại');
		},
	});

	if (isLoading) {
		return (
			<div className='container mx-auto px-4 py-8 max-w-5xl'>
				<Skeleton className='h-96 w-full rounded-xl mb-6' />
				<div className='grid grid-cols-3 gap-6'>
					<div className='col-span-2 gap-6'>
						<Skeleton className='h-8 w-3/4' />
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-full' />
					</div>
					<Skeleton className='h-64 rounded-xl' />
				</div>
			</div>
		);
	}

	if (!room) return null;

	const reviews = reviewData?.data || [];
	const saved = Boolean(savedRoomStatus?.saved);
	const scores = reviewData?.avgScores || {
		cleanRating: 0,
		securityRating: 0,
		locationRating: 0,
		landlordRating: 0,
		rating: 0,
	};
	const featuredRooms =
		featuredRoomsData?.data
			?.filter((item) => item.id !== room.id)
			.slice(0, 4) || [];
	const sameAreaRooms =
		sameAreaRoomsData?.data
			?.filter((item) => item.id !== room.id)
			.slice(0, 4) || [];
	const latestRooms =
		latestRoomsData?.data?.filter((item) => item.id !== room.id).slice(0, 4) ||
		[];
	const mapLat = room?.lat ?? geocodeResult?.lat;
	const mapLng = room?.lng ?? geocodeResult?.lng;
	const hasMapCoordinates = Number.isFinite(mapLat) && Number.isFinite(mapLng);

	return (
		<div className='bg-background min-h-screen'>
			<div className='max-w-7xl mx-auto px-4 py-6 md:py-10 text-pretty'>
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
					{/* Main Content */}
					<div className='lg:col-span-2 space-y-8'>
						<DetailImageGallery
							title={room.title}
							images={room.images.map((image) => ({
								id: image.id,
								url: image.url,
							}))}
						/>

						{/* Title & Stats */}
						<div className='space-y-4'>
							<h1 className='text-2xl md:text-3xl font-bold tracking-tight'>
								{room.title}
							</h1>
							<div className='flex flex-wrap items-center gap-y-2 gap-4 text-sm text-muted-foreground'>
								<div className='flex items-center gap-1.5'>
									<MapPin className='w-4 h-4 text-primary' />
									<span>{room.address}</span>
								</div>
								<button className='text-primary font-medium hover:underline transition-all'>
									Xem bản đồ
								</button>
								<div className='flex items-center gap-4 ml-auto'>
									<span className='flex items-center gap-1'>
										<Eye className='w-4 h-4' /> {room.viewCount} lượt xem
									</span>
									<span>{formatRelativeTime(room.createdAt)}</span>
								</div>
							</div>

							<div className='flex flex-wrap items-center gap-6 p-4 bg-secondary/20 rounded-xl border border-border/50'>
								<div className='space-y-1'>
									<p className='text-xs text-muted-foreground uppercase font-semibold'>
										Diện tích
									</p>
									<p className='font-medium'>{room.area} m²</p>
								</div>
								<Separator orientation='vertical' className='h-8' />
								<div className='space-y-1'>
									<p className='text-xs text-muted-foreground uppercase font-semibold'>
										Tầng
									</p>
									<p className='font-medium'>{room.floor || '--'}</p>
								</div>
								<Separator orientation='vertical' className='h-8' />
								<div className='space-y-1'>
									<p className='text-xs text-muted-foreground uppercase font-semibold'>
										Đánh giá
									</p>
									<div className='flex items-center gap-1'>
										<StarRating
											rating={room.avgRating}
											totalReviews={room.reviewCount}
										/>
									</div>
								</div>
							</div>
						</div>

						{/* Price Component */}
						<div className='p-6 bg-primary/5 rounded-2xl border border-primary/10'>
							<div className='flex items-baseline gap-2'>
								<PriceTag amount={room.price} size='lg' />
							</div>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 py-4 border-t border-primary/10'>
								<div className='flex items-center gap-2'>
									<div className='w-2 h-2 rounded-full bg-yellow-500' />
									<p className='text-sm'>
										Điện:{' '}
										<span className='font-semibold'>
											{Number(room.electricityCost).toLocaleString('vi-VN')}đ
										</span>
										/kWh
									</p>
								</div>
								<div className='flex items-center gap-2'>
									<div className='w-2 h-2 rounded-full bg-blue-500' />
									<p className='text-sm'>
										Nước:{' '}
										<span className='font-semibold'>
											{Number(room.waterCost).toLocaleString('vi-VN')}đ
										</span>
										/tháng
									</p>
								</div>
							</div>
						</div>

						<Separator />

						{/* Regulations */}
						<div className='space-y-4'>
							<h2 className='text-xl font-bold'>Quy định & Hợp đồng</h2>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								<div className='p-4 bg-secondary/10 rounded-xl border'>
									<p className='text-sm text-muted-foreground mb-1'>
										Tiền đặt cọc
									</p>
									<div className='font-bold text-primary'>
										<PriceTag amount={room.price} size='lg' />
									</div>
								</div>
								<div className='p-4 bg-secondary/10 rounded-xl border'>
									<p className='text-sm text-muted-foreground mb-1'>
										Thời gian ở tối thiểu
									</p>
									<p className='text-lg font-bold'>{room.minStay}</p>
								</div>
							</div>
						</div>

						<Separator />

						{/* Amenities */}
						{room.amenities && room.amenities.length > 0 && (
							<div className='space-y-6'>
								<h2 className='text-xl font-bold'>Tiện nghi phòng</h2>
								<div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
									{room.amenities.map(({ amenity }) => (
										<div
											key={amenity.id}
											className='flex flex-col items-center p-4 rounded-xl border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-center gap-3'>
											<AmenityIcon icon={amenity.icon} size='md' />
											<span className='text-sm font-medium'>
												{amenity.name}
											</span>
										</div>
									))}
								</div>
							</div>
						)}

						<Separator />

						{/* Description */}
						<div className='space-y-4'>
							<h2 className='text-xl font-bold'>Mô tả chi tiết</h2>
							<div className='prose prose-sm max-w-none text-foreground'>
								<p className='whitespace-pre-line leading-relaxed'>
									{room.description}
								</p>
							</div>
						</div>

						<Separator />

						<div className='space-y-4'>
							<h2 className='text-xl font-bold'>Bản đồ vị trí</h2>
							<RoomMap address={room.address} lat={room.lat} lng={room.lng} />
						</div>

						{isGeocoding ?
							<Skeleton className='h-36 w-full rounded-xl' />
						: hasMapCoordinates ?
							<NeighborhoodWidget
								lat={mapLat as number}
								lng={mapLng as number}
							/>
						: geocodeError ?
							<p className='text-xs text-muted-foreground p-3 rounded-lg border border-dashed'>
								Không phân tích được khu vực từ địa chỉ này.
							</p>
						:	null}

						<Separator />

						{/* Reviews Section */}
						<div className='space-y-8 py-4'>
							<div className='flex flex-col md:flex-row md:items-center gap-8'>
								<div className='flex flex-col items-center justify-center p-6 bg-primary/5 rounded-2xl border border-primary/10 w-full md:w-48'>
									<span className='text-5xl font-black text-primary'>
										{Number(room.avgRating).toFixed(1)}
									</span>
									<StarRating rating={room.avgRating} size='md' />
									<p className='text-xs text-muted-foreground mt-2 font-medium'>
										{reviewData?.meta?.total || 0} ĐÁNH GIÁ
									</p>
								</div>
								<div className='flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3'>
									{Object.entries(scores).map(([key, value]) => (
										<div key={key} className='space-y-1.5'>
											<div className='flex justify-between text-xs font-semibold uppercase text-muted-foreground'>
												<span>
													{key === 'cleanRating' && 'Sạch sẽ'}
													{key === 'securityRating' && 'An ninh'}
													{key === 'locationRating' && 'Vị trí'}
													{key === 'landlordRating' && 'Chủ nhà'}
													{key === 'rating' && 'Tổng quan'}
												</span>
												<span>{Number(value).toFixed(1)}</span>
											</div>
											<div className='h-2 bg-secondary rounded-full overflow-hidden'>
												<div
													className='h-full bg-primary rounded-full transition-all duration-1000'
													style={{
														width: `${((value as number) / 5) * 100}%`,
													}}
												/>
											</div>
										</div>
									))}
								</div>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								{reviews.map((review) => (
									<div
										key={review.id}
										className='p-5 rounded-2xl border bg-card hover:shadow-md transition-shadow flex flex-col gap-4'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-3'>
												<Avatar className='border-2 border-primary/10'>
													<AvatarImage
														src={review.reviewer.avatarUrl}
														alt={review.reviewer.fullName}
													/>
													<AvatarFallback>
														{review.reviewer.fullName?.charAt(0)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className='font-bold text-sm'>
														{review.reviewer.fullName}
													</p>
													<p className='text-[10px] text-muted-foreground uppercase tracking-widest'>
														{new Date(review.createdAt).toLocaleDateString(
															'vi-VN',
														)}
													</p>
												</div>
											</div>
											<div className='flex items-center gap-2'>
												{review.rentalVerified && (
													<Badge variant='secondary' className='text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1'>
														<ShieldCheck className='w-3 h-3' />
														Đã thuê
													</Badge>
												)}
												<div className='px-2 py-1 bg-primary/10 rounded-lg'>
												<StarRating rating={review.rating} size='sm' />
											</div>
											</div>
										</div>
										<p className='text-sm text-foreground/80 italic line-clamp-3'>
											&quot;{review.comment}&quot;
										</p>
										{review.sentiment && (
											<Badge
												variant='secondary'
												className={`w-fit text-[10px] font-bold ${
													review.sentiment === 'positive' ?
														'bg-green-100 text-green-700 hover:bg-green-100'
													: review.sentiment === 'negative' ?
														'bg-red-100 text-red-700 hover:bg-red-100'
													:	'bg-gray-100 text-gray-700 hover:bg-gray-100'
												}`}>
												{review.sentiment === 'positive' ?
													'TÍCH CỰC'
												: review.sentiment === 'negative' ?
													'TIÊU CỰC'
												:	'TRUNG LẬP'}
											</Badge>
										)}
									</div>
								))}
							</div>

							{/* Review Form */}
							{user && user.id !== room.owner.id && (
								<div className='pt-6 border-t'>
									<h3 className='text-lg font-bold mb-4'>Viết đánh giá</h3>
									{reviewEligibility?.eligible === false ? (
										<div className='flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl'>
											<AlertCircle className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />
											<div>
												<p className='text-sm font-medium text-amber-800'>Không thể đánh giá</p>
												<p className='text-xs text-amber-600 mt-1'>{reviewEligibility.reason}</p>
											</div>
										</div>
									) : (
										<ReviewForm roomId={room.id} />
									)}
								</div>
							)}
						</div>


						{sameAreaRooms.length > 0 && (
							<section className='space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5'>
								<div className='flex items-center justify-between'>
									<h2 className='text-xl font-bold'>Tin đăng cùng khu vực</h2>
									<span className='text-sm text-muted-foreground'>
										{district}
									</span>
								</div>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
									{sameAreaRooms.map((relatedRoom) => (
										<RelatedRoomCard key={relatedRoom.id} room={relatedRoom} />
									))}
								</div>
							</section>
						)}

						{latestRooms.length > 0 && (
							<section className='space-y-4 rounded-2xl border border-border bg-card p-4 md:p-5'>
								<h2 className='text-xl font-bold'>Tin đăng mới cập nhật</h2>
								<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
									{latestRooms.map((latestRoom) => (
										<RelatedRoomCard key={latestRoom.id} room={latestRoom} />
									))}
								</div>
							</section>
						)}
					</div>

					{/* Sidebar */}
					<div className='lg:col-span-1'>
						<aside className='sticky top-24 space-y-6'>
							{/* Landlord Card */}
							<div className='bg-card border border-border rounded-3xl p-8'>
								<div className='flex flex-col items-center text-center space-y-4 mb-8'>
									<div className='relative'>
										<Avatar className='w-24 h-24 border-4 border-white shadow-xl'>
											<AvatarImage src={room.owner.avatarUrl} />
											<AvatarFallback className='bg-linear-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold'>
												{room.owner.fullName?.charAt(0)}
											</AvatarFallback>
										</Avatar>
										<div className='absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full' />
									</div>
									<div>
										<h3 className='text-xl font-bold'>{room.owner.fullName}</h3>
										{room.owner.isVerified && (
											<div className='flex items-center gap-1.5 mt-1'>
												<BadgeCheck className='w-4 h-4 text-green-500' />
												<span className='text-sm font-semibold text-green-600'>Môi giới xác thực</span>
											</div>
										)}
										<p className='text-xs text-muted-foreground'>
											Thành viên từ{' '}
											{new Date(room.owner.createdAt).toLocaleDateString()}
										</p>
									</div>
								</div>

								<div className='space-y-2'>
									<div className='group relative overflow-hidden p-px rounded-lg border border-primary'>
										<div className='bg-white rounded-lg p-3 text-center '>
											{phoneRevealed ?
												<p className='text-xl font-bold text-primary tracking-tighter'>
													{room.owner.phone}
												</p>
											:	<button
													onClick={() => setPhoneRevealed(true)}
													className='w-full text-sm font-bold text-primary'>
													HIỆN SỐ ĐIỆN THOẠI
												</button>
											}
										</div>
									</div>

									<Link href={`/chat?roomId=${room.id}`} className='block'>
										<Button
											variant='default'
											className='w-full h-12 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all'>
											<MessageCircle className='w-4 h-4 mr-2' />
											NHẮN TIN NGAY
										</Button>
									</Link>

									<div className='pt-4 items-center justify-center flex gap-3'>
										<Button
											variant='ghost'
											className={`rounded-xl text-xs font-bold border transition-colors ${saved ? 'border-red-200 bg-red-50 text-red-600' : 'hover:bg-secondary'}`}
											disabled={isSaving}
											onClick={() => {
												if (!user) {
													toast.error('Vui lòng đăng nhập để lưu phòng');
													router.push('/login');
													return;
												}
												toggleSavedRoom(saved);
											}}>
											<Heart
												className={`w-4 h-4 mr-2 ${saved ? 'fill-red-500 text-red-500 animate-pulse' : ''}`}
											/>
											{saved ? 'ĐÃ LƯU' : 'LƯU PHÒNG'}
										</Button>
										{user && user.id !== room.owner.id && user.role !== 'ADMIN' && (
										<Button
											variant='ghost'
											className='rounded-xl text-xs font-bold border hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors'
											onClick={() => setShowReportDialog(true)}>
											<Flag className='w-4 h-4 mr-2' />
											BÁO XẤU
										</Button>
										)}
									</div>
								</div>
							</div>
							<FeaturedSidebarList rooms={featuredRooms} />
						</aside>
					</div>
				</div>
			</div>
			{showReportDialog && (
				<ReportDialog roomId={room.id} onClose={() => setShowReportDialog(false)} />
			)}
		</div>
	);
};

export default RoomDetailPage;
