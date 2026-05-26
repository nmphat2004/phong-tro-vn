'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateReview } from '@/lib/api/review.api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Pencil, X, Star, Loader2 } from 'lucide-react';

interface Review {
	id: string;
	rating: number;
	cleanRating: number;
	securityRating: number;
	locationRating: number;
	landlordRating: number;
	comment?: string;
}

interface EditReviewDialogProps {
	review: Review;
	roomId: string;
	onClose: () => void;
}

const criteria = [
	{ key: 'rating', label: 'Tổng thể' },
	{ key: 'cleanRating', label: 'Vệ sinh' },
	{ key: 'securityRating', label: 'An ninh' },
	{ key: 'locationRating', label: 'Vị trí' },
	{ key: 'landlordRating', label: 'Chủ trọ' },
];

export default function EditReviewDialog({ review, roomId, onClose }: EditReviewDialogProps) {
	const queryClient = useQueryClient();
	const [ratings, setRatings] = useState<Record<string, number>>({
		rating: review.rating,
		cleanRating: review.cleanRating,
		securityRating: review.securityRating,
		locationRating: review.locationRating,
		landlordRating: review.landlordRating,
	});
	const [comment, setComment] = useState(review.comment || '');

	const { mutate: handleSubmit, isPending } = useMutation({
		mutationFn: () => updateReview(roomId, review.id, { ...ratings, comment }),
		onSuccess: () => {
			toast.success('Cập nhật đánh giá thành công!');
			queryClient.invalidateQueries({ queryKey: ['reviews', roomId] });
			queryClient.invalidateQueries({ queryKey: ['room', roomId] });
			onClose();
		},
		onError: (error: any) => {
			toast.error(error.response?.data?.message || 'Lỗi khi cập nhật đánh giá');
		},
	});

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center'>
			{/* Backdrop */}
			<div className='absolute inset-0 bg-black/50 backdrop-blur-sm' onClick={onClose} />

			{/* Dialog */}
			<div className='relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95'>
				<div className='flex items-center justify-between mb-6'>
					<div className='flex items-center gap-3'>
						<div className='w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center'>
							<Pencil className='w-5 h-5 text-primary' />
						</div>
						<div>
							<h3 className='text-lg font-bold text-foreground'>Chỉnh sửa đánh giá</h3>
							<p className='text-xs text-muted-foreground'>Cập nhật điểm số và nhận xét</p>
						</div>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-lg hover:bg-secondary transition-colors'>
						<X className='w-5 h-5 text-muted-foreground' />
					</button>
				</div>

				<div className='space-y-3 mb-4'>
					{criteria.map(({ key, label }) => (
						<div key={key} className='flex items-center justify-between'>
							<span className='text-sm text-muted-foreground w-24'>{label}</span>
							<div className='flex gap-1'>
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										type='button'
										onClick={() => setRatings((prev) => ({ ...prev, [key]: star }))}
									>
										<Star
											className={`w-6 h-6 transition-colors ${star <= ratings[key] ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-300'}`}
										/>
									</button>
								))}
							</div>
						</div>
					))}
				</div>

				<Textarea
					placeholder='Chia sẻ trải nghiệm của bạn... (tùy chọn)'
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					className='mb-4 bg-background border-border'
					rows={3}
				/>

				<div className='flex gap-3'>
					<Button variant='outline' onClick={onClose} className='flex-1'>
						Hủy
					</Button>
					<Button
						onClick={() => handleSubmit()}
						disabled={Object.values(ratings).some((r) => r === 0) || isPending}
						className='flex-1'
					>
						{isPending ? (
							<><Loader2 className='w-4 h-4 mr-2 animate-spin' /> Đang cập nhật</>
						) : (
							'Cập nhật đánh giá'
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
