'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reportRoom } from '@/lib/api/admin.api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Flag, X } from 'lucide-react';

const REPORT_REASONS = [
	'Ảnh không đúng thực tế',
	'Tin đăng lừa đảo',
	'Sai giá phòng',
	'Sai địa chỉ',
	'Tin trùng lặp / Spam',
	'Khác',
];

interface ReportDialogProps {
	roomId: string;
	onClose: () => void;
}

export default function ReportDialog({ roomId, onClose }: ReportDialogProps) {
	const [selectedReason, setSelectedReason] = useState('');
	const [customReason, setCustomReason] = useState('');

	const { mutate: handleSubmit, isPending } = useMutation({
		mutationFn: () => {
			const reason = selectedReason === 'Khác' ? customReason : selectedReason;
			return reportRoom(roomId, reason);
		},
		onSuccess: () => {
			toast.success('Báo cáo đã được gửi thành công. Cảm ơn bạn!');
			onClose();
		},
		onError: () => {
			toast.error('Không thể gửi báo cáo. Vui lòng thử lại.');
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
						<div className='w-10 h-10 bg-red-500/15 rounded-xl flex items-center justify-center'>
							<Flag className='w-5 h-5 text-red-600' />
						</div>
						<div>
							<h3 className='text-lg font-bold text-foreground'>Báo xấu phòng</h3>
							<p className='text-xs text-muted-foreground'>Chọn lý do báo cáo</p>
						</div>
					</div>
					<button onClick={onClose} className='p-1.5 rounded-lg hover:bg-secondary transition-colors'>
						<X className='w-5 h-5 text-muted-foreground' />
					</button>
				</div>

				<div className='space-y-2 mb-4'>
					{REPORT_REASONS.map((reason) => (
						<label
							key={reason}
							className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
								${selectedReason === reason
									? 'border-red-300 bg-red-500/10'
									: 'border-border hover:border-border hover:bg-secondary'
								}`}>
							<input
								type='radio'
								name='reason'
								value={reason}
								checked={selectedReason === reason}
								onChange={(e) => setSelectedReason(e.target.value)}
								className='accent-red-500'
							/>
							<span className='text-sm font-medium text-muted-foreground'>{reason}</span>
						</label>
					))}
				</div>

				{selectedReason === 'Khác' && (
					<textarea
						value={customReason}
						onChange={(e) => setCustomReason(e.target.value)}
						placeholder='Mô tả chi tiết lý do báo cáo...'
						className='w-full p-3 border border-border rounded-xl text-sm mb-4 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-card text-foreground'
					/>
				)}

				<div className='flex gap-3'>
					<Button
						variant='outline'
						onClick={onClose}
						className='flex-1'>
						Hủy
					</Button>
					<Button
						onClick={() => handleSubmit()}
						disabled={!selectedReason || (selectedReason === 'Khác' && !customReason.trim()) || isPending}
						className='flex-1 bg-red-600 hover:bg-red-700 text-white'>
						{isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
					</Button>
				</div>
			</div>
		</div>
	);
}
