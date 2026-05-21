'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminReviews, changeReviewStatus, removeReview, analyzeReviewFraud } from '@/lib/api/admin.api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Star, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const TABS = [
	{ key: 'all', label: 'All Reviews' },
	{ key: 'flagged', label: 'Flagged' },
	{ key: 'verified', label: 'Verified' },
	{ key: 'pending', label: 'Pending' },
];

export default function AdminReviewsPage() {
	const queryClient = useQueryClient();
	const [activeTab, setActiveTab] = useState('all');
	const [fraudScores, setFraudScores] = useState<Record<string, any>>({});

	const { data: response, isLoading } = useQuery({
		queryKey: ['admin-reviews'],
		queryFn: () => getAdminReviews(1, 100),
	});

	const { mutate: handleStatusChange } = useMutation({
		mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) => changeReviewStatus(id, isVerified),
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

	// Auto-scan all reviews for fraud scores
	useEffect(() => {
		if (response?.data) {
			response.data.forEach(async (review: any) => {
				if (!fraudScores[review.id]) {
					try {
						const result = await analyzeReviewFraud(review.id);
						setFraudScores((prev) => ({ ...prev, [review.id]: result }));
					} catch {
						// silent fail
					}
				}
			});
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [response?.data]);

	const reviews = response?.data || [];
	const filteredReviews = reviews.filter((review: any) => {
		if (activeTab === 'all') return true;
		if (activeTab === 'flagged') return !review.isVerified && (fraudScores[review.id]?.isSuspicious);
		if (activeTab === 'verified') return review.isVerified;
		if (activeTab === 'pending') return !review.isVerified;
		return true;
	});

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
			<h1 className='text-3xl font-bold text-foreground mb-8'>Reviews Management</h1>

			{/* Tabs */}
			<div className='border-b border-border mb-8'>
				<div className='flex gap-0'>
					{TABS.map((tab) => (
						<button
							key={tab.key}
							onClick={() => setActiveTab(tab.key)}
							className={`px-6 py-3 text-sm font-semibold transition-colors relative
								${activeTab === tab.key
									? 'text-blue-600'
									: 'text-muted-foreground hover:text-foreground'
								}`}>
							{tab.label}
							{activeTab === tab.key && (
								<div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full' />
							)}
						</button>
					))}
				</div>
			</div>

			{/* Reviews List */}
			<div className='bg-card rounded-2xl border border-border overflow-hidden'>
				{isLoading ? (
					<div className='p-6 space-y-4'>
						{[...Array(3)].map((_, i) => (
							<Skeleton key={i} className='w-full h-24' />
						))}
					</div>
				) : filteredReviews.length === 0 ? (
					<div className='py-16 text-center text-muted-foreground text-sm'>
						Không có đánh giá nào trong danh mục này
					</div>
				) : (
					<div className='divide-y divide-border'>
						{filteredReviews.map((review: any) => {
							const fraud = fraudScores[review.id];
							const isSuspicious = fraud?.isSuspicious;
							const scoreLabel = fraud ? (fraud.score >= 60 ? 'Suspicious' : 'Clean') : null;
							const scoreColor = fraud ? (fraud.score >= 60 ? 'text-red-500' : 'text-green-500') : '';
							const initial = review.reviewer?.fullName?.charAt(0)?.toUpperCase() || '?';
							const bgColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
							const bgColor = bgColors[initial.charCodeAt(0) % bgColors.length];

							return (
								<div key={review.id} className='p-6 flex items-start gap-4 hover:bg-secondary/50 transition-colors'>
									{/* Avatar */}
									<div className={`w-10 h-10 rounded-full ${bgColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
										{initial}
									</div>

									{/* Content */}
									<div className='flex-1 min-w-0'>
										<div className='flex items-center gap-3 mb-1'>
											<span className='font-semibold text-foreground text-sm'>{review.reviewer?.fullName}</span>
											{renderStars(review.rating)}
										</div>
										<p className='text-sm text-muted-foreground mb-2 line-clamp-2'>
											{review.comment || 'Không có nhận xét'}
										</p>
										<p className='text-xs text-muted-foreground'>
											on {review.room?.title || 'Phòng đã xóa'} • {new Date(review.createdAt).toLocaleDateString('vi-VN')}
										</p>
									</div>

									{/* Fraud Score + Actions */}
									<div className='flex items-center gap-4 shrink-0'>
										{fraud && (
											<div className='text-right'>
												<p className={`text-sm font-bold ${scoreColor}`}>
													Score: {fraud.score} – {scoreLabel}
												</p>
											</div>
										)}
										<div className='flex gap-2'>
											<button
												onClick={() => handleStatusChange({ id: review.id, isVerified: !review.isVerified })}
												className='px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5'>
												<Check className='w-3.5 h-3.5' />
												Approve
											</button>
											<button
												onClick={() => {
													if (confirm('Xóa vĩnh viễn đánh giá này?')) {
														handleDelete(review.id);
													}
												}}
												className='px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5'>
												<X className='w-3.5 h-3.5' />
												Delete
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
