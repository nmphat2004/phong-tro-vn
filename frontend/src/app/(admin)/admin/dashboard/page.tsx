'use client';
import { useQuery } from '@tanstack/react-query';
import { getAdminStats, getAdminReports, updateReportStatus } from '@/lib/api/admin.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, Users, AlertTriangle, Star, TrendingUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/time-format';

export default function AdminDashboardPage() {
	const queryClient = useQueryClient();
	const { data: stats, isLoading: statsLoading } = useQuery({
		queryKey: ['admin-stats'],
		queryFn: getAdminStats,
	});

	const { data: reportsData, isLoading: reportsLoading } = useQuery({
		queryKey: ['admin-reports-recent'],
		queryFn: () => getAdminReports(1, 5),
	});

	const { mutate: handleReportStatus } = useMutation({
		mutationFn: ({ id, status }: { id: string; status: string }) => updateReportStatus(id, status),
		onSuccess: () => {
			toast.success('Cập nhật trạng thái báo cáo thành công');
			queryClient.invalidateQueries({ queryKey: ['admin-reports-recent'] });
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
		},
		{
			label: 'Tổng số người dùng',
			value: stats?.totalUsers?.toLocaleString() || 0,
			icon: Users,
			color: 'text-indigo-500',
			bg: 'bg-indigo-500/10',
		},
		{
			label: 'Báo cáo chờ duyệt',
			value: stats?.pendingReports || 0,
			icon: AlertTriangle,
			color: 'text-orange-500',
			bg: 'bg-orange-500/10',
		},
		{
			label: 'Đánh giá giả mạo',
			value: stats?.flaggedReviews || 0,
			icon: Star,
			color: 'text-amber-500',
			bg: 'bg-amber-500/10',
		},
	];

	return (
		<div>
			<h1 className='text-3xl font-bold text-foreground mb-8'>Overview</h1>

			{/* Stats Cards */}
			{statsLoading ? (
				<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8'>
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} className='h-32 rounded-2xl' />
					))}
				</div>
			) : (
				<div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8'>
					{statCards.map((card) => {
						const Icon = card.icon;
						return (
							<div
								key={card.label}
								className='bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow duration-300'>
								<div className='flex items-center justify-between mb-4'>
									<p className='text-sm font-medium text-muted-foreground'>{card.label}</p>
									<div className={`p-2.5 rounded-xl ${card.bg}`}>
										<Icon className={`w-5 h-5 ${card.color}`} />
									</div>
								</div>
								<p className='text-3xl font-bold text-foreground mb-1'>{card.value}</p>
							</div>
						);
					})}
				</div>
			)}

			{/* Recent Reports */}
			<div className='bg-card rounded-2xl border border-border overflow-hidden'>
				<div className='px-6 py-5 border-b border-border'>
					<h2 className='text-lg font-bold text-foreground'>Báo cáo gần đây</h2>
				</div>
				{reportsLoading ? (
					<div className='p-6 space-y-4'>
						{[...Array(3)].map((_, i) => (
							<Skeleton key={i} className='w-full h-14' />
						))}
					</div>
				) : (
					<div className='overflow-x-auto'>
						<table className='w-full'>
							<thead>
								<tr className='border-b border-border'>
									<th className='text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Phòng</th>
									<th className='text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Người báo cáo</th>
									<th className='text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Lý do</th>
									<th className='text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Ngày báo cáo</th>
									<th className='text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Trạng thái</th>
									<th className='text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>Hành động</th>
								</tr>
							</thead>
							<tbody>
								{reportsData?.data?.length === 0 && (
									<tr>
										<td colSpan={6} className='text-center py-12 text-muted-foreground text-sm'>
											Không có báo cáo nào
										</td>
									</tr>
								)}
								{reportsData?.data?.map((report: any) => (
									<tr key={report.id} className='border-b border-border hover:bg-secondary/50 transition-colors'>
										<td className='px-6 py-4'>
											<span className='text-sm font-medium text-foreground'>{report.room?.title || 'Phòng đã xóa'}</span>
										</td>
										<td className='px-6 py-4'>
											<span className='text-sm text-muted-foreground'>{report.reporter?.fullName}</span>
										</td>
										<td className='px-6 py-4'>
											<span className='text-sm text-muted-foreground'>{report.reason}</span>
										</td>
										<td className='px-6 py-4'>
											<span className='text-sm text-muted-foreground'>{formatRelativeTime(report.createdAt)}</span>
										</td>
										<td className='px-6 py-4'>
											<span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
												${report.status === 'pending' ? 'bg-yellow-500/15 text-yellow-600' :
												report.status === 'resolved' ? 'bg-green-500/15 text-green-600' :
												'bg-secondary text-muted-foreground'}`}>
												{report.status === 'pending' ? 'Pending' :
												report.status === 'resolved' ? 'Resolved' : 'Dismissed'}
											</span>
										</td>
										<td className='px-6 py-4'>
											<div className='flex gap-2'>
												{report.status === 'pending' && (
													<>
														<button
															onClick={() => handleReportStatus({ id: report.id, status: 'resolved' })}
															className='px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors'>
															Xem
														</button>
														<button
															onClick={() => handleReportStatus({ id: report.id, status: 'dismissed' })}
															className='px-3 py-1.5 bg-card text-muted-foreground text-xs font-semibold rounded-lg border border-border hover:bg-secondary transition-colors'>
															Bỏ qua
														</button>
													</>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
