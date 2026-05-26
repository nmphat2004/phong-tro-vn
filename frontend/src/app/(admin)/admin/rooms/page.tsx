'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getAdminRooms,
	changeRoomStatus,
	removeRoom,
} from '@/lib/api/admin.api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
	Eye,
	Pencil,
	Trash2,
	AlertTriangle,
	ShieldCheck,
	ShieldAlert,
	Info,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Fraud score badge component with hover tooltip
function FraudBadge({ fraud }: { fraud: any }) {
	if (!fraud) {
		return (
			<span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground'>
				<Info className='w-3 h-3' />
				N/A
			</span>
		);
	}

	const score = fraud.score ?? 0;
	const reasons: string[] = fraud.reasons || [];

	let bgClass = '';
	let textClass = '';
	let label = '';
	let Icon = ShieldCheck;

	if (score >= 80) {
		bgClass = 'bg-red-500/15';
		textClass = 'text-red-600';
		label = 'Nguy cơ cao';
		Icon = ShieldAlert;
	} else if (score >= 60) {
		bgClass = 'bg-orange-500/15';
		textClass = 'text-orange-600';
		label = 'Nghi ngờ';
		Icon = AlertTriangle;
	} else {
		bgClass = 'bg-green-500/15';
		textClass = 'text-green-600';
		label = 'An toàn';
		Icon = ShieldCheck;
	}

	return (
		<div className='relative group'>
			<span
				className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bgClass} ${textClass} cursor-default`}>
				<Icon className='w-3.5 h-3.5' />
				{label}
				<span className='ml-0.5 opacity-70'>({score})</span>
			</span>

			{/* Hover tooltip with reasons */}
			{reasons.length > 0 && (
				<div className='absolute z-50 left-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none'>
					<p className={`text-xs font-bold mb-2 ${textClass}`}>
						Phân tích AI - Điểm: {score}/100
					</p>
					{/* Progress bar */}
					<div className='h-2 bg-secondary rounded-full overflow-hidden mb-3'>
						<div
							className={`h-full rounded-full transition-all ${
								score >= 80 ? 'bg-red-500'
								: score >= 60 ? 'bg-orange-500'
								: 'bg-green-500'
							}`}
							style={{ width: `${score}%` }}
						/>
					</div>
					<ul className='space-y-1.5'>
						{reasons.map((reason: string, i: number) => (
							<li
								key={i}
								className='flex items-start gap-2 text-[11px] text-muted-foreground'>
								<AlertTriangle className='w-3 h-3 shrink-0 mt-0.5 text-orange-500' />
								<span>{reason}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

export default function AdminRoomsPage() {
	const queryClient = useQueryClient();
	const [statusFilter, setStatusFilter] = useState('all');

	const { data: response, isLoading } = useQuery({
		queryKey: ['admin-rooms'],
		queryFn: () => getAdminRooms(1, 50),
	});

	const { mutate: handleStatusChange } = useMutation({
		mutationFn: ({
			id,
			status,
		}: {
			id: string;
			status: 'AVAILABLE' | 'HIDDEN';
		}) => changeRoomStatus(id, status),
		onSuccess: () => {
			toast.success('Cập nhật trạng thái phòng thành công');
			queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
		},
	});

	const { mutate: handleDelete } = useMutation({
		mutationFn: removeRoom,
		onSuccess: () => {
			toast.success('Đã xóa phòng khỏi hệ thống');
			queryClient.invalidateQueries({ queryKey: ['admin-rooms'] });
		},
	});

	const rooms = response?.data || [];
	const filteredRooms =
		statusFilter === 'all' ? rooms : (
			rooms.filter((room: any) => {
				if (statusFilter === 'flagged') return room.fraudResult?.isSuspicious;
				return room.status === statusFilter;
			})
		);

	// Count flagged rooms for the badge in filter
	const flaggedCount = rooms.filter(
		(room: any) => room.fraudResult?.isSuspicious,
	).length;

	return (
		<div>
			{/* Header */}
			<div className='flex items-center justify-between mb-8'>
				<h1 className='text-3xl font-bold text-foreground'>Quản lý tin đăng</h1>
				<div className='flex items-center gap-3'>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className='px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500'>
						<option value='all'>Tất cả ({rooms.length})</option>
						<option value='AVAILABLE'>Đang hoạt động</option>
						<option value='HIDDEN'>Đã ẩn</option>
						<option value='flagged'>Bị gắn cờ ({flaggedCount})</option>
					</select>
				</div>
			</div>

			{/* Table */}
			<div className='bg-card rounded-2xl border border-border overflow-hidden'>
				{isLoading ?
					<div className='p-6 space-y-4'>
						{[...Array(5)].map((_, i) => (
							<Skeleton key={i} className='w-full h-16' />
						))}
					</div>
				:	<table className='w-full'>
						<thead>
							<tr className='border-b border-border'>
								<th className='w-12 px-6 py-4'>
									<input type='checkbox' className='rounded border-gray-300' />
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Ảnh
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Tiêu đề
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Chủ trọ
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Giá
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Trạng thái
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Phân tích AI
								</th>
								<th className='text-left px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Lượt xem
								</th>
								<th className='text-center px-4 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
									Hành động
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredRooms.map((room: any) => {
								const fraud = room.fraudResult;
								return (
									<tr
										key={room.id}
										className={`border-b border-border hover:bg-secondary/50 transition-colors ${
											fraud?.score >= 80 ? 'bg-red-500/5'
											: fraud?.score >= 60 ? 'bg-orange-500/5'
											: ''
										}`}>
										<td className='px-6 py-4'>
											<input
												type='checkbox'
												className='rounded border-gray-300'
											/>
										</td>
										<td className='px-4 py-4'>
											<div className='w-16 h-12 bg-secondary rounded-lg overflow-hidden'>
												{room.images?.[0]?.url ?
													<Image
														src={room.images[0].url}
														width={200}
														height={200}
														alt=''
														className='w-full h-full object-cover'
													/>
												:	<div className='w-full h-full flex items-center justify-center text-muted-foreground text-xs'>
														No img
													</div>
												}
											</div>
										</td>
										<td className='px-4 py-4'>
											<Link
												href={`/rooms/${room.id}`}
												target='_blank'
												rel='noopener noreferrer'
												className='text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors line-clamp-1'>
												{room.title}
											</Link>
										</td>
										<td className='px-4 py-4'>
											<span className='text-sm text-muted-foreground'>
												{room.owner?.fullName}
											</span>
										</td>
										<td className='px-4 py-4'>
											<span className='text-sm font-semibold text-blue-600'>
												{formatCurrency(Number(room.price))}
											</span>
										</td>
										<td className='px-4 py-4'>
											<span
												className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
													${room.status === 'AVAILABLE' ? 'bg-green-500/15 text-green-600' : 'bg-secondary text-muted-foreground'}`}>
												{room.status === 'AVAILABLE' ? 'Active' : 'Hidden'}
											</span>
										</td>
										<td className='px-4 py-4'>
											<FraudBadge fraud={fraud} />
										</td>
										<td className='px-4 py-4'>
											<span className='text-sm font-medium text-muted-foreground'>
												{room.viewCount}
											</span>
										</td>
										<td className='px-4 py-4'>
											<div className='flex items-center justify-center gap-1'>
												<button
													onClick={() =>
														handleStatusChange({
															id: room.id,
															status:
																room.status === 'AVAILABLE' ?
																	'HIDDEN'
																:	'AVAILABLE',
														})
													}
													title={room.status === 'AVAILABLE' ? 'Ẩn' : 'Hiện'}
													className='p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors'>
													<Eye className='w-4 h-4' />
												</button>
												<button
													title='Chỉnh sửa'
													className='p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors'>
													<Pencil className='w-4 h-4' />
												</button>
												<button
													onClick={() => {
														if (
															confirm('Bạn có chắc chắn muốn xóa tin đăng này?')
														) {
															handleDelete(room.id);
														}
													}}
													title='Xóa'
													className='p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors'>
													<Trash2 className='w-4 h-4' />
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				}
			</div>
		</div>
	);
}
