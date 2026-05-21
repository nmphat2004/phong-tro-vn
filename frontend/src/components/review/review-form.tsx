/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Loader2, Star } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createReview } from '@/lib/api/review.api';

interface Props {
	roomId: string;
}

const criteria = [
	{ key: 'rating', label: 'Tổng thể' },
	{ key: 'cleanRating', label: 'Vệ sinh' },
	{ key: 'securityRating', label: 'An ninh' },
	{ key: 'locationRating', label: 'Vị trí' },
	{ key: 'landlordRating', label: 'Chủ trọ' },
];

const ReviewForm = ({ roomId }: Props) => {
	const queryClient = useQueryClient();
	const [ratings, setRatings] = useState<Record<string, number>>({
		rating: 0,
		cleanRating: 0,
		securityRating: 0,
		locationRating: 0,
		landlordRating: 0,
	});
	const [isLoading, setIsLoading] = useState(false);
	const [comment, setComment] = useState('');

	const handleSubmit = async () => {
		if (Object.values(ratings).some((r) => r === 0)) {
			toast.error('Vui lòng đánh giá tất cả tiêu chí');
			return;
		}
		setIsLoading(true);
		try {
			await createReview(roomId, { ...ratings, comment });
			toast.success('Đánh giá thành công!');
			queryClient.invalidateQueries({ queryKey: ['reviews', roomId] });
			queryClient.invalidateQueries({ queryKey: ['room', roomId] });
			setRatings({
				ratings: 0,
				cleanRating: 0,
				securityRating: 0,
				locationRating: 0,
				landlordRating: 0,
			});
			setComment('');
		} catch (error: any) {
			toast.error(error.response?.data?.message || 'Lỗi khi gửi đánh giá');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className='border rounded-xl p-5 bg-background'>
			<h3 className='font-semibold mb-4'>Viết đánh giá của bạn</h3>
			<div className='space-y-3 mb-4'>
				{criteria.map(({ key, label }) => (
					<div key={key} className='flex items-center justify-between'>
						<span className='text-sm text-muted-foreground w-24'>{label}</span>
						<div className='flex gap-1'>
							{[1, 2, 3, 4, 5].map((star) => (
								<button
									key={star}
									type='button'
									onClick={() =>
										setRatings((prev) => ({ ...prev, [key]: star }))
									}>
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
				className='mb-3 bg-card border-border'
				rows={3}
			/>
			<Button
				onClick={handleSubmit}
				type='submit'
				size='lg'
				className='w-full h-10 hover:bg-primary/90'>
				{isLoading ?
					<>
						<Loader2 className='w-4 h-4 mr-2 animate-spin' /> Đang gửi
					</>
				:	'Gửi đánh giá'}
			</Button>
		</div>
	);
};

export default ReviewForm;
