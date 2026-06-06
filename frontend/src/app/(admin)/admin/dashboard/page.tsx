'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getAdminStats,
	getAdminRooms,
	changeRoomStatus,
} from '@/lib/api/admin.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, Users, AlertTriangle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function AdminDashboardPage() {
	const queryClient = useQueryClient();
	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: ['admin-stats'],
		queryFn: getAdminStats,
	});

	const { data: pendingRoomsData, isLoading: roomsLoading } = useQuery({
		queryKey: ['admin-rooms-pending'],
		queryFn: () => getAdminRooms(1, 5, 'PENDING'),
	});

	const { mutate: handleStatusChange } = useMutation({
		mutationFn: ({
			id,
			status,
		}: {
			id: string;
			status: 'AVAILABLE' | 'HIDDEN' | 'PENDING' | 'RENTED';
		}) => changeRoomStatus(id, status),
		onSuccess: () => {
			toast.success('Cập nhật trạng thái phòng thành công');
			queryClient.invalidateQueries({ queryKey: ['admin-rooms-pending'] });
			queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
		},
	});

	const statCards = [
		{
			label: 'Tổng số tin đăng',
			value: stats?.totalRooms || 0,
			icon: Home,
			color: 'text-blue-500',
			bg: 'bg-blue-500/10',
			href: '/admin/rooms',
		},
		{
			label: 'Tổng số người dùng',
			value: stats?.totalUsers?.toLocaleString() || 0,
			icon: Users,
			color: 'text-indigo-500',
			bg: 'bg-indigo-500/10',
			href: '/admin/users',
		},
		{
			label: 'Báo cáo chờ duyệt',
			value: stats?.pendingReports || 0,
			icon: AlertTriangle,
			color: 'text-orange-500',
			bg: 'bg-orange-500/10',
			href: '/admin/reports',
		},
		{
			label: 'Đánh giá giả mạo',
			value: stats?.flaggedReviews || 0,
			icon: Star,
			color: 'text-amber-500',
			bg: 'bg-amber-500/10',
			href: '/admin/reviews',
		},
	];

	return (
		<div>
			<h1 className='text-2xl sm:text-3xl font-bold text-foreground mb-8'>Tổng quan</h1>

			{/* Stats Cards */}
			{statsLoading ?
				<div className='grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8'>
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} className='h-32 rounded-2xl' />
					))}
				</div>
			:	<div className='grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-8'>
					{statCards.map((card) => {
						const Icon = card.icon;
						return (
							<Link
								key={card.label}
								href={card.href}
								className='bg-card rounded-2xl border border-border p-4 sm:p-6 hover:shadow-lg transition-shadow duration-300 block'>
								<div className='flex items-center justify-between mb-3 sm:mb-4'>
									<p className='text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1'>
										{card.label}
									</p>
									<div className={`p-2 sm:p-2.5 rounded-xl ${card.bg}`}>
										<Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
									</div>
								</div>
								<p className='text-2xl sm:text-3xl font-bold text-foreground mb-1'>
									{card.value}
								</p>
							</Link>
						);
					})}
				</div>
			}

			{/* Pending Rooms */}
			<div className='bg-card rounded-2xl border border-border overflow-hidden'>
				<div className='px-4 sm:px-6 py-5 border-b border-border'>
					<h2 className='text-lg font-bold text-foreground'>Tin đăng chờ duyệt</h2>
				</div>
				{roomsLoading ?
					<div className='p-6 space-y-4'>
						{[...Array(3)].map((_, i) => (
							<Skeleton key={i} className='w-full h-14' />
						))}
					</div>
				:	<div className='overflow-x-auto'>
						<table className='w-full'>
							<thead>
								<tr className='border-b border-border'>
									<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Tin đăng
									</th>
									<th className='hidden md:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Chủ trọ
									</th>
									<th className='hidden lg:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Giá
									</th>
									<th className='hidden sm:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Điểm nghi ngờ
									</th>
									<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Trùng ảnh với
									</th>
									<th className='text-center px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
										Hành động
									</th>
								</tr>
							</thead>
							<tbody>
								{pendingRoomsData?.data?.length === 0 && (
									<tr>
										<td
											colSpan={6}
											className='text-center py-12 text-muted-foreground text-sm'>
											Không có tin đăng nào chờ duyệt
										</td>
									</tr>
								)}
								{pendingRoomsData?.data?.map((room: any) => {
									const fraud = room.fraudResult;
									const score = fraud?.score ?? 0;
									const duplicateRooms = fraud?.duplicateRooms || [];

									return (
										<tr
											key={room.id}
											className='border-b border-border hover:bg-secondary/50 transition-colors'>
											<td className='px-4 sm:px-6 py-4'>
												<div className='flex flex-col'>
													<Link
														href={`/rooms/${room.id}`}
														target='_blank'
														className='text-sm font-semibold text-blue-600 hover:underline line-clamp-1'>
														{room.title}
													</Link>
													<span className='text-xs text-muted-foreground mt-0.5 line-clamp-1'>
														{room.address}
													</span>
												</div>
											</td>
											<td className='hidden md:table-cell px-6 py-4'>
												<span className='text-sm text-muted-foreground'>
													{room.owner?.fullName || 'N/A'}
												</span>
											</td>
											<td className='hidden lg:table-cell px-6 py-4'>
												<span className='text-sm font-medium text-foreground whitespace-nowrap'>
													{formatCurrency(Number(room.price))}
												</span>
											</td>
											<td className='hidden sm:table-cell px-6 py-4'>
												<span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap
													${score >= 80 ? 'bg-red-500/15 text-red-600' : 'bg-orange-500/15 text-orange-600'}`}>
													{score}/100
												</span>
											</td>
											<td className='px-4 sm:px-6 py-4'>
												{duplicateRooms.length === 0 ? (
													<span className='text-xs text-muted-foreground'>Không trùng</span>
												) : (
													<div className='flex flex-col gap-1'>
														{duplicateRooms.map((dup: any) => (
															<Link
																key={dup.id}
																href={`/rooms/${dup.id}`}
																target='_blank'
																className='text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline line-clamp-1'>
																🔗 {dup.title}
															</Link>
														))}
													</div>
												)}
											</td>
											<td className='px-4 sm:px-6 py-4'>
												<div className='flex items-center justify-center gap-2'>
													<button
														onClick={() =>
															handleStatusChange({
																id: room.id,
																status: 'AVAILABLE',
															})
														}
														className='px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors'>
														Duyệt
													</button>
													<button
														onClick={() =>
															handleStatusChange({
																id: room.id,
																status: 'HIDDEN',
															})
														}
														className='px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors'>
														Ẩn
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				}
			</div>
		</div>
	);
}
