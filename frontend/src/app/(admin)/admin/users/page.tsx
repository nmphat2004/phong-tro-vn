'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getAdminUsers,
	toggleUserBan,
	toggleUserVerification,
} from '@/lib/api/admin.api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import { BadgeCheck, ShieldX } from 'lucide-react';
import { useState } from 'react';

const ITEMS_PER_PAGE = 10;

export default function AdminUsersPage() {
	const queryClient = useQueryClient();
	const [page, setPage] = useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ['admin-users', page],
		queryFn: () => getAdminUsers(page, ITEMS_PER_PAGE),
	});

	const { mutate: handleToggleBan } = useMutation({
		mutationFn: toggleUserBan,
		onSuccess: () => {
			toast.success('Cập nhật trạng thái người dùng thành công');
			queryClient.invalidateQueries({ queryKey: ['admin-users'] });
		},
		onError: () => {
			toast.error('Lỗi khi cập nhật trạng thái');
		},
	});

	const { mutate: handleToggleVerify } = useMutation({
		mutationFn: toggleUserVerification,
		onSuccess: () => {
			toast.success('Cập nhật trạng thái xác thực thành công');
			queryClient.invalidateQueries({ queryKey: ['admin-users'] });
		},
		onError: () => {
			toast.error('Lỗi khi cập nhật trạng thái xác thực');
		},
	});

	const users = response?.data || [];
	const meta = response?.meta;

	return (
		<div>
			<h1 className='text-2xl sm:text-3xl font-bold text-foreground mb-8'>
				Quản lý người dùng
			</h1>
			<div className='bg-card rounded-2xl border border-border overflow-hidden'>
				{isLoading ?
					<div className='p-6 space-y-4'>
						<Skeleton className='w-full h-12' />
						<Skeleton className='w-full h-12' />
						<Skeleton className='w-full h-12' />
					</div>
				:	<>
						<div className='overflow-x-auto'>
							<table className='w-full'>
								<thead>
									<tr className='border-b border-border'>
										<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Họ tên
										</th>
										<th className='hidden md:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Email
										</th>
										<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Vai trò
										</th>
										<th className='hidden sm:table-cell text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Xác thực
										</th>
										<th className='text-left px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Trạng thái
										</th>
										<th className='text-center px-4 sm:px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
											Thao tác
										</th>
									</tr>
								</thead>
								<tbody>
									{users?.map((user: any) => (
										<tr
											key={user.id}
											className='border-b border-border hover:bg-secondary/50 transition-colors'>
											<td className='px-4 sm:px-6 py-4 font-medium text-sm text-foreground'>
												{user.fullName}
											</td>
											<td className='hidden md:table-cell px-6 py-4 text-sm text-muted-foreground'>
												{user.email}
											</td>
											<td className='px-4 sm:px-6 py-4'>
												<span
													className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
														user.role === 'ADMIN' ?
															'bg-purple-100 text-purple-700'
														: user.role === 'LANDLORD' ?
															'bg-blue-100 text-blue-700'
														:	'bg-green-100 text-green-700'
													}`}>
													{user.role === 'ADMIN' ?
														'ADMIN'
													: user.role === 'LANDLORD' ?
														'Chủ trọ'
													:	'Người thuê'}
												</span>
											</td>
											<td className='hidden sm:table-cell px-6 py-4'>
												{user.isVerified ?
													<span className='inline-flex items-center gap-1 text-green-600 text-sm font-medium'>
														<BadgeCheck className='w-4 h-4' />
														Đã xác thực
													</span>
												:	<span className='text-muted-foreground text-sm'>
														Chưa xác thực
													</span>
												}
											</td>
											<td className='px-4 sm:px-6 py-4'>
												{user.isDeleted ?
													<span className='inline-flex items-center gap-1 text-red-500 font-medium text-sm'>
														<ShieldX className='w-4 h-4' />
														Đã khóa
													</span>
												:	<span className='text-green-500 font-medium text-sm'>
														Hoạt động
													</span>
												}
											</td>
											<td className='px-4 sm:px-6 py-4'>
												<div className='flex gap-2 justify-center flex-wrap'>
													<Button
														variant={user.isVerified ? 'outline' : 'default'}
														size='sm'
														disabled={user.role === 'ADMIN'}
														onClick={() => handleToggleVerify(user.id)}
														className='text-xs'>
														{user.isVerified ? 'Bỏ xác thực' : '✓ Xác thực'}
													</Button>
													<Button
														variant={user.isDeleted ? 'outline' : 'destructive'}
														size='sm'
														disabled={user.role === 'ADMIN'}
														onClick={() => handleToggleBan(user.id)}>
														{user.isDeleted ? 'Mở khóa' : 'Khóa'}
													</Button>
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
