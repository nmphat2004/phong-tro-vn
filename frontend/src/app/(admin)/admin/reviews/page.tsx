'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getAdminReviews,
	changeReviewStatus,
	removeReview,
} from '@/lib/api/admin.api';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { toast } from 'sonner';
import {
	Star,
	Check,
	X,
	AlertTriangle,
	ShieldCheck,
	ShieldAlert,
	Info,
} from 'lucide-react';
import { useState } from 'react';

const TABS = [
	{ key: 'all', label: 'Tất cả' },
	{ key: 'flagged', label: 'Nghi ngờ' },
	{ key: 'positive', label: 'Tích cực' },
	{ key: 'negative', label: 'Tiêu cực' },
];

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
	} else if (score >= 50) {
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
				<div className='absolute z-50 right-0 bottom-full mb-2 w-72 bg-card border border-border rounded-xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none'>
					<p className={`text-xs font-bold mb-2 ${textClass}`}>
						Phân tích - Điểm: {score}/100
					</p>
					{/* Progress bar */}
					<div className='h-2 bg-secondary rounded-full overflow-hidden mb-3'>
						<div
							className={`h-full rounded-full transition-all ${
								score >= 80 ? 'bg-red-500'
								: score >= 50 ? 'bg-orange-500'
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

const ITEMS_PER_PAGE = 10;

export default function AdminReviewsPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState('all');
	const [page, setPage] = useState(1);

	const { data: response, isLoading } = useQuery({
		queryKey: ['admin-reviews', page],
		queryFn: () => getAdminReviews(page, ITEMS_PER_PAGE),
	});

	const { mutate: handleStatusChange } = useMutation({
		mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
			changeReviewStatus(id, isVerified),
		onSuccess: () => {
			toast.success('Cập nhật trạng thái đánh giá thành công');
			queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
		},
	});

	const { mutate: handleDelete } = useMutation({
		mutationFn: removeReview,
		onSuccess: () => {
			toast.success('Đã xóa đánh giá');
			queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
		},
	});

	const reviews = response?.data || [];
	const meta = response?.meta;
	const filteredReviews = reviews.filter((review: any) => {
		if (activeTab === 'all') return true;
		if (activeTab === 'flagged')
			return !review.isVerified && review.fraudResult?.isSuspicious;
		if (activeTab === 'positive') return review.sentiment === 'positive';
		if (activeTab === 'negative') return review.sentiment === 'negative';
		return true;
	});

	const flaggedCount = reviews.filter(
		(review: any) => review.fraudResult?.isSuspicious && !review.isVerified,
	).length;

	const renderStars = (rating: number) => {
		return (
			<div className='flex gap-0.5'>
				{[1, 2, 3, 4, 5].map((i) => (
					<Star
						key={i}
						className={`w-4 h-4 ${i <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
					/>
				))}
			</div>
		);
	};

	return (
		<div>
			<div className='flex items-center justify-between mb-8'>
				<h1 className='text-2xl sm:text-3xl font-bold text-foreground'>
					Quản lý đánh giá
				</h1>
			</div>

			{/* Tabs */}
			<div className='border-b border-border mb-8'>
				<div className='flex gap-0'>
					{TABS.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`px-4 sm:px-6 py-3 text-sm font-semibold transition-colors relative
								${
									activeTab === tab.key ?
										'text-blue-600'
									:	'text-muted-foreground hover:text-foreground'
								}`}>
							<span className='flex items-center gap-2'>
								{tab.label}
								{tab.key === 'flagged' && flaggedCount > 0 && (
									<span className='px-1.5 py-0.5 text-xs font-bold rounded-full bg-orange-500 text-white animate-pulse'>
										{flaggedCount}
									</span>
								)}
							</span>
							{activeTab === tab.key && (
								<div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full' />
							)}
						</button>
					))}
				</div>
			</div>

			{/* Reviews List */}
			<div className='bg-card rounded-2xl border border-border'>
				{isLoading ?
					<div className='p-6 space-y-4'>
						{[...Array(3)].map((_, i) => (
							<Skeleton key={i} className='w-full h-24' />
						))}
					</div>
				: filteredReviews.length === 0 ?
					<div className='py-16 text-center text-muted-foreground text-sm'>
						Không có đánh giá nào trong danh mục này
					</div>
				:	<>
						<div className='divide-y divide-border'>
							{filteredReviews.map((review: any) => {
								const fraud = review.fraudResult;
								const bgClass =
									fraud?.score >= 80 ? 'bg-red-500/5 hover:bg-red-500/10'
									: fraud?.score >= 50 ?
										'bg-orange-500/5 hover:bg-orange-500/10'
									:	'hover:bg-secondary/50';

								const initial =
									review.reviewer?.fullName?.charAt(0)?.toUpperCase() || '?';
								const bgColors = [
									'bg-blue-500',
									'bg-green-500',
									'bg-purple-500',
									'bg-orange-500',
									'bg-pink-500',
								];
								const bgColor =
									bgColors[initial.charCodeAt(0) % bgColors.length];

								return (
									<div
										key={review.id}
										className={`p-4 sm:p-6 flex flex-col sm:flex-row items-start gap-4 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${bgClass}`}>
										{/* Avatar */}
										<div
											className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
											{initial}
										</div>

										{/* Content */}
										<div className='flex-1 min-w-0'>
											<div className='flex items-center gap-3 mb-1 flex-wrap'>
												<span className='font-semibold text-foreground text-sm'>
													{review.reviewer?.fullName}
												</span>
												{renderStars(review.rating)}
											</div>
											<p className='text-sm text-muted-foreground mb-2 line-clamp-2'>
												{review.comment || 'Không có nhận xét'}
											</p>
											<p className='text-xs text-muted-foreground font-medium'>
												thuộc{' '}
												<span className='font-bold text-blue-600 dark:text-blue-400'>
													{review.room?.title || 'Phòng đã xóa'}
												</span>{' '}
												•{' '}
												{new Date(review.createdAt).toLocaleDateString('vi-VN')}
											</p>
											{review.sentiment && (
												<div className='mt-2'>
													<span
														className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
															review.sentiment === 'positive' ?
																'bg-green-100 text-green-700'
															: review.sentiment === 'negative' ?
																'bg-red-100 text-red-700'
															:	'bg-gray-100 text-gray-700'
														}`}>
														{review.sentiment === 'positive' && 'Tích cực 😄'}
														{review.sentiment === 'negative' && 'Tiêu cực 😡'}
														{review.sentiment === 'neutral' && 'Trung lập 😐'}
													</span>
												</div>
											)}
										</div>

										{/* Fraud Score + Actions */}
										<div className='flex items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto flex-wrap sm:flex-nowrap'>
											<FraudBadge fraud={fraud} />
											<div className='flex gap-2'>
												<button
													onClick={() =>
														handleStatusChange({
															id: review.id,
															isVerified: !review.isVerified,
														})
													}
													className={`px-3 sm:px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
														review.isVerified ?
															'bg-amber-600 hover:bg-amber-700'
														:	'bg-green-600 hover:bg-green-700'
													}`}>
													<Check className='w-3.5 h-3.5' />
													{review.isVerified ? 'Bỏ duyệt' : 'Duyệt'}
												</button>
												<button
													onClick={() => {
														if (confirm('Xóa vĩnh viễn đánh giá này?')) {
															handleDelete(review.id);
														}
													}}
													className='px-3 sm:px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5'>
													<X className='w-3.5 h-3.5' />
													Xóa
												</button>
											</div>
										</div>
									</div>
								);
							})}
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
