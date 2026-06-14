'use client';
import { useEffect, useState } from 'react';
import {
	ListPlus,
	MessageSquare,
	Eye,
	Star,
	Loader2,
	MoreVertical,
	Pencil,
	Trash2,
	EyeOff,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteRoom, getMyRoom, updateRoom } from '@/lib/api/room.api';
import { getConversations } from '@/lib/api/chat.api';
import { PriceTag } from '@/components/room/price-tag';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const DashboardPage = () => {
	const { user, isLoading } = useAuthStore();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [filterStatus, setFilterStatus] = useState('all');

	useEffect(() => {
		if (!isLoading && (!user || user.role !== 'LANDLORD')) {
			router.replace('/');
		}
	}, [isLoading, user, router]);

	const toggleStatusMutation = useMutation({
		mutationFn: ({ id, status }: { id: string; status: string }) =>
			updateRoom(id, { status }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dashboard-my-rooms'] });
			toast.success('Đã cập nhật trạng thái tin đăng');
		},
		onError: () => toast.error('Không thể cập nhật trạng thái'),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteRoom,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['dashboard-my-rooms'] });
			toast.success('Đã xóa tin đăng');
		},
		onError: () => toast.error('Không thể xóa tin đăng'),
	});

	const handleDelete = (id: string, title: string) => {
		if (confirm(`Bạn có chắc chắn muốn xóa tin đăng "${title}"?`)) {
			deleteMutation.mutate(id);
		}
	};

	const { data: myRooms = [], isLoading: isLoadingRooms } = useQuery({
		queryKey: ['dashboard-my-rooms'],
		queryFn: () => getMyRoom(),
		enabled: Boolean(user?.id && user.role === 'LANDLORD'),
	});

	const { data: conversations = [], isLoading: isLoadingConversations } =
		useQuery({
			queryKey: ['dashboard-conversations'],
			queryFn: getConversations,
			enabled: Boolean(user?.id && user.role === 'LANDLORD'),
		});

	if (isLoading || !user || user.role !== 'LANDLORD') {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
			</div>
		);
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'AVAILABLE':
				return <Badge>Đang hiển thị</Badge>;
			case 'RENTED':
				return <Badge variant='secondary'>Đã cho thuê</Badge>;
			case 'HIDDEN':
				return <Badge variant='default'>Đã ẩn</Badge>;
			default:
				return <Badge variant='default'>Chờ duyệt</Badge>;
		}
	};

	const filteredListings = myRooms.filter((listing) =>
		filterStatus === 'all' ? true : listing.status === filterStatus,
	);

	const totalViews = myRooms.reduce((sum, room) => sum + room.viewCount, 0);
	const totalReviews = myRooms.reduce(
		(sum, room) => sum + (room._count?.reviews || room.reviewCount || 0),
		0,
	);
	const unreadMessages = conversations.filter(
		(item) => item.messages?.[0] && item.messages[0].senderId !== user.id,
	).length;

	const stats = [
		{
			label: 'Tin đăng',
			value: myRooms.length.toString(),
			icon: ListPlus,
			color: 'text-blue-600',
		},
		{
			label: 'Tổng lượt xem',
			value: totalViews.toString(),
			icon: Eye,
			color: 'text-green-600',
		},
		{
			label: 'Tin nhắn mới',
			value: unreadMessages.toString(),
			icon: MessageSquare,
			color: 'text-orange-600',
		},
		{
			label: 'Tổng đánh giá',
			value: totalReviews.toString(),
			icon: Star,
			color: 'text-amber-600',
		},
	];

	return (
		<div className='bg-background min-h-screen'>
			<div className='max-w-7xl mx-auto px-4 py-6'>
				<div className='space-y-6'>
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
						{stats.map((stat) => (
							<div
								key={stat.label}
								className='bg-card border border-border rounded-xl p-6'>
								<div className='flex items-center justify-between mb-2'>
									<stat.icon className={`w-6 h-6 ${stat.color}`} />
									<span className='text-2xl'>{stat.value}</span>
								</div>
								<p className='text-sm text-muted-foreground'>{stat.label}</p>
							</div>
						))}
					</div>

					<div className='bg-card border border-border rounded-xl'>
						<div className='p-6 border-b border-border'>
							<div className='flex flex-wrap items-center justify-between gap-3'>
								<h2>Tin đăng của tôi</h2>
								<div className='flex gap-2'>
									<Link href='/chat'>
										<Button variant='outline'>Tin nhắn</Button>
									</Link>
									<Link href='/post'>
										<Button
											variant='default'
											className='bg-accent hover:bg-accent/90'>
											<ListPlus className='w-4 h-4 mr-2' />
											Đăng tin mới
										</Button>
									</Link>
								</div>
							</div>

							<div className='flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-none flex-nowrap shrink-0'>
								{[
									{ value: 'all', label: 'Tất cả' },
									{ value: 'AVAILABLE', label: 'Đang hiển thị' },
									{ value: 'RENTED', label: 'Đã cho thuê' },
									{ value: 'HIDDEN', label: 'Đã ẩn' },
								].map((status) => (
									<button
										key={status.value}
										onClick={() => setFilterStatus(status.value)}
										className={`px-4 py-2 rounded-lg transition-colors shrink-0 text-sm whitespace-nowrap ${
											filterStatus === status.value ?
												'bg-primary text-white'
											:	'bg-secondary text-foreground hover:bg-secondary/80'
										}`}>
										{status.label}
									</button>
								))}
							</div>
						</div>

						{isLoadingRooms || isLoadingConversations ?
							<div className='py-16 flex justify-center'>
								<Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
							</div>
						: filteredListings.length === 0 ?
							<div className='py-16 text-center text-muted-foreground'>
								Không có tin đăng phù hợp bộ lọc
							</div>
						:	<div className='divide-y'>
								{filteredListings.map((listing) => (
									<div
										key={listing.id}
										className='p-4 md:p-6 flex gap-3 sm:gap-4 items-start sm:items-center'>
										<div className='relative w-24 h-20 sm:w-28 sm:h-28 shrink-0'>
											<Image
												src={
													listing.images?.[0]?.url ||
													'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200'
												}
												alt={listing.title}
												fill
												sizes='(max-width: 640px) 96px, 112px'
												className='rounded-lg object-cover'
											/>
										</div>
										<div className='flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-between'>
											<div className='min-w-0 flex-1'>
												<Link
													href={`/rooms/${listing.id}`}
													className='hover:text-primary font-bold text-sm sm:text-base line-clamp-1 sm:line-clamp-2 text-foreground'>
													{listing.title}
												</Link>
												<div className='mt-1'>
													<PriceTag amount={listing.price} size='sm' />
												</div>
												<div className='mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground items-center'>
													<span className='line-clamp-1 max-w-[180px] sm:max-w-none'>{listing.address}</span>
													<span className='hidden sm:inline'>•</span>
													<span>{listing.viewCount} lượt xem</span>
													<span>•</span>
													<span>
														{listing._count?.reviews || listing.reviewCount || 0}{' '}
														đánh giá
													</span>
												</div>
											</div>
											<div className='flex items-center justify-between md:justify-end gap-3 mt-1 md:mt-0 pt-2 border-t border-border/10 md:border-t-0 md:pt-0 shrink-0'>
												{getStatusBadge(listing.status)}

											<DropdownMenu>
												<DropdownMenuTrigger
													className={buttonVariants({
														variant: 'ghost',
														size: 'icon',
													})}>
													<MoreVertical className='w-4 h-4' />
												</DropdownMenuTrigger>
												<DropdownMenuContent align='end' className='w-48'>
													<Link href={`/rooms/${listing.id}`}>
														<DropdownMenuItem className='cursor-pointer'>
															<Eye className='w-4 h-4 mr-2' />
															Xem tin
														</DropdownMenuItem>
													</Link>
													<Link href={`/post/${listing.id}`}>
														<DropdownMenuItem className='cursor-pointer'>
															<Pencil className='w-4 h-4 mr-2' />
															Chỉnh sửa
														</DropdownMenuItem>
													</Link>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className='cursor-pointer'
														onClick={() =>
															toggleStatusMutation.mutate({
																id: listing.id,
																status:
																	listing.status === 'AVAILABLE' ?
																		'HIDDEN'
																	:	'AVAILABLE',
															})
														}>
														{listing.status === 'AVAILABLE' ?
															<>
																<EyeOff className='w-4 h-4 mr-2' />
																Ẩn tin
															</>
														:	<>
																<Eye className='w-4 h-4 mr-2' />
																Hiện tin
															</>
														}
													</DropdownMenuItem>
													<DropdownMenuItem
														className='cursor-pointer'
														onClick={() =>
															toggleStatusMutation.mutate({
																id: listing.id,
																status: 'RENTED',
															})
														}
														disabled={listing.status === 'RENTED'}>
														<Badge
															variant='secondary'
															className='w-4 h-4 mr-2 p-0'
														/>
														Đánh dấu đã thuê
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className='text-red-500 cursor-pointer'
														onClick={() =>
															handleDelete(listing.id, listing.title)
														}>
														<Trash2 className='w-4 h-4 mr-2' />
														Xóa tin
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
								</div>
							))}
							</div>
						}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardPage;
