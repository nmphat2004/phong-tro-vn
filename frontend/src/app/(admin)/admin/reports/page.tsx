'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getAdminReports,
	updateReportStatus,
	changeRoomStatus,
	removeRoom,
} from '@/lib/api/admin.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/time-format';
import { useState } from 'react';
import { EyeOff, Trash2, X } from 'lucide-react';
import Link from 'next/link';

const STATUS_TABS = [
	{ key: 'all', label: 'Tất cả' },
	{ key: 'pending', label: 'Đang chờ' },
	{ key: 'resolved', label: 'Đã duyệt' },
	{ key: 'dismissed', label: 'Bỏ qua' },
];

const ITEMS_PER_PAGE = 10;

export default function AdminReportsPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState('all');
	const [page, setPage] = useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ['admin-reports', page],
		queryFn: () => getAdminReports(page, ITEMS_PER_PAGE),
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
		queryClient.invalidateQueries({ queryKey: ['admin-reports-recent'] });
		queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
		queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
	};

	const { mutate: handleStatusUpdate } = useMutation({
		mutationFn: ({ id, status }: { id: string; status: string }) =>
			updateReportStatus(id, status),
		onSuccess: () => {
			toast.success('Cập nhật trạng thái báo cáo thành công');
			invalidateAll();
		},
	});

	const { mutate: handleHideRoom } = useMutation({
		mutationFn: (roomId: string) => changeRoomStatus(roomId, 'HIDDEN'),
		onSuccess: () => {
			toast.success('Đã ẩn phòng khỏi hệ thống');
			invalidateAll();
		},
	});

	const { mutate: handleDeleteRoom } = useMutation({
		mutationFn: (roomId: string) => removeRoom(roomId),
		onSuccess: () => {
			toast.success('Đã xóa phòng khỏi hệ thống');
			invalidateAll();
		},
	});

	const { mutate: handleShowRoom } = useMutation({
		mutationFn: (roomId: string) => changeRoomStatus(roomId, 'AVAILABLE'),
		onSuccess: () => {
			toast.success('Đã hiện lại phòng');
			invalidateAll();
		},
	});

	const handleResolveAndHide = (reportId: string, roomId: string) => {
		handleStatusUpdate({ id: reportId, status: 'resolved' });
		handleHideRoom(roomId);
	};

	const handleResolveAndDelete = (reportId: string, roomId: string) => {
		if (
			confirm(
				'Bạn có chắc muốn XÓA VĨNH VIỄN phòng này? Hành động không thể hoàn tác.',
			)
		) {
			handleStatusUpdate({ id: reportId, status: 'resolved' });
			handleDeleteRoom(roomId);
		}
	};

	const handleReopenAndShow = (reportId: string, roomId: string) => {
		handleStatusUpdate({ id: reportId, status: 'pending' });
		handleShowRoom(roomId);
	};

	const reports = response?.data || [];
	const meta = response?.meta;
	const filteredReports =
		activeTab === 'all' ? reports : (
			reports.filter((report: any) => report.status === activeTab)
		);

	return (
		<div>
			<h1 className='text-2xl sm:text-3xl font-bold text-foreground mb-8'>
				Quản lý báo cáo
			</h1>

			{/* Status Tabs */}
			<div className='border-b border-border mb-8 overflow-x-auto'>
				<div className='flex gap-0 min-w-max'>
					{STATUS_TABS.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors relative whitespace-nowrap
								${
									activeTab === tab.key ?
										'text-blue-600'
									:	'text-muted-foreground hover:text-foreground'
								}`}>
							{tab.label}
							{activeTab === tab.key && (
								<div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full' />
							)}
						</button>
					))}
				</div>
			</div>

			<div className='bg-card rounded-2xl border border-border overflow-hidden'>
				{isLoading ?
					<div className='p-6 space-y-4'>
						{[...Array(3)].map((_, i) => (
							<Skeleton key={i} className='w-full h-14' />
						))}
					</div>
				: filteredReports.length === 0 ?
					<div className='py-16 text-center text-muted-foreground text-sm'>
						Không có báo cáo nào trong danh mục này
					</div>
				:	<>
						<div className='overflow-x-auto'>
							<table className='w-full'>
								<thead>
									<tr className='border-b border-border'>
										<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Phòng
										</th>
										<th className='hidden md:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Người báo cáo
										</th>
										<th className='lg:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Lý do
										</th>
										<th className='hidden md:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Ngày báo cáo
										</th>
										<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Trạng thái
										</th>
										<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Hành động
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredReports.map((report: any) => (
										<tr
											key={report.id}
											className='border-b border-border hover:bg-secondary/50 transition-colors'>
											<td className='px-4 sm:px-6 py-4'>
												{report.room ?
													<Link
														href={`/rooms/${report.room.id}`}
														target='_blank'
														rel='noopener noreferrer'
														className='text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors line-clamp-1'>
														{report.room.title}
													</Link>
												:	<span className='text-sm font-medium text-muted-foreground italic'>
														Phòng đã bị xóa
													</span>
												}
											</td>
											<td className='hidden md:table-cell px-6 py-4'>
												<div>
													<span className='text-sm text-foreground'>
														{report.reporter?.fullName}
													</span>
													<p className='text-xs text-muted-foreground'>
														{report.reporter?.email}
													</p>
												</div>
											</td>
											<td className='lg:table-cell px-6 py-4'>
												<span className='text-sm text-muted-foreground line-clamp-2'>
													{report.reason}
												</span>
											</td>
											<td className='hidden md:table-cell px-6 py-4'>
												<span className='text-sm text-muted-foreground whitespace-nowrap'>
													{formatRelativeTime(report.createdAt)}
												</span>
											</td>
											<td className='px-4 sm:px-6 py-4'>
												<span
													className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap
													${
														report.status === 'pending' ?
															'bg-yellow-500/15 text-yellow-600'
														: report.status === 'resolved' ?
															'bg-green-500/15 text-green-600'
														:	'bg-secondary text-muted-foreground'
													}`}>
													{report.status === 'pending' ?
														'Đang chờ'
													: report.status === 'resolved' ?
														'Đã duyệt'
													:	'Bỏ qua'}
												</span>
											</td>
											<td className='px-4 sm:px-6 py-4'>
												<div className='flex gap-2 flex-wrap'>
													{report.status === 'pending' ?
														<>
															{/* Ẩn phòng + resolve report */}
															{report.room && (
																<button
																	onClick={() =>
																		handleResolveAndHide(
																			report.id,
																			report.room.id,
																		)
																	}
																	title='Ẩn phòng & đánh dấu đã xử lý'
																	className='px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1'>
																	<EyeOff className='w-3 h-3' />
																	<span className='hidden sm:inline'>Ẩn phòng</span>
																</button>
															)}
															{/* Xóa phòng + resolve report */}
															{report.room && (
																<button
																	onClick={() =>
																		handleResolveAndDelete(
																			report.id,
																			report.room.id,
																		)
																	}
																	title='Xóa vĩnh viễn phòng'
																	className='px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1'>
																	<Trash2 className='w-3 h-3' />
																	<span className='hidden sm:inline'>Xóa phòng</span>
																</button>
															)}
															{/* Dismiss (bỏ qua) */}
															<button
																onClick={() =>
																	handleStatusUpdate({
																		id: report.id,
																		status: 'dismissed',
																	})
																}
																title='Bỏ qua báo cáo'
																className='px-3 py-1.5 bg-card text-muted-foreground text-xs font-semibold rounded-lg border border-border hover:bg-secondary transition-colors flex items-center gap-1'>
																<X className='w-3 h-3' />
																<span className='hidden sm:inline'>Bỏ qua</span>
															</button>
														</>
													:	<button
															onClick={() => {
																if (report.room) {
																	handleReopenAndShow(report.id, report.room.id);
																} else {
																	handleStatusUpdate({
																		id: report.id,
																		status: 'pending',
																	});
																}
															}}
															className='px-3 py-1.5 bg-card text-muted-foreground text-xs font-semibold rounded-lg border border-border hover:bg-secondary transition-colors'>
															Mở lại
														</button>
													}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						{meta && (
							<Pagination
								page={meta.page}
								totalPages={meta.totalPages}
								total={meta.total}
								limit={meta.limit}
								onPageChange={setPage}
							/>
						)}
					</>
				}
			</div>
		</div>
	);
}
